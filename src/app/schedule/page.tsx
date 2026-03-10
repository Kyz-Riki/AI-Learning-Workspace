"use client";

import { createClient } from "@/lib/supabase/client";
import { Subject, ScheduleGroup } from "@/lib/types/database";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { Plus, Loader2, Calendar as CalendarIcon, Clock, BookOpen, Trash2, CheckCircle2, MoreVertical, GraduationCap, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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

interface BulkRow {
  id: string; // temp id for list key
  subjectId: string | "NEW";
  title: string;
  createSubject: boolean;
  startTime: string;
  endTime: string;
}

export default function ScheduleGroupsPage() {
  const { data: grpData, error: grpError, isLoading: loadingGrps, mutate: mutateGrps } = useSWR("/api/schedule-groups", fetcher);
  const { data: subData, isLoading: loadingSubs, mutate: mutateSubs } = useSWR("/api/subjects", fetcher);

  const groups: ScheduleGroup[] = grpData?.groups || [];
  const subjects: Subject[] = subData?.subjects || [];

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Bulk Form State - Grouped by Day
  const [groupName, setGroupName] = useState("");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [bulkData, setBulkData] = useState<Record<number, BulkRow[]>>({
    1: [{ id: "1", subjectId: "NEW", title: "", createSubject: false, startTime: "08:00", endTime: "10:00" }],
    2: [], 3: [], 4: [], 5: [], 6: [], 7: []
  });

  const activeRows = bulkData[activeDay] || [];

  const addBulkRow = () => {
    setBulkData(prev => ({
      ...prev,
      [activeDay]: [
        ...prev[activeDay],
        { id: Date.now().toString(), subjectId: "NEW", title: "", createSubject: false, startTime: "10:00", endTime: "12:00" }
      ]
    }));
  };

  const removeBulkRow = (id: string) => {
    setBulkData(prev => ({
      ...prev,
      [activeDay]: prev[activeDay].filter(r => r.id !== id)
    }));
  };

  const updateBulkRow = (id: string, field: keyof BulkRow, value: any) => {
    setBulkData(prev => ({
      ...prev,
      [activeDay]: prev[activeDay].map(r => {
        if (r.id === id) {
          const newRow = { ...r, [field]: value };
          if (field === "subjectId" && value !== "NEW") {
            const sbj = availableSubjects.find(s => s.id === value);
            if (sbj) newRow.title = sbj.name;
          } else if (field === "subjectId" && value === "NEW") {
            newRow.title = "";
          }
          return newRow;
        }
        return r;
      })
    }));
  };

  // Helper to check time overlapping
  const checkOverlaps = () => {
    for (let day = 1; day <= 7; day++) {
      const rows = bulkData[day];
      for (let i = 0; i < rows.length; i++) {
        const r1 = rows[i];
        const start1 = r1.startTime;
        const end1 = r1.endTime;
        if (start1 >= end1) {
          return { valid: false, message: `Di hari ${DAYS.find(d => d.value === day)?.label}, waktu selesai harus lebih besar dari waktu mulai.` };
        }

        for (let j = i + 1; j < rows.length; j++) {
          const r2 = rows[j];
          // A overlap B if Max(startA, startB) < Min(endA, endB)
          const maxStart = r1.startTime > r2.startTime ? r1.startTime : r2.startTime;
          const minEnd = r1.endTime < r2.endTime ? r1.endTime : r2.endTime;
          if (maxStart < minEnd) {
            return { valid: false, message: `Jadwal tabrakan di hari ${DAYS.find(d => d.value === day)?.label} antara jam ${r1.startTime}-${r1.endTime} dan ${r2.startTime}-${r2.endTime}.` };
          }
        }
      }
    }
    return { valid: true };
  };

  const handleSaveBulk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupName) return;

    // Check overlaps
    const validity = checkOverlaps();
    if (!validity.valid) {
      alert(validity.message);
      return;
    }

    // Flatten data
    const finalSchedules: any[] = [];
    Object.keys(bulkData).forEach((dayKey) => {
      const dayNum = Number(dayKey);
      bulkData[dayNum].forEach(r => {
        finalSchedules.push({
          title: r.title,
          day_of_week: dayNum,
          start_time: r.startTime + ":00",
          end_time: r.endTime + ":00",
          subject_id: r.subjectId === "NEW" ? null : r.subjectId,
          create_subject: r.subjectId === "NEW" && r.createSubject
        });
      });
    });

    if (finalSchedules.length === 0) {
      alert("Minimal harus ada 1 jadwal untuk disimpan.");
      return;
    }

    setSaving(true);

    const payload = {
      group_name: groupName,
      schedules: finalSchedules
    };

    try {
      const res = await fetch("/api/schedules/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Gagal menyimpan jadwal semester");

      if (result.failCount > 0) {
        alert(`Berhasil: ${result.successCount}. Gagal: ${result.failCount}. \nAda matkul yang mungkin konflik/sudah dipakai.`);
      }

    } catch (e: any) {
      alert(e.message || "Gagal menghubungi server");
    }

    setSaving(false);
    setShowBulkModal(false);
    // Reset form
    setGroupName("");
    setActiveDay(1);
    setBulkData({
      1: [{ id: "1", subjectId: "NEW", title: "", createSubject: false, startTime: "08:00", endTime: "10:00" }],
      2: [], 3: [], 4: [], 5: [], 6: [], 7: []
    });

    mutateGrps();
    mutateSubs();
  };

  const getTotalSchedulesCount = () => {
    let count = 0;
    Object.values(bulkData).forEach(rows => count += rows.length);
    return count;
  };

  const setGroupActive = async (groupId: string) => {
    // Opt UI
    mutateGrps((prev: any) => {
      if (!prev) return prev;
      return {
        groups: prev.groups.map((g: ScheduleGroup) => ({ ...g, is_active: g.id === groupId }))
      }
    }, false);

    try {
      await fetch("/api/schedule-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId })
      });
      mutateGrps(); // reval
    } catch (e) {
      alert("Gagal mengaktifkan jadwal");
      mutateGrps();
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm("Anda yakin ingin menghapus seluruh jadwal di Semester ini? Tindakan ini tidak bisa dibatalkan.")) return;
    mutateGrps((prev: any) => {
      if (!prev) return prev;
      return { groups: prev.groups.filter((g: ScheduleGroup) => g.id !== groupId) }
    }, false);

    try {
      await fetch(`/api/schedule-groups?id=${groupId}`, { method: "DELETE" });
      mutateGrps();
      mutateSubs(); // in case we freed up subjects
    } catch (e) {
      mutateGrps();
    }
  };

  const availableSubjects = useMemo(() => {
    return subjects;
  }, [subjects]);


  const loading = loadingGrps;

  return (
    <div className="flex-1 bg-slate-950 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/50">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-indigo-500" /> Schedules
            </h2>
            <p className="text-slate-400 mt-1">Kelompokkan jadwal kuliah Anda per Semester di sini.</p>
          </div>

        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-44 w-full bg-slate-900/50 rounded-2xl" />
            <Skeleton className="h-44 w-full bg-slate-900/50 rounded-2xl" />
          </div>
        )}

        {/* Empty State */}
        {!loading && groups.length === 0 && (
          <div className="text-center py-20 px-6 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
            <CalendarIcon className="mx-auto h-16 w-16 text-slate-700 mb-6" strokeWidth={1.5} />
            <h3 className="text-2xl font-bold text-white mb-3">Belum Ada Grup Jadwal</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto text-lg leading-relaxed">
              Mulai input jadwal 1 semester penuh Anda sekaligus melalui fitur bulk builder kami.
            </p>
            <Button onClick={() => setShowBulkModal(true)} size="lg" className="bg-indigo-600">
              <Plus className="w-5 h-5 mr-2" /> Buat Semester Baru
            </Button>
          </div>
        )}

        {/* Groups Grid */}
        {!loading && groups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((grp) => (
              <Card key={grp.id} className={`bg-slate-900 rounded-3xl overflow-hidden transition-all duration-300 relative group border-2 ${grp.is_active ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.02]' : 'border-slate-800 hover:border-slate-700'}`}>
                {grp.is_active && <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500"></div>}

                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-2xl font-black text-white">{grp.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => deleteGroup(grp.id)} className="text-slate-500 hover:text-red-400 -mt-2 -mr-2 hover:bg-slate-800">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {grp.is_active ? (
                    <div className="flex items-center text-xs font-bold text-indigo-400 mt-2 bg-indigo-500/10 w-fit px-2.5 py-1 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Aktif di Dashboard
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-500 mt-2">Tidak Aktif</div>
                  )}
                </CardHeader>

                <CardContent className="pt-4 pb-6">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Satu kumpulan jadwal yang menghubungkan wadah mata kuliah Anda sepanjang satu semester.
                  </p>
                </CardContent>

                <CardFooter className="bg-slate-950/50 p-4 font-bold text-indigo-400 mt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
                  <Link href={`/schedule/${grp.id}`} className="flex-1">
                    <Button variant="outline" className="w-full bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white">
                      Lihat / Edit Detail
                    </Button>
                  </Link>
                  {!grp.is_active && (
                    <Button onClick={() => setGroupActive(grp.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                      Set sebagai Aktif
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile) */}
      <Button
        onClick={() => setShowBulkModal(true)}
        size="lg"
        className="fixed bottom-24 right-6 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white z-30 transition-transform hover:scale-105 font-bold h-14 w-14 p-0 sm:hidden border-2 border-indigo-500/50"
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Bulk Input Flow Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50">
          <Card className="bg-slate-900 border-slate-800 max-w-3xl w-full shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[95vh]">
            <CardHeader className="p-4 sm:p-6 pb-2 border-b border-slate-800 bg-slate-950/30">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Buat Jadwal</h2>
                  <p className="text-slate-400 text-sm mt-1">Buat jadwal full seminggu dengan mudah.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:bg-slate-800 rounded-full h-8 w-8 -mt-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/30">
              <form id="bulkForm" onSubmit={handleSaveBulk}>

                <div className="p-4 sm:p-6 pb-4">
                  {/* Semester Name */}
                  <div className="mb-4 bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl">
                    <label className="block text-sm font-bold text-slate-300 mb-2">Nama Grup Jadwal (Contoh: Semester 6)</label>
                    <input
                      type="text" required value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-white font-bold text-lg placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="Semester Ganjil 2024..."
                    />
                  </div>

                  {/* Day Selection Tabs */}
                  <div className="mt-6">
                    <label className="block text-sm font-bold text-slate-300 mb-3">Pilih Hari Pembagian Jadwal</label>
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
                      {DAYS.map(d => {
                        const count = bulkData[d.value].length;
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setActiveDay(d.value)}
                            className={`snap-start flex-shrink-0 flex items-center gap-2 py-2.5 px-4 text-sm font-bold rounded-xl transition-all border ${activeDay === d.value
                              ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                              }`}
                          >
                            {d.label}
                            {count > 0 && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeDay === d.value ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-800/50"></div>

                <div className="p-4 sm:p-6 space-y-4">
                  {/* Rows for Active Day */}
                  {activeRows.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/50">
                      <p className="text-slate-400 text-sm font-medium">Belum ada jadwal di hari {DAYS.find(d => d.value === activeDay)?.label}.</p>
                    </div>
                  ) : (
                    activeRows.map((row, index) => (
                      <div key={row.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 relative group animate-in slide-in-from-bottom-2 fade-in">
                        <div className="absolute -top-3 left-4 bg-slate-800 text-xs font-bold px-2 py-0.5 rounded text-slate-300">
                          Slot {index + 1}
                        </div>
                        <button type="button" onClick={() => removeBulkRow(row.id)} className="absolute -top-3 -right-2 bg-slate-950 border border-slate-700 text-red-400 hover:text-white hover:bg-red-500 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-all shadow-md">
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</label>
                            <select
                              value={row.subjectId}
                              onChange={(e) => updateBulkRow(row.id, "subjectId", e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-sm"
                            >
                              <option value="NEW">✨ Matkul Baru...</option>
                              <optgroup label="Daftar Wadah Anda:">
                                {availableSubjects.map(sub => (
                                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                              </optgroup>
                            </select>

                            {row.subjectId === "NEW" && (
                              <div className="space-y-2 mt-2 pt-2 border-t border-slate-800">
                                <input
                                  type="text" required value={row.title}
                                  onChange={(e) => updateBulkRow(row.id, "title", e.target.value)}
                                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-sm placeholder-slate-500 max-h-12"
                                  placeholder="Nama Mata Pelajaran"
                                />
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2 rounded-xl border border-slate-800">
                                  <input
                                    type="checkbox" checked={row.createSubject}
                                    onChange={(e) => updateBulkRow(row.id, "createSubject", e.target.checked)}
                                    className="rounded bg-slate-900 border-slate-700 text-indigo-500 h-4 w-4"
                                  />
                                  <span className="text-[11px] font-medium text-slate-400">Buat wadah PDF otomatis</span>
                                </label>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rentang Waktu</label>
                            <div className="flex gap-2 items-center">
                              <div className="flex-1">
                                <input
                                  type="time" required value={row.startTime}
                                  onChange={(e) => updateBulkRow(row.id, "startTime", e.target.value)}
                                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-sm [color-scheme:dark]"
                                />
                              </div>
                              <span className="text-slate-500 font-bold">-</span>
                              <div className="flex-1">
                                <input
                                  type="time" required value={row.endTime}
                                  onChange={(e) => updateBulkRow(row.id, "endTime", e.target.value)}
                                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-sm [color-scheme:dark]"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  <Button type="button" variant="outline" onClick={addBulkRow} className="w-full mt-4 border-dashed border-slate-700 text-slate-400 hover:text-white bg-transparent hover:bg-slate-800/50 rounded-2xl h-14">
                    <Plus className="w-5 h-5 mr-2" /> Tambah Slot Jadwal di Hari {DAYS.find(d => d.value === activeDay)?.label}
                  </Button>
                </div>
              </form>
            </CardContent>

            <CardFooter className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900 flex-shrink-0">
              <div className="flex w-full gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowBulkModal(false)} className="flex-1 hidden sm:flex h-12 rounded-xl">Batal</Button>
                <Button form="bulkForm" type="submit" disabled={saving || !groupName || getTotalSchedulesCount() === 0} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50 text-base">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Simpan Semester (${getTotalSchedulesCount()} Jadwal)`}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
