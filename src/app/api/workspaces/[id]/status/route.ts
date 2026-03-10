import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SummaryTopic } from "@/lib/types/database";

export const runtime = "nodejs";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://127.0.0.1:8000";

interface PDFAnalysisResponse {
  language: string;
  summary: string[];
  learning_feedback: string[];
  key_concepts: string[];
  total_pages: number;
}

interface JobStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  result: PDFAnalysisResponse | null;
  error: string | null;
  cached: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const resolvedParams = await params;

    // --- Authentication ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const statusRes = await fetch(`${FASTAPI_URL}/api/pdf/status/${jobId}`);
    
    if (!statusRes.ok) {
      return NextResponse.json(
        { error: "Failed to communicate with AI Backend" },
        { status: 502 }
      );
    }

    const data: JobStatusResponse = await statusRes.json();

    // If completed, update the Workspace in Supabase
    if (data.status === "completed" && data.result) {
      const summaryData: SummaryTopic[] = [
        {
          topic: "Ringkasan",
          points: data.result.summary,
        },
        {
          topic: "Feedback Belajar",
          points: data.result.learning_feedback,
        },
      ];

      if (data.result.key_concepts && data.result.key_concepts.length > 0) {
        summaryData.push({
          topic: "Konsep Penting",
          points: data.result.key_concepts,
        });
      }

      const { error: updateError } = await supabase
        .from("workspaces")
        .update({
          summary_data: summaryData,
        })
        .eq("id", resolvedParams.id);

      if (updateError) {
        console.error("Failed to update workspace:", updateError);
        return NextResponse.json(
          { error: "Failed to update workspace data" },
          { status: 500 }
        );
      }
    }

    // Proxy the status response to the frontend client
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    console.error("Status polling error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
