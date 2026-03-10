"use client";

import { createClient } from "@/lib/supabase/client";
import { Subject, Workspace } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Loader2, Sparkles, ChevronRight, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const subjectId = resolvedParams.id;

  const [subject, setSubject] = useState<Subject | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchSubjectAndWorkspaces();
  }, [subjectId]);

  const fetchSubjectAndWorkspaces = async () => {
    setLoading(true);
    try {
      // 1. Fetch Subject Details
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
        
      if (subjectError) throw subjectError;
      setSubject(subjectData);

      // 2. Fetch Workspaces for this Subject
      const { data: workspacesData, error: workspacesError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
        
      if (workspacesError) throw workspacesError;
      setWorkspaces(workspacesData || []);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      // Optional: Handle 404
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress("Memulai proses unggah...");

    const formData = new FormData(e.currentTarget);
    formData.append("subject_id", subjectId); // Inject the foreign key!

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const { workspace, job_id } = await response.json();

      // Start polling
      const MAX_POLLS = 60; // 120 seconds max
      let completed = false;
      for (let i = 0; i < MAX_POLLS; i++) {
        const statusRes = await fetch(`/api/workspaces/${workspace.id}/status?jobId=${job_id}`);
        if (!statusRes.ok) {
          throw new Error("Gagal memeriksa status AI");
        }
        const data = await statusRes.json();

        setUploadProgress(`[${data.progress}%] ${data.message || ""}`);

        if (data.status === "completed") {
          completed = true;
          break;
        }

        if (data.status === "failed") {
          throw new Error(data.error || "AI processing failed");
        }

        // Wait 2 seconds before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      if (!completed) {
        throw new Error("Timeout: Analisis terlalu lama. Silakan coba lagi.");
      }

      setShowUploadModal(false);
      setUploadProgress("");
      fetchSubjectAndWorkspaces(); // Refresh list
    } catch (error: any) {
      alert(error.message || "Failed to upload workspace");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      not_started: "bg-slate-800 text-slate-300 border-slate-700",
      studying: "bg-blue-900/30 text-blue-400 border-blue-800",
      mastered: "bg-emerald-900/30 text-emerald-400 border-emerald-800",
    };
    const labels = {
      not_started: "Belum Dimulai",
      studying: "Sedang Dipelajari",
      mastered: "Dikuasai",
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
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30 font-sans">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="text-slate-400 hover:text-white hover:bg-slate-900 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            <h1 className="text-xl font-bold tracking-tight line-clamp-1">
              {subject ? subject.name : "Memuat..."}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Subject Header Area */}
        {subject && !loading && (
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tight">
              {subject.name}
            </h2>
            <p className="text-slate-400 text-lg max-w-3xl leading-relaxed">
              {subject.description || "Tidak ada deskripsi untuk mata pelajaran ini."}
            </p>
          </div>
        )}

        {/* Workspaces List / Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
             <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
               Daftar Pertemuan <span className="text-slate-500 text-base font-medium">({workspaces.length})</span>
             </h3>
             <Button
                onClick={() => setShowUploadModal(true)}
                size="sm"
                className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full px-4 font-semibold transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Upload PDF
             </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-[240px] bg-slate-900/50 border-slate-800 rounded-2xl">
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 bg-slate-800 mb-2" />
                    <Skeleton className="h-4 w-1/4 bg-slate-800" />
                  </CardHeader>
                  <CardContent className="mt-8 space-y-3">
                    <Skeleton className="h-8 w-full bg-slate-800" />
                    <Skeleton className="h-4 w-full bg-slate-800" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
              <BookOpen className="mx-auto h-16 w-16 text-slate-700 mb-6" strokeWidth={1.5} />
              <h4 className="text-2xl font-bold text-white mb-3">Belum Ada Materi</h4>
              <p className="text-slate-400 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
                Upload PDF pertemuan pertama untuk dianalisis oleh AI.
              </p>
              <Button
                onClick={() => setShowUploadModal(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-900/20 transition-all font-semibold px-8"
              >
                <Plus className="w-5 h-5 mr-2" />
                Upload PDF
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.id}
                  href={`/workspace/${workspace.id}`}
                  className="group block h-full"
                >
                  <Card className="h-full rounded-2xl bg-slate-900/50 border-slate-800 hover:border-blue-500/40 transition-all duration-300 flex flex-col group-hover:bg-slate-900/80 group-hover:shadow-xl group-hover:shadow-blue-900/10 hover:-translate-y-1">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <CardTitle className="text-lg font-bold text-white mb-3 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                            {workspace.title}
                          </CardTitle>
                          {getStatusBadge(workspace.status)}
                        </div>
                        <div className="p-2.5 bg-slate-800/80 rounded-xl group-hover:bg-blue-500/20 transition-colors flex-shrink-0 border border-slate-700/50 group-hover:border-blue-500/40">
                          <BookOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="mt-auto pb-4">
                      <div className="space-y-3 text-sm text-slate-400">
                        <div className="flex justify-between items-center bg-slate-950/50 px-3 py-2.5 rounded-lg border border-slate-800/50 font-medium">
                          <span>Nilai Tertinggi</span>
                          <span className="text-emerald-400 font-bold">
                            {workspace.best_score}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-1">
                          <span>Soal Latihan</span>
                          <span className="text-white font-semibold">
                            {workspace.quiz_data?.length
                              ? workspace.quiz_data.length
                              : <span className="text-slate-500 text-xs italic font-normal">-</span>}
                          </span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-1">
                          <span>Topik Rangkuman</span>
                          <span className="text-white font-semibold">
                            {workspace.summary_data?.length || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 pb-4 border-t border-slate-800/50 mt-4 flex flex-row items-center justify-between">
                      <p className="text-xs text-slate-500 mt-4 font-medium">
                        Dibuat {new Date(workspace.created_at).toLocaleDateString("id-ID")}
                      </p>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-transform mt-4" />
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      {workspaces.length > 0 && (
        <Button
          onClick={() => setShowUploadModal(true)}
          size="lg"
          className="fixed bottom-8 right-8 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-30 transition-transform hover:scale-105 font-bold h-14 px-6 border-2 border-blue-500/50"
        >
          <Plus className="w-5 h-5 mr-2" />
          Upload Materi PDF
        </Button>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="bg-slate-900 border-slate-800 max-w-md w-full shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-8">
              {uploading ? (
                <div className="text-center py-6">
                  <div className="relative mx-auto w-20 h-20 mb-8 flex items-center justify-center bg-blue-500/10 rounded-full border border-blue-500/20">
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 tracking-wide">
                    Menganalisis Dokumen AI
                  </h3>
                  
                  <div className="h-8 flex items-center justify-center">
                    <p className="text-blue-400 font-medium animate-pulse transition-all duration-300">
                      {uploadProgress}
                    </p>
                  </div>
                  
                  <div className="mt-8 space-y-4 px-4">
                    <Skeleton className="h-2 w-full bg-slate-800 rounded-full" />
                    <Skeleton className="h-2 w-[80%] bg-slate-800 mx-auto rounded-full" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">
                        Upload PDF Baru
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">
                        Untuk: <span className="text-blue-400 font-semibold">{subject?.name}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowUploadModal(false)}
                      className="text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                  </div>
                  <form onSubmit={handleUpload} className="space-y-6">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-bold text-slate-300 mb-2"
                      >
                        Judul Pertemuan / Materi
                      </label>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                        placeholder="e.g., Pertemuan 1: Pengenalan AI"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="file"
                        className="block text-sm font-bold text-slate-300 mb-2"
                      >
                        File PDF (Maks. 5MB)
                      </label>
                      <div className="w-full bg-slate-950 border border-slate-700/80 rounded-xl overflow-hidden flex items-center justify-center p-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-colors">
                        <input
                          id="file"
                          name="file"
                          type="file"
                          accept=".pdf"
                          required
                          className="w-full text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 file:cursor-pointer transition-all focus:outline-none bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowUploadModal(false)}
                        className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white h-12 rounded-xl font-semibold"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-blue-900/20"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Mulai Analisis
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
