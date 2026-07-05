# PRD: Netma — Web Interface untuk Opencode

## 1. Ringkasan
Membangun web interface sebagai frontend untuk opencode yang berjalan di server (VPS/LXC Proxmox). User bisa memberikan perintah melalui website, dan opencode akan mengeksekusi perintah tersebut (membuat project, memanipulasi file, dll) sama persis seperti menggunakan opencode CLI, dengan output yang ditampilkan secara real-time dan mudah dibaca di browser.

## 2. Arsitektur

```
[Browser User] ──HTTP/SSE──> [Express :3000] ──HTTP──> [opencode serve :4096]
                │              │                            │
           Next.js UI    Serve static                  [LXC Proxmox]
           (browser)     (from .next/)                 [File System]
                                                       [Git, Shell, Tools]
```

### Komponen:
- **Express Server (:3000)**: Backend yang serve static frontend (hasil build Next.js) + proxy API ke opencode. `OPENCODE_PASSWORD` aman di server.
- **Opencode Server (:4096)**: `opencode serve --hostname 0.0.0.0 --port 4096` (headless, tanpa TUI)
- **LXC/Proxmox**: Tempat opencode dan file system berjalan

**Alur build & deploy:**
```
Next.js (dev) → next build → static files → Express serve
                                ↓
                          .next/ + public/

## 3. Cara Kerja

1. User buka website (di-serve oleh Express)
2. User ngetik perintah
3. Frontend panggil API Express (bukan langsung ke opencode)
4. Express forward request ke opencode server dengan basic auth
5. Opencode proses pake LLM + tools
6. Progress real-time dikirim lewat SSE (Express proxy dari opencode)
7. Hasil ditampilkan di browser

## 4. API Endpoint yang Digunakan (dari opencode serve)

| Endpoint | Kegunaan |
|---|---|
| `POST /session` | Buat session baru |
| `POST /session/:id/message` | Kirim prompt ke AI |
| `POST /session/:id/prompt_async` | Kirim prompt async (tanpa nunggu) |
| `GET /event` | SSE stream untuk realtime feedback |
| `GET /session/:id/message` | List pesan dalam session |
| `GET /session` | List semua session |
| `GET /file?path=` | List file/directory |
| `GET /file/content?path=` | Baca isi file |
| `GET /find?pattern=` | Search konten file |
| `GET /find/file?query=` | Cari file by name |
| `POST /session/:id/shell` | Execute shell command |
| `POST /session/:id/abort` | Batalkan session yang running |
| `GET /project` | List projects |
| `GET /agent` | List available agents |

## 5. Fitur Frontend

### Halaman Utama (Chat Interface)
- Input text untuk mengetik perintah (mirip prompt opencode CLI)
- Riwayat percakapan per session
- Streaming output real-time
- Syntax highlighting untuk kode
- Diff viewer untuk perubahan file
- File tree viewer
- Terminal output viewer

### Session Management
- List session (aktif & history)
- Buat session baru
- Fork session
- Hapus session
- Judul session otomatis / bisa diedit

### File Explorer
- Navigasi file system
- Preview file
- Diff perubahan

### Agent & Model Selector
- Pilih agent (default, custom)
- Pilih model provider

## 6. Alur User

1. User buka website
2. Memilih agent/model (opsional)
3. Mengetik perintah: "Buat project React dengan routing"
4. Opencode mengeksekusi: bikin folder, init npm, install deps, bikin file-file
5. Progress muncul real-time di chat
6. Hasil final: daftar file yang dibuat, struktur project
7. User bisa lihat file tree, baca file yang dibuat
8. User bisa lanjut chat: "Tambahin komponen Navbar"

## 7. Teknologi

### Backend
- **Express.js** — serve frontend statis + proxy API ke opencode
- Node.js, TypeScript

### Frontend (Next.js static build, di-serve oleh Express)
- **Next.js** (static export) — sebagai framework React
- **Tailwind CSS** — styling
- **Zustand** — state management client-side (session aktif, UI state, connection status, messages)
- **TanStack Query (React Query)** — data fetching & caching (list sessions, file tree, data non-realtime)

### Server
- LXC container di Proxmox
- opencode (headless server mode: `opencode serve`)
- Environment: Linux (Ubuntu/Debian)

## 8. Security

- `OPENCODE_PASSWORD` dan `OPENCODE_URL` disimpan di `.env` Express server
- Credential **tidak pernah bocor ke browser** (semua request lewat Express)
- Express bisa ditambah basic auth sendiri untuk proteksi akses website

## 9. Keunggulan Dibandingkan opencode Web Bawaan

- UI/UX bisa dikustomisasi penuh
- Bisa ditambahkan fitur spesifik (project templates, dashboard, dll)
- Integrasi dengan sistem lain

## 10. Contoh Alur Teknis (Realtime via SSE)

```
User: "Buat project express dengan struktur folder src/, routes/"

Frontend -> POST /session
       <- { id: "sess_123" }

Frontend -> POST /session/sess_123/prompt_async
            { parts: [{ type: "text", text: "..." }] }
       <- 204 (langsung balik)

Frontend -> GET /event (SSE stream buka koneksi)

Server kirim event realtime:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
event: tool/start
data: { tool: "shell", command: "mkdir -p backend/src backend/routes" }

event: tool/result
data: { tool: "shell", status: "success", output: "" }

event: tool/start
data: { tool: "write", path: "backend/src/index.js" }

event: tool/result
data: { tool: "write", path: "backend/src/index.js", status: "success" }

event: message/part
data: { type: "text", text: "✅ Project berhasil dibuat. Struktur:\n- src/index.js\n- routes/api.js\n- controllers/" }

event: message/done
data: { messageID: "msg_456" }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend render REAL-TIME:
  - [mkdir] 🟡 lagi bikin folder backend/src...
  - [mkdir] ✅ selesai
  - [write] 🟡 lagi nulis backend/src/index.js...
  - [write] ✅ selesai
  - 💬 "Project berhasil dibuat"
  - Tampilin struktur folder
  - Update file tree
```
