import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SummaryTopic } from "@/lib/types/database";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (FastAPI v2 limit)
const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";
const POLL_INTERVAL_MS = 2000; // 2 seconds
const POLL_TIMEOUT_MS = 120000; // 120 seconds max

// --- FastAPI v2 response types ---

interface JobUploadResponse {
  job_id: string;
  status: string;
  message: string;
}

interface PDFAnalysisResult {
  language: string;
  corrected_text: string;
  summary: string;
  learning_feedback: string[];
  total_pages: number;
}

interface JobStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: string;
  result: PDFAnalysisResult | null;
  error: string | null;
  cached: boolean;
}

/**
 * Poll FastAPI job status until completed or failed.
 * Throws on failure or timeout.
 */
async function pollJobUntilDone(jobId: string): Promise<PDFAnalysisResult> {
  const startTime = Date.now();

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed > POLL_TIMEOUT_MS) {
      throw new Error("AI_TIMEOUT");
    }

    const statusRes = await fetch(`${FASTAPI_URL}/api/pdf/status/${jobId}`);
    if (!statusRes.ok) {
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }

    const data: JobStatusResponse = await statusRes.json();

    if (data.status === "completed" && data.result) {
      return data.result;
    }

    if (data.status === "failed") {
      throw new Error(data.error || "AI processing failed");
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
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
    const file = formData.get("file") as File;

    if (!title || !file) {
      return NextResponse.json(
        { error: "Title and file are required" },
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

    // --- Data Conversion ---
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // --- Upload PDF to Supabase Storage first ---
    const fileName = `${user.id}/${Date.now()}_${file.name.replace(/\s/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(fileName, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("pdfs").getPublicUrl(fileName);

    // --- Send PDF to FastAPI v2 (async job queue) ---
    let analysisResult: PDFAnalysisResult;
    try {
      // Step 1: Upload to FastAPI → get job_id
      const fastApiForm = new FormData();
      fastApiForm.append("file", new Blob([buffer], { type: "application/pdf" }), file.name);

      const uploadRes = await fetch(`${FASTAPI_URL}/api/pdf/upload`, {
        method: "POST",
        body: fastApiForm,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        const detail = (errorData as any)?.detail || "FastAPI upload failed";

        if (uploadRes.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(detail);
      }

      const jobData: JobUploadResponse = await uploadRes.json();

      // Step 2: Poll status until completed
      analysisResult = await pollJobUntilDone(jobData.job_id);
    } catch (fastApiError: any) {
      // Cleanup file if AI fails
      await supabase.storage.from("pdfs").remove([fileName]);
      console.error("FastAPI error:", fastApiError);

      if (fastApiError.message === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          { error: "Quota AI habis. Tunggu beberapa saat atau coba lagi nanti." },
          { status: 429 },
        );
      }

      if (fastApiError.message === "AI_SERVICE_UNAVAILABLE") {
        return NextResponse.json(
          { error: "Layanan AI sedang sibuk. Coba lagi dalam beberapa saat." },
          { status: 503 },
        );
      }

      if (fastApiError.message === "AI_TIMEOUT") {
        return NextResponse.json(
          { error: "Proses AI terlalu lama. Silakan coba lagi." },
          { status: 504 },
        );
      }

      return NextResponse.json(
        {
          error:
            fastApiError.message ||
            "AI gagal membaca PDF. Pastikan PDF tidak terenkripsi dan berisi teks yang dapat dibaca.",
        },
        { status: 503 },
      );
    }

    // --- Map FastAPI response to workspace data model ---
    const summaryData: SummaryTopic[] = [
      {
        topic: "Ringkasan",
        points: [analysisResult.summary],
      },
      {
        topic: "Feedback Belajar",
        points: analysisResult.learning_feedback,
      },
    ];

    // --- Save to Database ---
    const { data: workspace, error: dbError } = await supabase
      .from("workspaces")
      .insert({
        user_id: user.id,
        title,
        file_url: publicUrl,
        summary_data: summaryData,
        quiz_data: [], // Quiz will be added later via FastAPI quiz service
        status: "not_started",
        best_score: 0,
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from("pdfs").remove([fileName]);
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save workspace" },
        { status: 500 },
      );
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error: any) {
    console.error("Critical error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
