# 📚 AI Learning Workspace

**Ubah materi PDF pasif Anda menjadi ruang belajar interaktif bertenaga AI.**

AI Learning Workspace adalah platform yang memungkinkan pengguna mengunggah dokumen pembelajaran berformat PDF, mengekstrak teksnya, dan secara otomatis menghasilkan ringkasan terstruktur serta wawasan pembelajaran menggunakan kecerdasan buatan (Google Gemini API).

---

## ✨ Fitur Utama

- **Pemrosesan PDF Pintar**: Unggah dokumen PDF (maksimal 5MB) untuk diekstrak teks dan kontennya secara otomatis.
- **Ringkasan Bertenaga AI**: Menghasilkan poin-poin ringkasan pembelajaran yang terstruktur dan dikelompokkan berdasarkan topik materi.
- **Arsitektur Asinkron (Async Job Queue)**: Mendukung pemrosesan dokumen berat di latar belakang tanpa memberatkan sisi antarmuka, dilengkapi dengan status *polling* secara *real-time*.
- **Manajemen Ruang Belajar (Workspace)**: Melacak status pembelajaran (Belum Dimulai, Sedang Dipelajari, Dikuasai) dan histori skor terbaik Anda.
- **Antarmuka Modern & Responsif**: Dibangun dengan desain *dark theme* berbasis Tailwind CSS yang menyertakan animasi yang halus.
- **Autentikasi Aman**: Didukung penuh oleh Supabase Auth untuk perlindungan data pengguna dan privasi berkas.

> **Catatan:** Fitur Kuis / Simulasi Ujian interaktif saat ini sedang dalam tahap pengembangan (*Coming Soon*) di sisi layanan AI backend. Antarmuka kuis sudah disiapkan.

---

## 🏗️ Arsitektur Sistem

Proyek ini menggunakan arsitektur *microservice* yang memisahkan antara pengembangan antarmuka (Frontend) dan pemrosesan AI yang intensif (Backend):

1. **Frontend (Next.js)**: Menangani antarmuka pengguna, autentikasi dengan Supabase, penyimpanan ke *database*, dan *upload file* berukuran kecil.
2. **Backend (FastAPI)**: Layanan terpisah berbasis Python yang bertugas khusus menerima instruksi dari Frontend, memproses teks PDF, dan berkomunikasi dengan Google Gemini API menggunakan antrian asinkron (*Job Queue*).
3. **Database & Storage (Supabase)**: Pusat penyimpanan metadata ruang belajar (PostgreSQL) dan berkas mentah PDF (Supabase Storage).

---

## 🚀 Teknologi yang Digunakan

**Sisi Klien (Frontend - Proyek ini):**
- **Framework**: Next.js 16 (App Router) + React 19
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database & Auth**: Supabase SDK (`@supabase/ssr`, `@supabase/supabase-js`)

**Sisi Pemrosesan AI (Backend API Terpisah):**
- **Framework**: FastAPI (Python)
- **AI Engine**: Google Gemini API (`gemini-2.5-flash`)

---

## ⚙️ Persyaratan Sistem

Sebelum menjalankan proyek ini, pastikan Anda telah memiliki:
- Node.js versi 18 atau lebih baru.
- Layanan IDE atau Backend Python FastAPI siap untuk dijalankan.
- Akun Supabase yang aktif (URL proyek dan parameter Anon Key disediakan).

---

## 🛠️ Cara Instalasi & Menjalankan

### 1. Persiapan Database Supabase
Proyek ini mengandalkan skema PostgreSQL dan Storage dari Supabase.
Salin perintah SQL dari dalam berkas `SUPABASE_SCHEMA.md` dan jalankan pada menu **SQL Editor** di Dasbor Supabase Anda. Hal ini akan menyiapkan seluruh tabel, kebijakan akses *Row Level Security* (RLS), serta wadah (*bucket*) untuk berkas PDF.

### 2. Konfigurasi Environment Variables
Buat berkas `.env.local` pada direktor *root* repositori ini, dan sesuaikan rincian berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=url_proyek_supabase_anda
NEXT_PUBLIC_SUPABASE_ANON_KEY=kunci_anon_supabase_anda
FASTAPI_URL=http://127.0.0.1:8000
```

### 3. Menjalankan Layanan Backend AI (FastAPI)
Frontend ini harus berkomunikasi dengan Backend AI. Pastikan layanan Python FastAPI Anda (*yang telah dibuat terpisah*) telah berjalan:
```bash
# Jalankan FastAPI di port 8000
uvicorn main:app --reload --port 8000
```

### 4. Menjalankan Layanan Frontend (Next.js)
Buka terminal pada *root* target dari *repository* ini lalu jalankan proses berikut:
```bash
# Menginstal seluruh dependensi modul
npm install

# Menjalankan server tahap pengembangan
npm run dev
```
Setelah proses selesai, akses aplikasi Anda lewat *browser* pada tautan: **[http://localhost:3000](http://localhost:3000)**

---

## 📖 Panduan Penggunaan Halaman

1. **Autentikasi (Masuk / Daftar)**: Silakan mendaftarkan akun gres Anda ataupun *login* jika sudah punya.
2. **Buat Ruang Belajar Baru**: Pada tampilan Dasbor (Dashboard) utama, tekan tombol buat (`+` yang mengambang).
3. **Proses Unggahan**: Masukkan judul pembelajaran dari bahan studi, lampirkan berkas yang dituju (*File* PDF, skala maksimal 5MB).
4. **Pantau AI Bekerja**: Model *FastAPI Asynchronous* akan memproses hasil (*polling* status secara *real-time*). Anda dapat melihat pesan "Mengekstrak konsep inti...".
5. **Mode Belajar Inti**: Apabila berhasil, masuk ke detail (*Study Mode*). AI menyediakan ringkasan terperinci pada setiap struktur poin modul di dalam PDF tersebut yang telah diperkaya dengan Feedback dan Rangkuman.

---

## 📄 Lisensi

Berlisensi MIT (MIT License) - Anda dibebaskan untuk memperbanyak, memodifikasi, maupun meluncurkannya kembali untuk proyek komersil sekalipun.

---

*Dibuat untuk mempermudah pengalaman dan merevolusi gaya belajar mandiri yang cerdas.*
