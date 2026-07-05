# PRD: Netma — Dashboard Manajemen AI Karyawan (Opencode)

## 1. Ringkasan
Dashboard berbasis web untuk mengelola AI Karyawan yang didukung oleh opencode. Bos bisa menambahkan karyawan AI dengan pangkat, nama, dan job desc, menyalakan/mematikan mereka, serta ngobrol langsung dengan tiap karyawan secara real-time.

## 2. Konsep

```
[Bos] → Next.js Dashboard
              │
        [Express API Server]
              │
    ┌─────────┼────────────┐
    │         │            │
[A:5001]  [B:5002]    [C:5003]
opencode  opencode    opencode
   ON        OFF         ON
```

Setiap **AI Karyawan**:
- Punya **nama, pangkat, job desc** → dijadikan system prompt di opencode
- Saat **ON** → `opencode serve` jalan di port dedicated
- Saat **OFF** → proses dihentikan
- Bisa diajak **chat real-time** oleh Bos
- Mengerjakan tugas sesuai deskripsi kerjanya

## 3. Arsitektur

```
[Browser] ──HTTP/SSE──> [Next.js (Frontend)] ──HTTP──> [Express API Server] ──HTTP──> [opencode serve :5001]
                                                              │                        [opencode serve :5002]
                                                              │                        [opencode serve :5003]
                                                              │                               │
                                                         [Manager Proses]              [LXC Proxmox]
                                                         (start/stop)                 [File System]
```

### Komponen:
- **Next.js**: Frontend dashboard + chat interface
- **Express API Server**: Backend yang handle CRUD karyawan, manage proses opencode, proxy chat
- **Opencode Serve**: Satu instance per karyawan, masing-masing di port berbeda (5001, 5002, ...)
- **LXC/Proxmox**: Tempat semua proses berjalan

## 4. Fitur

### Dashboard
- Kartu setiap AI Karyawan (nama, pangkat, status ON/OFF, jam kerja)
- Total karyawan aktif
- Riwayat chat terbaru tiap karyawan

### Manajemen Karyawan (CRUD)
| Field | Keterangan |
|---|---|
| Nama | Nama panggilan AI |
| Pangkat | Junior, Senior, Lead, Manager, dll |
| Job Desc | Deskripsi pekerjaan. Dibaca AI sebagai system prompt |
| Port | Port opencode serve (otomatis/assign) |
| Status | ON/OFF |

### Chat Real-time
- Pilih karyawan → buka chat
- Kirim prompt → diteruskan ke opencode karyawan tersebut
- Response real-time via SSE

### Control ON/OFF
- **ON**: Express `child_process.spawn` → `opencode serve --port XXXX` dengan config khusus sesuai job desc
- **OFF**: `kill` proses opencode sesuai port

## 5. Cara Kerja Chat

```
Bos: "Buatkan laporan bulanan"

1. Dashboard → POST /api/chat/{karyawanId}
2. Express forward ke opencode :500X
   dengan parts: [{ type: "text", text: prompt }]
3. Opencode proses sesuai job desc + system prompt
4. Response + SSE stream balik ke Bos
5. Dashboard render real-time
```

## 6. Data Model

```json
{
  "id": "emp_001",
  "name": "Alex",
  "rank": "Senior Developer",
  "jobDesc": "Bertanggung jawab mengembangkan fitur backend menggunakan Node.js dan TypeScript",
  "port": 5001,
  "status": "online",
  "workStart": "08:00",
  "workEnd": "17:00",
  "createdAt": "..."
}
```

System prompt yang dikirim ke opencode tiap kali chat:
```
Kamu adalah {name}, seorang {rank}.
Deskripsi pekerjaan: {jobDesc}
Jam kerja: {workStart} - {workEnd}
Kamu adalah AI asisten yang membantu Bos mengerjakan tugas-tugas.
```

## 7. Teknologi

### Backend
- **Express.js** — API server + manajemen proses opencode
- Node.js, TypeScript
- `child_process` untuk start/stop opencode

### Frontend
- **Next.js** (static export, di-serve Express)
- **Tailwind CSS**
- **Zustand** — state management (daftar karyawan, status, chat aktif)
- **TanStack Query** — fetching data karyawan

### Server
- LXC container di Proxmox
- `opencode` binary (Go) — satu per karyawan
- Environment: Linux (Ubuntu/Debian)

## 8. API Endpoints

### Karyawan
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/employees | List semua karyawan |
| POST | /api/employees | Tambah karyawan |
| PUT | /api/employees/:id | Edit karyawan |
| DELETE | /api/employees/:id | Hapus karyawan |
| POST | /api/employees/:id/turn-on | Nyalakan opencode |
| POST | /api/employees/:id/turn-off | Matikan opencode |

### Chat
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/chat/:id | Kirim prompt ke karyawan |
| GET | /api/chat/:id/event | SSE stream real-time |
| GET | /api/chat/:id/history | Riwayat chat |

## 9. Alur Start/Stop Opencode

### Manajemen Port Otomatis
- Range port: **21000 - 21999** (5 digit, aman dari bentrok service umum)
- Saat tambah karyawan → assign port pertama yang available dari range
- Saat **Turn ON** → cek apakah port masih free, jika tidak → cari port baru
- Saat **Turn OFF** → port kembali ke pool

**Turn ON:**
```bash
# Express cek port available dulu
lsof -i :{port} || echo "port free"

# Lalu start opencode
opencode serve --port {port} --hostname 127.0.0.1

# Simpan PID, set status = online
```

**Turn OFF:**
```bash
kill {PID}
# Set status = offline, port dikembalikan ke pool
```

### Konfigurasi Per Karyawan
Setiap karyawan punya file config opencode sendiri (`config_{id}.json`) yang berisi model, system prompt, dan tools sesuai job desc. Express membuat file ini saat pertama kali Turn ON.

### Keamanan
- Password opencode dibedakan tiap karyawan atau pake password bawaan server
- Cuma Express yang tahu port dan credential tiap karyawan
- Dashboard bos harus login dulu

## 10. Contoh Alur

```
Bos buka dashboard → lihat 3 karyawan:
  [🟢 Alex - Senior Dev]  [🔴 Budi - Junior]  [🟢 Citra - Designer]

Bos klik "Turn ON" Budi → Express start opencode :5002 → status ON

Bos klik Alex → buka chat:
  Bos: "Buat endpoint API untuk login"
  Alex (via opencode :5001):
    - nulis file routes/auth.js
    - nulis file controllers/authController.js
    - install bcrypt
    - response: "✅ Endpoint login selesai dibuat"
  Bos lihat progress real-time di chat

Bos matiin Budi → Express kill process :5002 → status OFF
```
