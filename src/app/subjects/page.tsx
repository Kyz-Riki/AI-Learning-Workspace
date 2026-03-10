"use client";

import { createClient } from "@/lib/supabase/client";
import { Subject } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { FolderOpen, BookOpen, Plus, Loader2, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SubjectsPage() {
  const { data, error, isLoading, mutate } = useSWR("/api/subjects", fetcher);
  const subjects: Subject[] = data?.subjects || [];

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreateSubject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create subject");
      }

      setShowCreateModal(false);
      mutate(); // revalidate swr cache
    } catch (error: any) {
      alert(error.message || "Failed to create subject");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-indigo-500" /> AI Summary
            </h2>
            <p className="text-slate-400 mt-1">Wadah Mata Pelajaran & Analisis PDF Anda.</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 font-semibold transition-all hover:scale-105 shadow-lg shadow-indigo-900/20 hidden sm:flex"
          >
            <Plus className="w-4 h-4 mr-2" />
            Buat Wadah
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-[200px] bg-slate-900/50 border-slate-800 rounded-3xl">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 bg-slate-800 mb-2" />
                  <Skeleton className="h-4 w-1/4 bg-slate-800" />
                </CardHeader>
                <CardContent className="mt-6 space-y-3">
                  <Skeleton className="h-4 w-full bg-slate-800" />
                  <Skeleton className="h-4 w-2/3 bg-slate-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">Failed to load subjects.</div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
            <FolderOpen className="mx-auto h-16 w-16 text-slate-700 mb-6" strokeWidth={1.5} />
            <h3 className="text-2xl font-bold text-white mb-3">Belum Ada Mata Pelajaran</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
              Buat wadah mata kuliah pertama Anda untuk mulai mengorganisir materi PDF.
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg hover:shadow-indigo-900/20 transition-all font-semibold px-8"
            >
              <Plus className="w-5 h-5 mr-2" />
              Buat Wadah Baru
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                href={`/subject/${subject.id}`}
                className="group block h-full"
              >
                <Card className="h-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/50 border-slate-800 hover:border-indigo-500/30 transition-all duration-300 flex flex-col group-hover:shadow-xl group-hover:shadow-indigo-900/10 hover:-translate-y-1">
                  <CardHeader className="pb-4 border-b border-slate-800/40">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <CardTitle className="text-xl font-bold text-white mb-1 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                          {subject.name}
                        </CardTitle>
                      </div>
                      <div className="p-3 bg-slate-800/80 rounded-xl group-hover:bg-indigo-500/20 transition-colors flex-shrink-0 border border-slate-700/50 group-hover:border-indigo-500/30">
                        <BookOpen className="w-6 h-6 text-indigo-400" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 flex-grow">
                    <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                      {subject.description || "Tidak ada deskripsi."}
                    </p>
                  </CardContent>

                  <CardFooter className="pt-4 pb-4 border-t border-slate-800/40 mt-auto flex flex-row items-center justify-between bg-slate-950/30 rounded-b-2xl">
                    <p className="text-xs text-slate-500 font-medium">
                      Dibuat {new Date(subject.created_at).toLocaleDateString('id-ID')}
                    </p>
                    <div className="flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                      Buka Wadah
                      <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <Button
        onClick={() => setShowCreateModal(true)}
        size="lg"
        className="fixed bottom-24 right-6 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white z-30 transition-transform hover:scale-105 font-bold h-14 w-14 p-0 sm:hidden border-2 border-indigo-500/50"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="bg-slate-900 border-slate-800 max-w-md w-full shadow-2xl rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Buat Wadah Baru
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-bold text-slate-300 mb-2"
                  >
                    Nama Mata Pelajaran
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium"
                    placeholder="e.g., Logika Informatika"
                  />
                  <p className="text-xs text-slate-500 mt-2 font-medium">Jika nama persis sama dengan Jadwal kosong, AI akan otomatis menghubungkannya (Auto-link).</p>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-bold text-slate-300 mb-2"
                  >
                    Deskripsi Singkat (Opsional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium resize-none"
                    placeholder="Materi yang akan dipelajari di semester ini..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white h-12 rounded-xl font-semibold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-bold shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                  >
                    {creating ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Buat Wadah
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
