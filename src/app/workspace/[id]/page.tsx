"use client";

import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit, Target, BookOpen, Clock, Zap, CheckCircle2, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
          <strong key={index} className="font-bold text-slate-100 tracking-wide">
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
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <header className="border-b border-slate-800/60 bg-slate-950/50 sticky top-0 z-10 w-full h-[72px] flex items-center px-4 sm:px-6 lg:px-8">
            <Skeleton className="w-10 h-10 rounded-lg bg-slate-900 mr-4" />
            <Skeleton className="w-1/3 max-w-sm h-7 bg-slate-900" />
        </header>
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-8">
            <Skeleton className="h-[240px] w-full rounded-2xl bg-slate-900/80" />
            <Skeleton className="h-20 w-full rounded-2xl bg-slate-900/80" />
            <div className="space-y-6">
                <Skeleton className="h-48 w-full rounded-2xl bg-slate-900/80" />
                <Skeleton className="h-48 w-full rounded-2xl bg-slate-900/80" />
            </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10 transition-all w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg shrink-0 -ml-2 sm:ml-0">
               <Link href="/dashboard">
                 <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
               </Link>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold text-white line-clamp-1 tracking-tight">
              {workspace.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-65px)] w-full overflow-x-hidden pb-24 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 space-y-8 sm:space-y-12">
          
          {/* Stats Card */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl overflow-hidden rounded-3xl">
            <CardContent className="p-4 sm:p-10">
              <div className="grid grid-cols-3 gap-2 sm:gap-8 md:divide-x divide-slate-800/80">
                <div className="text-center group flex flex-col items-center">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 border border-blue-500/20 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                    <BrainCircuit className="w-5 h-5 sm:w-8 sm:h-8 text-blue-400" />
                  </div>
                  <div className="text-2xl sm:text-5xl font-black text-white mb-1 sm:mb-2 tracking-tighter">
                    {workspace.quiz_data?.length || 0}
                  </div>
                  <div className="text-[10px] sm:text-sm px-1 sm:px-4 py-1 text-slate-400 font-medium tracking-wide uppercase mt-1">Questions</div>
                </div>
                <div className="text-center group border-l sm:border-l-0 sm:border-t md:border-t-0 border-slate-800/80 flex flex-col items-center">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-purple-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300">
                    <Target className="w-5 h-5 sm:w-8 sm:h-8 text-purple-400" />
                  </div>
                  <div className="text-2xl sm:text-5xl font-black text-white mb-1 sm:mb-2 tracking-tighter">
                    {workspace.best_score}%
                  </div>
                  <div className="text-[10px] sm:text-sm px-1 sm:px-4 py-1 text-slate-400 font-medium tracking-wide uppercase mt-1">Best Score</div>
                </div>
                <div className="text-center group border-l sm:border-l-0 sm:border-t md:border-t-0 border-slate-800/80 flex flex-col items-center">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-emerald-500/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
                    <BookOpenCheck className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-5xl font-black text-white mb-1 sm:mb-2 tracking-tighter">
                    {workspace.summary_data?.length || 0}
                  </div>
                  <div className="text-[10px] sm:text-sm px-1 sm:px-4 py-1 text-slate-400 font-medium tracking-wide uppercase mt-1">Topics</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enter Simulation Button */}
          <div className="px-0 sm:px-0">
            {workspace.quiz_data && workspace.quiz_data.length > 0 ? (
              <Button asChild size="lg" className="w-full h-14 sm:h-20 bg-emerald-600 hover:bg-emerald-700 text-white text-base sm:text-xl font-bold rounded-2xl transition-all shadow-lg hover:-translate-y-1 gap-3 border border-emerald-500/30">
                <Link href={`/workspace/${workspaceId}/exam`}>
                  <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-100" fill="currentColor" />
                  <span className="tracking-wide">ENTER SIMULATION</span>
                </Link>
              </Button>
            ) : (
              <div className="text-center">
                <Button disabled size="lg" className="w-full h-14 sm:h-20 bg-slate-900 border border-slate-800 text-slate-500 text-base sm:text-xl font-bold rounded-2xl flex items-center justify-center gap-3">
                  <Zap className="w-5 h-5 sm:w-7 sm:h-7 opacity-40" />
                  <span className="tracking-wide opacity-80">ENTER SIMULATION</span>
                </Button>
                <div className="flex items-center justify-center gap-2 mt-4 text-slate-400 bg-slate-900 inline-flex sm:flex-none px-4 py-2 rounded-full mx-auto border border-slate-800">
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
            <div className="flex items-center gap-4 px-2 pb-6 border-b border-slate-800/60">
              <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
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
                const isConcepts = cleanTopic.toLowerCase().includes("konsep");
                
                return (
                  <Card
                    key={index}
                    className={`bg-slate-900/50 border-slate-800 shadow-md rounded-3xl overflow-hidden transition-all duration-300 group hover:border-slate-700`}
                  >
                    <CardContent className="p-4 sm:p-10">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8 pb-4 sm:pb-6 border-b border-slate-800">
                        <div className={`p-2.5 sm:p-3 rounded-xl ${
                          isFeedback ? "bg-purple-500/10 border border-purple-500/20" : 
                          isConcepts ? "bg-emerald-500/10 border border-emerald-500/20" : 
                          "bg-blue-500/10 border border-blue-500/20"
                        }`}>
                          {isFeedback ? <Target className="w-5 h-5 sm:w-7 sm:h-7 text-purple-400" /> : 
                           isConcepts ? <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400" /> : 
                           <BookOpenCheck className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />}
                        </div>
                        <h3 className={`text-[18px] sm:text-2xl font-black tracking-tight text-slate-100`}>
                          {cleanTopic}
                        </h3>
                      </div>
                      
                      {isConcepts ? (
                        <div className="flex flex-wrap gap-2 sm:gap-3 px-1 sm:px-2">
                          {topic.points.map((point, pointIndex) => (
                            <span 
                              key={pointIndex}
                              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm sm:text-base font-medium rounded-full hover:bg-emerald-500/20 transition-colors"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <ul className="space-y-6 sm:space-y-6 px-1 sm:px-2">
                          {topic.points.map((point, pointIndex) => (
                            <li
                              key={pointIndex}
                              className="flex gap-3 sm:gap-6 text-slate-300 leading-[1.65] sm:leading-[1.8] group/item transition-all items-start"
                            >
                              <div className={`mt-1 sm:mt-1.5 p-1 flex-shrink-0 transition-colors duration-300`}>
                                <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                  isFeedback ? "text-purple-500 group-hover/item:text-purple-400" : "text-blue-500 group-hover/item:text-blue-400"
                                }`} />
                              </div>
                              <p className="text-[15px] sm:text-[17px] text-justify text-slate-300 group-hover/item:text-slate-200 transition-colors mt-[1px] sm:mt-[3px]">
                                {renderMarkdown(point)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
