"use client";

import { createClient } from "@/lib/supabase/client";
import { Workspace, QuizQuestion } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [grade, setGrade] = useState("");
  const router = useRouter();
  const supabase = createClient();
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setWorkspaceId(p.id);
      fetchWorkspace(p.id);
    });
  }, []);

  const fetchWorkspace = async (id: string) => {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      router.push("/dashboard");
      return;
    }

    setWorkspace(data);
    setLoading(false);
  };

  const handleAnswer = (answer: string) => {
    setAnswers({ ...answers, [currentQuestion]: answer });
  };

  const handleNext = () => {
    if (currentQuestion < (workspace?.quiz_data?.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return "S";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    return "D";
  };

  const handleSubmit = async () => {
    if (!workspace) return;

    let correct = 0;
    workspace.quiz_data.forEach((question: QuizQuestion, index: number) => {
      if (answers[index] === question.correct_answer) {
        correct++;
      }
    });

    const percentage = Math.round((correct / workspace.quiz_data.length) * 100);
    const calculatedGrade = calculateGrade(percentage);

    setScore(percentage);
    setGrade(calculatedGrade);
    setShowResults(true);

    // Update workspace
    const updateData: any = {};
    if (percentage > workspace.best_score) {
      updateData.best_score = percentage;
    }
    if (percentage >= 90 && workspace.status !== "mastered") {
      updateData.status = "mastered";
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from("workspaces")
        .update(updateData)
        .eq("id", workspaceId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!workspace || !workspace.quiz_data || workspace.quiz_data.length === 0) {
    return null;
  }

  const currentQuiz = workspace.quiz_data[currentQuestion];
  const progress = ((currentQuestion + 1) / workspace.quiz_data.length) * 100;

  if (showResults) {
    const gradeColors = {
      S: "from-yellow-600 to-yellow-500",
      A: "from-emerald-600 to-emerald-500",
      B: "from-blue-600 to-blue-500",
      C: "from-orange-600 to-orange-500",
      D: "from-red-600 to-red-500",
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          {/* Results Header */}
          <div className="text-center mb-12">
            <div
              className={`inline-block px-12 py-8 bg-gradient-to-r ${gradeColors[grade as keyof typeof gradeColors]} rounded-3xl shadow-2xl mb-6`}
            >
              <div className="text-8xl font-bold text-white mb-2">{grade}</div>
              <div className="text-2xl text-white/90">Grade</div>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{score}%</div>
            <div className="text-xl text-slate-400">
              {
                workspace.quiz_data.filter(
                  (_: any, i: number) =>
                    answers[i] === workspace.quiz_data[i].correct_answer,
                ).length
              }{" "}
              / {workspace.quiz_data.length} Correct
            </div>
          </div>

          {/* Question Review */}
          <div className="space-y-6 mb-8">
            {workspace.quiz_data.map(
              (question: QuizQuestion, index: number) => {
                const userAnswer = answers[index];
                const isCorrect = userAnswer === question.correct_answer;

                return (
                  <div
                    key={index}
                    className={`bg-slate-800/50 backdrop-blur-sm border rounded-xl p-6 ${
                      isCorrect ? "border-emerald-500/50" : "border-red-500/50"
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isCorrect ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      >
                        {isCorrect ? (
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-2">
                          Question {index + 1}
                        </h3>
                        <p className="text-slate-300 mb-4">
                          {question.question}
                        </p>

                        <div className="space-y-2 mb-4">
                          {Object.entries(question.options).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className={`p-3 rounded-lg ${
                                  key === question.correct_answer
                                    ? "bg-emerald-500/20 border border-emerald-500"
                                    : key === userAnswer
                                      ? "bg-red-500/20 border border-red-500"
                                      : "bg-slate-700/30 border border-slate-600"
                                }`}
                              >
                                <span className="text-white font-medium">
                                  {key}.
                                </span>{" "}
                                <span className="text-slate-300">{value}</span>
                                {key === question.correct_answer && (
                                  <span className="ml-2 text-emerald-400 text-sm">
                                    ✓ Correct
                                  </span>
                                )}
                                {key === userAnswer &&
                                  key !== question.correct_answer && (
                                    <span className="ml-2 text-red-400 text-sm">
                                      ✗ Your answer
                                    </span>
                                  )}
                              </div>
                            ),
                          )}
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                          <div className="text-blue-400 text-sm font-medium mb-1">
                            Explanation:
                          </div>
                          <div className="text-slate-300 text-sm">
                            {question.explanation}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              className="flex-1 py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition"
            >
              Back to Study
            </button>
            <button
              onClick={() => {
                setCurrentQuestion(0);
                setAnswers({});
                setShowResults(false);
                setScore(0);
                setGrade("");
              }}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-xl transition shadow-lg shadow-blue-500/30"
            >
              Retry Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Progress Bar */}
      <div className="h-2 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Exam Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Question Counter */}
        <div className="text-center mb-8">
          <div className="inline-block px-6 py-3 bg-emerald-600/20 border border-emerald-500 rounded-full">
            <span className="text-emerald-400 font-bold text-lg">
              Question {currentQuestion + 1} / {workspace.quiz_data.length}
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-8">
            {currentQuiz.question}
          </h2>

          <div className="space-y-4">
            {Object.entries(currentQuiz.options).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleAnswer(key)}
                className={`w-full p-6 rounded-xl text-left transition-all ${
                  answers[currentQuestion] === key
                    ? "bg-blue-600 border-2 border-blue-400 shadow-lg shadow-blue-500/30"
                    : "bg-slate-700/50 border-2 border-slate-600 hover:border-blue-500 hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      answers[currentQuestion] === key
                        ? "bg-white text-blue-600"
                        : "bg-slate-600 text-white"
                    }`}
                  >
                    {key}
                  </div>
                  <span className="text-white flex-1">{value}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex-1" />

          {currentQuestion === workspace.quiz_data.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={
                Object.keys(answers).length !== workspace.quiz_data.length
              }
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium rounded-xl transition shadow-lg shadow-blue-500/30"
            >
              Next →
            </button>
          )}
        </div>

        {/* Answer Status */}
        <div className="mt-8 flex flex-wrap gap-2 justify-center">
          {workspace.quiz_data.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-10 h-10 rounded-lg font-medium transition ${
                index === currentQuestion
                  ? "bg-blue-600 text-white ring-2 ring-blue-400"
                  : answers[index]
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-slate-400"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
