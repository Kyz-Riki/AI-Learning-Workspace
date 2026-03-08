"use client";

import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit, Target, BookOpen, Clock, Zap, CheckCircle2, BookOpenCheck } from "lucide-react";

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const [workspaceId, setWorkspaceId] = useState<string>("");

  // Helper function to render markdown bold text
  const renderMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={index} className="font-bold text-white tracking-wide">
            {boldText}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

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

    // Update status to studying if it's not started
    if (data.status === "not_started") {
      await supabase
        .from("workspaces")
        .update({ status: "studying" })
        .eq("id", id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 opacity-80"></div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="p-2 sm:p-2.5 -ml-2 sm:ml-0 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white line-clamp-1 tracking-tight">
              {workspace.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-65px)] w-full overflow-x-hidden pb-24 sm:pb-16">
        <div className="max-w-4xl mx-auto px-0 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-8 sm:space-y-12">
          
          {/* Stats Card */}
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 sm:border border-y border-blue-500/20 sm:border-blue-500/30 sm:rounded-3xl p-6 sm:p-10 shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x divide-blue-500/20">
              <div className="text-center group flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300 shadow-inner">
                  <BrainCircuit className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tighter">
                  {workspace.quiz_data?.length || 0}
                </div>
                <div className="text-sm border border-slate-700/50 rounded-full px-4 py-1 text-slate-300 font-medium">Questions</div>
              </div>
              <div className="text-center group border-t md:border-t-0 border-blue-500/20 pt-8 md:pt-0 flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300 shadow-inner">
                  <Target className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tighter">
                  {workspace.best_score}%
                </div>
                <div className="text-sm border border-slate-700/50 rounded-full px-4 py-1 text-slate-300 font-medium">Best Score</div>
              </div>
              <div className="text-center group border-t md:border-t-0 border-blue-500/20 pt-8 md:pt-0 flex flex-col items-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300 shadow-inner">
                  <BookOpenCheck className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tighter">
                  {workspace.summary_data?.length || 0}
                </div>
                <div className="text-sm border border-slate-700/50 rounded-full px-4 py-1 text-slate-300 font-medium">Topics</div>
              </div>
            </div>
          </div>

          {/* Enter Simulation Button */}
          <div className="px-4 sm:px-0">
            {workspace.quiz_data && workspace.quiz_data.length > 0 ? (
              <Link
                href={`/workspace/${workspaceId}/exam`}
                className="block"
              >
                <button className="w-full py-5 sm:py-6 px-4 sm:px-8 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-lg sm:text-xl font-bold rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgb(16,185,129,0.3)] transform hover:-translate-y-1 flex items-center justify-center gap-3 group border border-emerald-400/30">
                  <Zap className="w-6 h-6 sm:w-7 sm:h-7 group-hover:scale-125 group-hover:text-yellow-300 transition-all" fill="currentColor" />
                  <span className="tracking-wide">ENTER SIMULATION</span>
                </button>
              </Link>
            ) : (
              <div className="text-center">
                <button
                  disabled
                  className="w-full py-5 sm:py-6 px-4 sm:px-8 bg-slate-800/80 border border-slate-700 text-slate-500 text-lg sm:text-xl font-bold rounded-2xl cursor-not-allowed flex items-center justify-center gap-3 backdrop-blur-sm"
                >
                  <Zap className="w-6 h-6 sm:w-7 sm:h-7 opacity-40" />
                  <span className="tracking-wide opacity-80">ENTER SIMULATION</span>
                </button>
                <div className="flex items-center justify-center gap-2 mt-5 text-slate-400 bg-slate-800/50 inline-flex sm:flex-none px-4 py-1.5 rounded-full mx-auto border border-slate-700/50">
                  <Clock className="w-4 h-4" />
                  <p className="text-sm font-semibold tracking-wide">
                    Simulation Quiz — Coming Soon
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Summary Section */}
          <div className="space-y-6 sm:space-y-8 px-0 sm:px-0">
            <div className="flex items-center gap-4 px-5 sm:px-2 pb-4 sm:pb-6 border-b border-slate-700/50">
              <div className="p-2.5 bg-blue-500/10 rounded-xl shadow-inner border border-blue-500/20">
                <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Study Summary
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:gap-8">
              {workspace.summary_data?.map((topic, index) => {
                // Filter out any leftover emojis from old DB records to ensure a clean UI
                const cleanTopic = topic.topic.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
                
                // Determine styling based on section type
                const isFeedback = cleanTopic.toLowerCase().includes("feedback");
                
                return (
                  <div
                    key={index}
                    className={`bg-slate-800/40 sm:backdrop-blur-md sm:border sm:rounded-3xl p-6 sm:p-10 transition-all duration-300 group shadow-lg ${
                      isFeedback 
                        ? "border-y border-purple-500/20 sm:border-purple-500/30 hover:bg-slate-800/60" 
                        : "border-y border-blue-500/20 sm:border-blue-500/30 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-700/50">
                      <div className={`p-3 rounded-xl shadow-inner ${
                        isFeedback ? "bg-purple-500/10 border border-purple-500/20" : "bg-blue-500/10 border border-blue-500/20"
                      }`}>
                        {isFeedback ? <Target className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" /> : <BookOpenCheck className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400" />}
                      </div>
                      <h3 className={`text-[22px] sm:text-2xl font-black tracking-tight ${
                        isFeedback ? "text-purple-300" : "text-blue-300"
                      }`}>
                        {cleanTopic}
                      </h3>
                    </div>
                    
                    <ul className="space-y-5 sm:space-y-6">
                      {topic.points.map((point, pointIndex) => (
                        <li
                          key={pointIndex}
                          className="flex gap-4 sm:gap-6 text-slate-300 leading-[1.7] sm:leading-[1.8] group/item transition-all items-start"
                        >
                          <div className={`mt-1.5 p-1 rounded-full flex-shrink-0 transition-colors duration-300 ${
                            isFeedback ? "bg-slate-700/50 group-hover/item:bg-purple-500/20" : "bg-slate-700/50 group-hover/item:bg-blue-500/20"
                          }`}>
                            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${
                              isFeedback ? "text-slate-500 group-hover/item:text-purple-400" : "text-slate-500 group-hover/item:text-blue-400"
                            }`} />
                          </div>
                          <p className="text-[16px] sm:text-[17px] text-slate-300 group-hover/item:text-slate-100 transition-colors mt-0.5">
                            {renderMarkdown(point)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
