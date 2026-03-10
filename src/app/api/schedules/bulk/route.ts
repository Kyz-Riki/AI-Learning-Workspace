import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { group_name, schedules } = body;

    if (!group_name || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { error: "group_name and an array of schedules are required" },
        { status: 400 },
      );
    }

    // 1. Create the new Schedule Group
    const { data: group, error: groupError } = await supabase
      .from("schedule_groups")
      .insert({
        user_id: user.id,
        name: group_name,
        is_active: true, // make the new group active by default
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // 2. Set all other groups to inactive (since this new one is active)
    await supabase
      .from("schedule_groups")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("id", group.id);

    // 3. Process each schedule row
    const finalSchedules = [];
    let successCount = 0;
    const failErrors = [];

    for (const row of schedules) {
        let finalSubjectId = row.subject_id || null;

        // Smart Flow: Create Subject on the fly
        if (!finalSubjectId && row.create_subject) {
            const { data: newSubject, error: subjectError } = await supabase
              .from("subjects")
              .insert({
                user_id: user.id,
                name: row.title,
                description: "Dibuat otomatis dari Jadwal",
              })
              .select()
              .single();

            if (!subjectError) {
              finalSubjectId = newSubject.id;
            }
        }

        // Strict 1-to-1 Constraint Check
        let isUsed = false;
        if (finalSubjectId) {
            const { data: existingUsage } = await supabase
              .from("schedules")
              .select("id")
              .eq("subject_id", finalSubjectId)
              .maybeSingle();
            
            if (existingUsage) isUsed = true;
        }

        if (isUsed) {
            failErrors.push(`Matkul '${row.title}' sudah dipakai di jadwal lain.`);
            continue; // skip this row
        }

        finalSchedules.push({
            user_id: user.id,
            group_id: group.id,
            title: row.title,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            subject_id: finalSubjectId,
        });
    }

    // 4. Bulk Insert all valid schedules
    if (finalSchedules.length > 0) {
        const { error: dbError } = await supabase
          .from("schedules")
          .insert(finalSchedules);

        if (dbError) throw dbError;
        successCount = finalSchedules.length;
    }

    return NextResponse.json({ 
        message: "Success", 
        group: group,
        successCount, 
        failCount: schedules.length - successCount,
        errors: failErrors
    }, { status: 201 });

  } catch (error: any) {
    console.error("Critical error in bulk insert:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
