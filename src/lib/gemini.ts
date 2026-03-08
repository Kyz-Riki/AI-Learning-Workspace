import { GoogleGenerativeAI } from "@google/generative-ai";
import { SummaryTopic, QuizQuestion } from "@/lib/types/database";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface GeminiResponse {
  summary: SummaryTopic[];
  quiz: QuizQuestion[];
}

export async function generateSummaryAndQuizFromPDF(
  pdfBuffer: Buffer,
  mimeType: string = "application/pdf",
): Promise<GeminiResponse> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an academic expert assistant.

Analyze this PDF document and:

1. Create a structured summary grouped by topic.
2. Generate 10 multiple choice questions.
   - Each must include:
     - question
     - options (A, B, C, D)
     - correct_answer
     - explanation

Return ONLY valid JSON.
Do not wrap in markdown.
Do not add explanations outside JSON.
If invalid JSON, regenerate internally.

1. The summary MUST use the same language as the PDF.
2. The quiz questions MUST use the same language as the PDF.
3. The quiz answer options MUST use the same language as the PDF.
4. The correct answer explanation MUST use the same language as the PDF.
5. DO NOT mix languages

FORMAT:

{
  "summary": [
    {
      "topic": "",
      "points": ["", ""]
    }
  ],
  "quiz": [
    {
      "question": "",
      "options": {
        "A": "",
        "B": "",
        "C": "",
        "D": ""
      },
      "correct_answer": "A",
      "explanation": ""
    }
  ]
}`;

  try {
    // Convert buffer to base64
    const base64Data = pdfBuffer.toString("base64");

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const responseText = response.text();

    // Clean response - remove markdown code blocks if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\n/, "").replace(/\n```$/, "");
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\n/, "").replace(/\n```$/, "");
    }

    const parsed: GeminiResponse = JSON.parse(cleanedText);

    // Validate response structure
    if (!parsed.summary || !Array.isArray(parsed.summary)) {
      throw new Error("Invalid summary format");
    }
    if (
      !parsed.quiz ||
      !Array.isArray(parsed.quiz) ||
      parsed.quiz.length === 0
    ) {
      throw new Error("Invalid quiz format");
    }

    return parsed;
  } catch (error: any) {
    console.error("Gemini API error:", error);

    // Check for quota errors
    if (error.status === 429 || error.message?.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED");
    }

    // Check for other API errors
    if (error.status === 503 || error.status === 500) {
      throw new Error("AI_SERVICE_UNAVAILABLE");
    }

    throw new Error("Failed to generate summary and quiz. Please try again.");
  }
}
