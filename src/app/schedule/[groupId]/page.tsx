"use client";

import { createClient } from "@/lib/supabase/client";
import { Subject, Schedule } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import { Plus, Loader2, Calendar as CalendarIcon, Clock, BookOpen, Trash2, ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { use } from "react";

const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default function GroupScheduleDetailPage(props: PageProps) {
  const params = use(props.params);
  const groupId = params.groupId;
  
  const { data: schedData, isLoading: loadingSched, mutate: mutateSched } = useSWR(`/api/schedules?groupId=${groupId}`, fetcher);
  
  const schedules: Schedule[] = schedData?.schedules || [];
  
  const supabase = createClient();
  const router = useRouter();
  
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Hapus jadwal spesifik ini permanen?")) return;
    try {
      mutateSched(
        (prev: any) => {
            if (!prev) return prev;
            return { schedules: prev.schedules.filter((s: Schedule) => s.id !== id) }
        }, 
        false
      ); // optimistic UI
      
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      mutateSched();
    } catch (error) {
      alert("Gagal menghapus.");
      mutateSched();
    }
  };

  const schedulesByDay = useMemo(() => {
    const grouped: Record<number, Schedule[]> = {};
    DAYS.forEach(d => grouped[d.value] = []);
    schedules.forEach(s => grouped[s.day_of_week].push(s));
    return grouped;
  }, [schedules]);

  const formatTime = (tStr: string) => tStr.substring(0, 5);

  const loading = loadingSched;

  return (
    <div className="flex-1 bg-slate-950 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/50 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/schedule">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-500" /> Detail Semester
              </h2>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">Melihat dan mengedit baris jadwal satuan.</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
             <Skeleton className="h-20 w-full bg-slate-900/50 rounded-2xl" />
             <Skeleton className="h-20 w-full bg-slate-900/50 rounded-2xl" />
          </div>
        )}

        {/* Empty State */}
        {!loading && schedules.length === 0 && (
          <div className="text-center py-20 px-6 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
            <CalendarIcon className="mx-auto h-16 w-16 text-slate-700 mb-6" strokeWidth={1.5} />
            <h3 className="text-2xl font-bold text-white mb-3">Tidak Ada Jadwal tersisa</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
              Semua jadwal di dalam grup ini telah dihapus.
            </p>
          </div>
        )}

        {/* Display Content for each day that has schedules */}
        {!loading && schedules.length > 0 && (
          <div className="space-y-12">
            {DAYS.map((day) => {
              const dayScheds = schedulesByDay[day.value];
              if (dayScheds.length === 0) return null;

              return (
                <div key={day.value} className="space-y-4">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                    {day.label}
                  </h3>
                  
                  {/* Desktop Data Table View */}
                  <div className="hidden md:block border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                    <Table>
                      <TableHeader className="bg-slate-900">
                        <TableRow className="border-slate-800 hover:bg-slate-900">
                          <TableHead className="w-[120px] font-bold text-slate-300">Jam</TableHead>
                          <TableHead className="font-bold text-slate-300">Mata Pelajaran</TableHead>
                          <TableHead className="font-bold text-slate-300 w-[200px]">Link AI Workspace</TableHead>
                          <TableHead className="text-right font-bold text-slate-300 w-[100px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dayScheds.map((sch) => (
                          <TableRow key={sch.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                            <TableCell className="font-medium text-slate-300">
                              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400"/> {formatTime(sch.start_time)} - {formatTime(sch.end_time)}</span>
                            </TableCell>
                            <TableCell className="font-semibold text-white">
                              {(sch as any).subjects?.name || sch.title}
                            </TableCell>
                            <TableCell>
                              {sch.subject_id ? (
                                <Link href={`/subject/${sch.subject_id}`} className="inline-flex items-center text-xs font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-md transition-colors">
                                  <GraduationCap className="w-3.5 h-3.5 mr-1" /> Terhubung
                                </Link>
                              ) : (
                                <span className="text-xs font-medium text-slate-500 italic">Unlinked</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                               <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(sch.id)} className="text-slate-500 hover:text-red-400 hover:bg-slate-800">
                                 <Trash2 className="w-4 h-4" />
                               </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Stacked Cards View */}
                  <div className="md:hidden space-y-3">
                    {dayScheds.map((sch) => (
                       <Card key={sch.id} className="bg-slate-900 border-slate-800 rounded-2xl">
                         <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-[17px] text-white leading-tight mb-1">
                                {(sch as any).subjects?.name || sch.title}
                              </h4>
                              <div className="flex items-center text-slate-400 text-sm font-medium">
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                                {formatTime(sch.start_time)} - {formatTime(sch.end_time)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               {sch.subject_id && (
                                 <Link href={`/subject/${sch.subject_id}`}>
                                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 active:bg-indigo-500/30">
                                    <BookOpen className="w-4 h-4" />
                                  </div>
                                 </Link>
                               )}
                               <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(sch.id)} className="text-slate-500">
                                 <Trash2 className="w-5 h-5" />
                               </Button>
                            </div>
                         </CardContent>
                       </Card>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
