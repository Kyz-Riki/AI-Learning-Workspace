import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

interface JobUploadResponse {
  job_id: string;
  status: string;
  message: string;
}

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

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const subject_id = formData.get("subject_id") as string;
    const file = formData.get("file") as File;

    if (!title || !file || !subject_id) {
      return NextResponse.json(
        { error: "Title, subject_id, and file are required" },
        { status: 400 },
      );
    }

    // --- Validation ---
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimum 5MB, file Anda ${(file.size / (1024 * 1024)).toFixed(1)}MB.` },
        { status: 400 },
      );
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- Upload PDF to Supabase Storage ---
    const fileName = `${user.id}/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("pdfs").getPublicUrl(fileName);

    // --- Initial Save to Database ---
    const { data: workspace, error: dbError } = await supabase
      .from("workspaces")
      .insert({
        user_id: user.id,
        title,
        subject_id,
        file_url: publicUrl,
        summary_data: [],
        quiz_data: [],
        status: "not_started",
        best_score: 0,
      })
      .select()
      .single();

    if (dbError || !workspace) {
      await supabase.storage.from("pdfs").remove([fileName]);
      return NextResponse.json({ error: "Failed to save workspace" }, { status: 500 });
    }

    // --- Send PDF to FastAPI v2 (async job queue) ---
    try {
      const fastApiForm = new FormData();
      fastApiForm.append("file", new Blob([buffer], { type: "application/pdf" }), file.name);

      const uploadRes = await fetch(`${FASTAPI_URL}/api/pdf/upload`, {
        method: "POST",
        body: fastApiForm,
      });

      if (!uploadRes.ok) {
        throw new Error("FastAPI upload failed");
      }

      const jobData: JobUploadResponse = await uploadRes.json();
      
      return NextResponse.json({ workspace, job_id: jobData.job_id }, { status: 201 });
      
    } catch (fastApiError) {
      // Revert if FastAPI fails to accept job
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      await supabase.storage.from("pdfs").remove([fileName]);
      return NextResponse.json(
        { error: "AI service failed. Please try again." },
        { status: 503 },
      );
    }

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
