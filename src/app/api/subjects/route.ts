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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 },
      );
    }

    // --- Save to Database ---
    const { data: subject, error: dbError } = await supabase
      .from("subjects")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to create subject" },
        { status: 500 },
      );
    }

    // --- Auto-link Logic ---
    // Check if there's any unlinked schedule with the same title as this new subject
    try {
      const { data: scheduleToLink } = await supabase
        .from("schedules")
        .select("id")
        .eq("user_id", user.id)
        .is("subject_id", null)
        .ilike("title", name) // case-insensitive match just in case
        .limit(1)
        .single();
        
      if (scheduleToLink) {
        // Link it!
        await supabase
          .from("schedules")
          .update({ subject_id: subject.id })
          .eq("id", scheduleToLink.id);
      }
    } catch (autoLinkError) {
      // We don't want to fail the subject creation just because auto-link failed
      console.error("Auto-link warning:", autoLinkError);
    }

    return NextResponse.json({ subject }, { status: 201 });
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

    // --- Fetch Subjects ---
    const { data: subjects, error: dbError } = await supabase
      .from("subjects")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch subjects" },
        { status: 500 },
      );
    }

    return NextResponse.json({ subjects }, { status: 200 });
  } catch (error: any) {
    console.error("Critical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
