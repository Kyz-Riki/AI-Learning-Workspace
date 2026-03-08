"use client";

import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, FolderOpen, BookOpen, Plus, Loader2, Sparkles, FileText, ChevronRight } from "lucide-react";

const progressMessages = [
  "Uploading document...",
  "Scanning document structure...",
  "Extracting key concepts...",
  "Analyzing PDF content...",
  "Generating summary...",
  "Creating interactive simulation...",
  "Finalizing AI workspace...",
  "Almost there, organizing data..."
];

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setWorkspaces(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(progressMessages[0]);

    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex++;
      if (messageIndex >= progressMessages.length) {
        messageIndex = progressMessages.length - 1; // Stay on the last message
      }
      setUploadProgress(progressMessages[messageIndex]);
    }, 4000);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      setShowUploadModal(false);
      setUploadProgress("");
      fetchWorkspaces();
    } catch (error: any) {
      alert(error.message || "Failed to upload workspace");
    } finally {
      clearInterval(messageInterval);
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      not_started: "bg-slate-600/50 text-slate-300 border-slate-500",
      studying: "bg-blue-600/20 text-blue-300 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]",
      mastered: "bg-emerald-600/20 text-emerald-300 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    };
    const labels = {
      not_started: "Not Started",
      studying: "Studying",
      mastered: "Mastered",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-300 ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              AI Learning Workspace
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin opacity-80" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20 animate-[pulse_1s_ease-in-out]">
            <div className="mb-8">
              <FolderOpen className="mx-auto h-24 w-24 text-slate-600/50" strokeWidth={1} />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">
              No Workspaces Yet
            </h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto">
              Ready to accelerate your learning? Upload your first PDF to generate a personalized study space.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Upload PDF
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/workspace/${workspace.id}`}
                className="group"
              >
                <div className="h-full bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-xl p-6 hover:border-blue-500/50 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 transform group-hover:-translate-y-1 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors duration-300">
                        {workspace.title}
                      </h3>
                      {getStatusBadge(workspace.status)}
                    </div>
                    <div className="p-2 bg-slate-900/50 rounded-lg group-hover:bg-blue-500/20 transition-colors duration-300 flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-400 mt-auto pt-6">
                    <div className="flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded-md transition-colors group-hover:bg-slate-900/50">
                      <span>Best Score</span>
                      <span className="text-white font-medium text-blue-300">
                        {workspace.best_score}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-1">
                      <span>Questions</span>
                      <span className="text-white font-medium">
                        {workspace.quiz_data?.length
                          ? workspace.quiz_data.length
                          : <span className="text-slate-500 text-xs italic">Coming Soon</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-1">
                      <span>Topics</span>
                      <span className="text-white font-medium">
                        {workspace.summary_data?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-row items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Created {new Date(workspace.created_at).toLocaleDateString()}
                    </p>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {workspaces.length > 0 && (
        <button
          onClick={() => setShowUploadModal(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 group z-30"
          aria-label="Upload PDF"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
        </button>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-300">
            {uploading ? (
              <div className="text-center py-10">
                <div className="relative mx-auto w-24 h-24 mb-8">
                  {/* Outer spinning ring */}
                  <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-slate-700"></div>
                  <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-[spin_1.5s_linear_infinite]"></div>
                  {/* Inner spinning ring */}
                  <div className="absolute inset-2 rounded-full border-l-2 border-r-2 border-slate-700"></div>
                  <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-[spin_2s_linear_infinite_reverse]"></div>
                  {/* Center Icon */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/50">
                    <Sparkles className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">
                  Processing Space
                </h3>
                
                <div className="h-8 flex items-center justify-center">
                  <p className="text-blue-400 font-medium animate-pulse transition-all duration-300">
                    {uploadProgress}
                  </p>
                </div>
                
                {/* Skeleton loader items */}
                <div className="mt-8 space-y-3 px-4">
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 mb-4 overflow-hidden relative">
                    <div className="absolute top-0 bottom-0 left-0 bg-blue-500 w-1/2 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    New Workspace
                  </h2>
                  <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white transition">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <form onSubmit={handleUpload} className="space-y-6">
                  <div>
                    <label
                      htmlFor="title"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      Workspace Title
                    </label>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g., Introduction to Machine Learning"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="file"
                      className="block text-sm font-medium text-slate-300 mb-2"
                    >
                      PDF Document (max 5MB)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
                      <div className="w-full bg-slate-900 border border-slate-600 rounded-lg overflow-hidden flex items-center justify-center p-1 group-hover:border-slate-500 transition-colors">
                        <input
                          id="file"
                          name="file"
                          type="file"
                          accept=".pdf"
                          required
                          className="w-full text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 file:cursor-pointer transition-all focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="flex-1 px-4 py-3 bg-transparent border border-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium rounded-lg transition-transform transform hover:scale-105 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Create
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
