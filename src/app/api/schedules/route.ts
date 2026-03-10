import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // --- Authentication ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, day_of_week, start_time, end_time, subject_id, create_subject } = body;

    if (!title || !day_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Title, day_of_week, start_time, and end_time are required" },
        { status: 400 },
      );
    }

    let finalSubjectId = subject_id || null;

    // --- Smart Flow: Create Subject on the fly ---
    if (!finalSubjectId && create_subject) {
      const { data: newSubject, error: subjectError } = await supabase
        .from("subjects")
        .insert({
          user_id: user.id,
          name: title, // use the title as the subject name
          description: "Dibuat otomatis dari Jadwal",
        })
        .select()
        .single();

      if (subjectError) {
        console.error("Failed to auto-create subject:", subjectError);
        return NextResponse.json(
          { error: "Failed to auto-create subject container" },
          { status: 500 },
        );
      }
      finalSubjectId = newSubject.id;
    }

    // --- Strict 1-to-1 Constraint Check ---
    if (finalSubjectId) {
       // Check if this subject is already used in another schedule
       const { data: existingUsage } = await supabase
         .from("schedules")
         .select("id")
         .eq("subject_id", finalSubjectId)
         .maybeSingle();

       if (existingUsage) {
          return NextResponse.json(
            { error: "Mata pelajaran ini sudah terhubung dengan jadwal lain. (1 Jadwal = 1 Matkul)" },
            { status: 400 }
          );
       }
    }

    // --- Save Schedule ---
    const { data: schedule, error: dbError } = await supabase
      .from("schedules")
      .insert({
        user_id: user.id,
        title,
        day_of_week,
        start_time,
        end_time,
        subject_id: finalSubjectId,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      
      // Handle the UNIQUE constraint violation just in case from the DB side
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "Mata pelajaran ini sudah terhubung dengan jadwal lain." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create schedule" },
        { status: 500 },
      );
    }

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    console.error("Critical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // --- Authentication ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Fetch Schedules (With Subject Data if linked) ---
    // Make sure we select all necessary columns and join subjects
    const url = new URL(request.url);
    const groupId = url.searchParams.get("groupId");
    
    let query = supabase
      .from("schedules")
      .select(`
        *,
        subjects (
          id,
          name
        )
      `);

    if (groupId) {
      query = query.eq("group_id", groupId);
    } else {
      // Default: Only fetch schedules belonging to the ACTIVE group
      const { data: activeGroup } = await supabase
        .from("schedule_groups")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (activeGroup) {
         query = query.eq("group_id", activeGroup.id);
      } else {
         // return empty if no active group
         return NextResponse.json({ schedules: [] }, { status: 200 });
      }
    }

    const { data: schedules, error: dbError } = await query
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (dbError) {
      console.error("Database error fetching schedules:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch schedules" },
        { status: 500 },
      );
    }

    return NextResponse.json({ schedules }, { status: 200 });
  } catch (error: any) {
    console.error("Critical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
