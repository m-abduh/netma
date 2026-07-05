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
- **Struktur Organisasi (React Flow)** — visualisasi pohon hirarki:
  ```
           [Bos]
         ┌──┼──┐
         │  │  │
    [Manager] [Lead]
         │
    [Senior] [Senior]
         │
      [Junior]
  ```
  - Drag & Zoom
  - Node warna beda sesuai pangkat
  - Status ON/OFF terlihat di node
  - Klik node → buka chat/profile
  - Karyawan bisa di-drag reposition
  - **Sambungan node disimpan di database**

### Boss
- Bos juga seorang AI Karyawan seperti lainnya
- Punya profil: nama, pangkat ("Boss"), job desc
- Bisa ON/OFF, punya opencode serve sendiri
- Bisa di-chat & dikasih prompt seperti karyawan lain
- Job desc: "Mengawasi dan mengelola seluruh AI Karyawan"
- Di struktur organisasi, Bos di node paling atas

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

### Broadcast
- Kirim 1 prompt ke semua karyawan yang ON sekaligus
- Cocok buat: "Semua buat laporan hari ini", "Ada meeting", dll
- Hasil tiap karyawan tampil terpisah di dashboard

### File Manager
- Lihat file-file yang dibuat/diedit tiap karyawan langsung dari dashboard
- Tree view per karyawan
- Preview isi file
- Download file

### Audit Log
- Catat semua aktivitas:
  | Aktor | Aksi | Contoh |
  |---|---|---|
  | System | Job trigger | "Laporan Pagi" → Alex ✅ |
  | System | Job error | "Bulanan" gagal - timeout |
  | Bos | Chat | Kirim prompt ke Alex |
  | Karyawan (AI) | File created | routes/auth.js |
  | Karyawan (AI) | Tool used | shell: npm install |
  | Bos | Turn ON/OFF | Budi → OFF |
  | Bos | CRUD | Tambah karyawan Citra |
  | Bos | Edit job | Jadwal diubah ke 09:00 |
- Tampilan: tabel dengan filter (tanggal, aktor, jenis aksi)
- Berguna buat monitoring, troubleshooting, evaluasi kinerja AI

### Notifikasi
- **Telegram Bot** — notifikasi pas job selesai/gagal, atau karyawan error
- **Dashboard badge** — notifikasi real-time di pojok layar
- Bisa di-custom tiap notifikasi mau dikirim ke mana

### Kanban Board
- Papan Kanban untuk tracking tugas semua AI Karyawan
- **Default columns**: Backlog → To Do → In Progress → Review → Done
- **Columns bisa di-custom** (tambah, edit, hapus, urutkan)
- Setiap task punya:
  - Judul, deskripsi
  - Assignee (AI Karyawan)
  - Priority (Low/Medium/High/Urgent)
  - Column posisi
  - Deadline (opsional)
  - Created from: chat prompt / manual / auto dari job
- **Drag & drop** antar column
- Filter by karyawan, priority, date

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

### Karyawan
```json
{
  "id": "emp_001",
  "name": "Alex",
  "rank": "Senior Developer",
  "jobDesc": "Bertanggung jawab mengembangkan fitur backend menggunakan Node.js dan TypeScript",
  "port": 21001,
  "status": "online",
  "workStart": "08:00",
  "workEnd": "17:00",
  "positionX": 0,
  "positionY": 0,
  "createdAt": "..."
}
```

### Sambungan Node
```json
{
  "id": "edge_001",
  "from": "emp_boss",
  "to": "emp_001"
}
```

Data sambungan disimpan di database. React Flow bakal load & render sesuai data ini. User bebas drag & sambungkan manual. 

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
- **Prisma + SQLite** — database (portable, bisa ganti ke PostgreSQL kapan aja)
- `child_process` untuk start/stop opencode
- `node-cron` untuk scheduler daily job

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

### Daily Jobs
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/jobs | List semua job |
| POST | /api/jobs | Tambah job baru |
| PUT | /api/jobs/:id | Edit job |
| DELETE | /api/jobs/:id | Hapus job |
| POST | /api/jobs/:id/run-now | Jalankan job manual |

### Broadcast
| Method | Endpoint | Fungsi |
|---|---|---|
| POST | /api/broadcast | Kirim prompt ke semua karyawan ON |

### Audit Log
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/logs | List log (filter: date, actor, action) |

### Files
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/employees/:id/files | List file milik karyawan |
| GET | /api/employees/:id/files/read | Preview isi file |

### Kanban
| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/kanban/columns | List columns |
| POST | /api/kanban/columns | Tambah column |
| PUT | /api/kanban/columns/:id | Edit column |
| DELETE | /api/kanban/columns/:id | Hapus column |
| GET | /api/kanban/tasks | List tasks |
| POST | /api/kanban/tasks | Tambah task |
| PUT | /api/kanban/tasks/:id | Edit task (pindah column, dll) |
| DELETE | /api/kanban/tasks/:id | Hapus task |

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

## 10. Daily Job (Cron Job)

Job adalah tugas otomatis terjadwal buat AI Karyawan. Semua bisa di-custom lewat dashboard.

### Konsep
```
Bos tentuin lewat dashboard:
  Karyawan  : Alex
  Nama Job  : "Laporan Pagi"
  Jadwal    : Setiap jam 08:00
  Prompt    : "Buat laporan progress kemarin"
  Status    : Aktif

                  ↓ Jam 08:00 trigger
          Express (node-cron)
                  ↓
          Opencode Alex (prompt dikirim)
                  ↓
          Hasil disimpan → Bos lihat di dashboard
```

### Tipe Jadwal
| Tipe | Contoh | Cron |
|---|---|---|
| Daily | Tiap jam 08:00 | `0 8 * * *` |
| Hourly | Tiap 3 jam | `0 */3 * * *` |
| Weekly | Tiap Senin 09:00 | `0 9 * * 1` |
| One-time | 25 Des 00:00 | jadwal sekali |
| Custom | Bebas | ekspresi cron bebas |

### Data Model
```json
{
  "id": "job_001",
  "employeeId": "emp_001",
  "name": "Laporan Pagi",
  "schedule": "0 8 * * *",
  "prompt": "Buat laporan progress project kemarin",
  "status": "active",
  "lastRun": "2026-07-04T08:00:00Z",
  "lastResult": "success",
  "lastOutput": "Laporan berhasil dibuat...",
  "createdAt": "..."
}
```

### Cara Kerja
1. Express pake `node-cron` sebagai scheduler
2. Jadwal trigger → Express cek apakah karyawan ON
3. Jika ON → kirim prompt ke opencode karyawan
4. Hasil (sukses/gagal + output) disimpan ke SQLite
5. Dashboard tampilkan: daftar job, log eksekusi, tombol run-now

### Custom
- Tambah/edit/hapus job dari dashboard (form simpel)
- **Run Now** — jalanin job kapan aja manual
- **Aktif/nonaktifkan** job tanpa hapus
- **Log history** — lihat hasil eksekusi sebelumnya

## 11. Contoh Alur

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
