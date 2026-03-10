"use client";

import { Schedule } from "@/lib/types/database";
import { useEffect, useState, useMemo } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Calendar, Clock, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = [
  { value: 1, label: "Senin", short: "Sen" },
  { value: 2, label: "Selasa", short: "Sel" },
  { value: 3, label: "Rabu", short: "Rab" },
  { value: 4, label: "Kamis", short: "Kam" },
  { value: 5, label: "Jumat", short: "Jum" },
  { value: 6, label: "Sabtu", short: "Sab" },
  { value: 7, label: "Minggu", short: "Min" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HomePage() {
  const { data, error, isLoading } = useSWR("/api/schedules", fetcher);
  const schedules: Schedule[] = data?.schedules || [];

  const getCurrentDay = () => {
    const jsDay = new Date().getDay(); // 0 is Sunday, 1 is Monday
    return jsDay === 0 ? 7 : jsDay;
  };

  const [selectedDay, setSelectedDay] = useState<number>(getCurrentDay());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // 30 seconds update

    return () => clearInterval(timer);
  }, []);

  // derived schedule logic
  const dailySchedules = useMemo(() => {
    return schedules.filter(s => s.day_of_week === selectedDay);
  }, [schedules, selectedDay]);

  const getScheduleStatus = (schedule: Schedule) => {
    if (selectedDay !== getCurrentDay()) return "other_day";

    const formatNumber = (num: number) => num.toString().padStart(2, '0');
    const currentStr = `${formatNumber(currentTime.getHours())}:${formatNumber(currentTime.getMinutes())}:00`;

    if (currentStr >= schedule.start_time && currentStr <= schedule.end_time) {
      return "active";
    }

    const [startH, startM] = schedule.start_time.split(':').map(Number);
    const startTotalMins = startH * 60 + startM;
    const currentTotalMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const diff = startTotalMins - currentTotalMins;

    if (diff > 0 && diff <= 15) { // 15 mins
      return "upcoming";
    }

    if (currentStr > schedule.end_time) {
      return "done";
    }

    return "future";
  };

  const formatTime = (timeStr: string) => timeStr.substring(0, 5);

  return (
    <div className="flex-1 bg-slate-950 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            <h2 className="text-3xl font-black text-white tracking-tight">Home</h2>
          </div>
          <Link href="/schedule">
            <Button size="sm" variant="outline" className="text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10 font-bold">
              Atur Jadwal
            </Button>
          </Link>
        </div>

        {/* Day Swiper */}
        <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar snap-x">
          {DAYS.map(day => (
            <button
              key={day.value}
              onClick={() => setSelectedDay(day.value)}
              className={`flex-shrink-0 snap-start flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-all border ${selectedDay === day.value
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20 scale-105"
                : "bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider mb-1">{day.short}</span>
              {selectedDay === day.value && day.value === getCurrentDay() && (
                <span className="w-1.5 h-1.5 rounded-full bg-white mb-1 animate-pulse"></span>
              )}
            </button>
          ))}
        </div>

        {/* Stacked Cards for Today */}
        <div className="relative pt-4 space-y-4">
          {selectedDay === getCurrentDay() && dailySchedules.length > 0 && (
            <div className="absolute left-[39px] top-4 bottom-0 w-0.5 bg-slate-800 -z-10 rounded-full"></div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full bg-slate-900/50 rounded-2xl" />
              <Skeleton className="h-24 w-full bg-slate-900/50 rounded-2xl" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">Gagal memuat jadwal.</div>
          ) : dailySchedules.length === 0 ? (
            // Empty State Handling
            <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">☕</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Hari ini libur!</h3>
              <p className="text-slate-400 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
                Tidak ada jadwal pelajaran hari ini. Mau lanjutin riset jurnal, baca buku, atau main Persona?
              </p>
            </div>
          ) : (
            dailySchedules.map((schedule) => {
              const status = getScheduleStatus(schedule);
              let cardClasses = "bg-slate-900 border-slate-800 rounded-2xl pl-16 relative overflow-hidden transition-all duration-500";
              let glowEffect = null;
              let statusBadge = null;

              if (status === "active") {
                cardClasses = "bg-slate-900 border-indigo-500/50 rounded-2xl pl-16 relative overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.1)] scale-[1.02] transform transition-all duration-300 z-10";
                glowEffect = <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>;
                statusBadge = <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded animate-pulse">Sedang Berlangsung</span>;
              } else if (status === "upcoming") {
                cardClasses = "bg-slate-900/80 border-slate-700/80 rounded-2xl pl-16 relative overflow-hidden transition-all duration-300";
                statusBadge = <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">Mulai sebentar lagi</span>;
              } else if (status === "done") {
                cardClasses = "bg-slate-950 border-slate-800/50 rounded-2xl pl-16 relative overflow-hidden opacity-60 grayscale-[0.5]";
              }

              return (
                <Card key={schedule.id} className={cardClasses}>
                  {glowEffect}
                  {/* Time indicator circle */}
                  <div className="absolute left-[31px] top-6 w-3.5 h-3.5 rounded-full border-[3px] border-slate-900 bg-slate-600 z-10"
                    style={{
                      backgroundColor: status === 'active' ? '#6366f1' : status === 'done' ? '#10b981' : '#475569',
                      boxShadow: status === 'active' ? '0 0 10px #6366f1' : 'none'
                    }}
                  ></div>
                  <div className="absolute left-2 top-5 text-xs font-bold text-slate-400 w-10 text-right">
                    {formatTime(schedule.start_time)}
                  </div>

                  <CardContent className="p-4 pl-2">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        {statusBadge && <div className="mb-1.5">{statusBadge}</div>}
                        <h4 className={`font-bold text-lg mb-1 leading-tight ${status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                          {(schedule as any).subjects?.name || schedule.title}
                        </h4>
                        <div className="flex items-center text-sm font-medium text-slate-400">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                        </div>
                      </div>

                      {status === "active" && schedule.subject_id && (
                        <Link href={`/subject/${schedule.subject_id}`}>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 min-w-max">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Materi
                          </Button>
                        </Link>
                      )}
                      {status === "done" && (
                        <div className="text-emerald-500 flex flex-col items-center pt-1">
                          <CheckCircle2 className="w-6 h-6 mb-1" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Selesai</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
