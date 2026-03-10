
# Frontend Integration Guide

> **Last updated:** 2026-03-10 — v2.1.0 (breaking changes dari v2.0)

---

## Breaking Changes dari Versi Sebelumnya

| Perubahan | Sebelum (v2.0) | Sekarang (v2.1) |
|---|---|---|
| `progress` | `string` (teks pesan) | `int` (0–100 persentase) |
| `message` | tidak ada | `string` (teks progress) |
| `corrected_text` | `string` (seluruh teks koreksi) | **DIHAPUS** |
| `summary` | `string` (satu blok teks) | `string[]` (array paragraf) |
| `key_concepts` | tidak ada | `string[]` (konsep penting) |

**Yang perlu diubah di frontend:**
1. Ganti akses `data.progress` (string) → `data.progress` (number) dan `data.message` (string)
2. Hapus semua referensi ke `result.corrected_text`
3. `result.summary` sekarang array — render per item, bukan satu blok teks
4. Tambah UI untuk `result.key_concepts` (opsional, array bisa kosong)

---

## API Endpoints

### 1. Upload PDF

```
POST /api/pdf/upload
Content-Type: multipart/form-data
```

**Request:**
```
file: [PDF file] (max 5MB)
```

**Response (200):**
```json
{
  "job_id": "a55df9c0-ce1a-443f-ab1c-64022c4727a6",
  "status": "pending",
  "message": "PDF diterima, sedang diproses. Gunakan GET /api/pdf/status/{job_id} untuk cek status."
}
```

**Error (400):**
```json
{
  "detail": "File terlalu besar. Maksimum 5MB, file Anda 7.2MB."
}
```

---

### 2. Cek Status / Ambil Hasil

```
GET /api/pdf/status/{job_id}
```

**Response — Pending (baru dibuat):**
```json
{
  "job_id": "a55df9c0-...",
  "status": "pending",
  "progress": 0,
  "message": "Job created, waiting to start...",
  "result": null,
  "error": null,
  "cached": false
}
```

**Response — Processing:**
```json
{
  "job_id": "a55df9c0-...",
  "status": "processing",
  "progress": 50,
  "message": "Menganalisis dokumen dengan Gemini AI...",
  "result": null,
  "error": null,
  "cached": false
}
```

**Response — Completed:**
```json
{
  "job_id": "a55df9c0-...",
  "status": "completed",
  "progress": 100,
  "message": "Analisis selesai!",
  "result": {
    "language": "Indonesian",
    "summary": [
      "Materi ini membahas konsep dasar cloud computing dan definisinya.",
      "Cloud computing menyediakan layanan komputasi melalui internet seperti server, penyimpanan, dan database.",
      "Terdapat tiga model layanan utama: IaaS, PaaS, dan SaaS yang masing-masing memiliki karakteristik berbeda."
    ],
    "learning_feedback": [
      "Pahami perbedaan antara IaaS, PaaS, dan SaaS karena ini merupakan konsep fundamental.",
      "Pelajari kelebihan dan kekurangan cloud computing untuk memahami kapan teknologi ini tepat digunakan.",
      "Fokus pada model deployment cloud (public, private, hybrid) dan kapan masing-masing digunakan."
    ],
    "key_concepts": [
      "Cloud Computing",
      "IaaS (Infrastructure as a Service)",
      "PaaS (Platform as a Service)",
      "SaaS (Software as a Service)",
      "Virtualisasi",
      "Public Cloud",
      "Private Cloud"
    ],
    "total_pages": 15
  },
  "error": null,
  "cached": false
}
```

**Response — Failed:**
```json
{
  "job_id": "a55df9c0-...",
  "status": "failed",
  "progress": 100,
  "message": "Gagal",
  "result": null,
  "error": "Tidak dapat mengekstrak teks dari PDF. PDF mungkin berisi gambar/scan tanpa teks.",
  "cached": false
}
```

**Response — Cached (PDF sama diupload ulang):**
```json
{
  "job_id": "...",
  "status": "completed",
  "progress": 100,
  "message": "Selesai (dari cache)",
  "result": { "..." : "..." },
  "cached": true
}
```

---

## Status Flow

```
pending (0%) → processing (25% → 50%) → completed (100%)
                                       → failed (100%)
```

| Status | Progress | Arti | `result` | `error` |
|---|---|---|---|---|
| `pending` | `0` | Baru dibuat, menunggu | `null` | `null` |
| `processing` | `25` | Mengekstrak teks PDF | `null` | `null` |
| `processing` | `50` | Menganalisis dengan AI | `null` | `null` |
| `completed` | `100` | Selesai | Ada | `null` |
| `failed` | `100` | Gagal | `null` | Ada |

---

## Contoh Integrasi Frontend (JavaScript)

```javascript
async function analyzePDF(file) {
  // 1. Upload PDF
  const formData = new FormData();
  formData.append("file", file);

  const uploadRes = await fetch("http://localhost:8000/api/pdf/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.detail);
  }

  const { job_id } = await uploadRes.json();

  // 2. Poll status setiap 2 detik
  const MAX_POLLS = 60; // timeout setelah 120 detik
  for (let i = 0; i < MAX_POLLS; i++) {
    const statusRes = await fetch(
      `http://localhost:8000/api/pdf/status/${job_id}`
    );
    const data = await statusRes.json();

    // Update progress bar
    console.log(`[${data.progress}%] ${data.message}`);

    if (data.status === "completed") {
      return data.result;
      // result = { language, summary[], learning_feedback[], key_concepts[], total_pages }
    }

    if (data.status === "failed") {
      throw new Error(data.error);
    }

    // Tunggu 2 detik sebelum poll lagi
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Timeout: analisis terlalu lama.");
}
```

### Contoh render hasil:

```javascript
function renderResult(result) {
  // Summary — render tiap paragraf
  const summaryHTML = result.summary
    .map((p) => `<p>${p}</p>`)
    .join("");

  // Learning feedback — render sebagai list
  const feedbackHTML = result.learning_feedback
    .map((f) => `<li>${f}</li>`)
    .join("");

  // Key concepts — render sebagai tags/badges
  const conceptsHTML = result.key_concepts
    .map((c) => `<span class="badge">${c}</span>`)
    .join(" ");

  document.getElementById("result").innerHTML = `
    <div class="meta">
      <span>Bahasa: ${result.language}</span>
      <span>Halaman: ${result.total_pages}</span>
    </div>
    <h3>Ringkasan</h3>
    <div class="summary">${summaryHTML}</div>
    <h3>Saran Belajar</h3>
    <ul class="feedback">${feedbackHTML}</ul>
    <h3>Konsep Penting</h3>
    <div class="concepts">${conceptsHTML}</div>
  `;
}
```

---

## Validasi Frontend

| Validasi | Detail |
|---|---|
| File type | Hanya `.pdf` |
| File size | Max **5MB** (cek sebelum upload) |
| Polling interval | **2 detik** (jangan lebih cepat) |
| Timeout | **120 detik** (60 polls × 2 detik) |
| Progress bar | Gunakan `progress` (0–100) untuk width |
| Loading text | Gunakan `message` untuk teks status |

---

## TypeScript Types

```typescript
// POST /api/pdf/upload response
interface JobResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  message: string;
}

// GET /api/pdf/status/{job_id} response
interface JobStatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0–100
  message: string;
  result: PDFAnalysisResponse | null;
  error: string | null;
  cached: boolean;
}

// Hasil analisis AI
interface PDFAnalysisResponse {
  language: string;
  summary: string[];
  learning_feedback: string[];
  key_concepts: string[];
  total_pages: number;
}
```
