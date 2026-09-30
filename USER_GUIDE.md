# Panduan Pengguna: Cyaneum NCM — Network Configuration Management

> Dashboard fullstack untuk manajemen backup konfigurasi multi-vendor (MikroTik, Cisco, Huawei, Juniper, TP-Link Omada, Ruijie) dengan penjadwalan otomatis, audit trail, dan notifikasi Telegram.

---

## Daftar Isi
1. [Arsitektur & Fitur](#1-arsitektur--fitur)
2. [Prasyarat](#2-prasyarat)
3. [Konfigurasi Environment](#3-konfigurasi-environment-env)
4. [Instalasi & Menjalankan — Windows](#4-instalasi--menjalankan--windows-powershell)
5. [Instalasi & Menjalankan — Linux (Ubuntu/Debian)](#5-instalasi--menjalankan--linux-ubuntudebian)
6. [Instalasi & Menjalankan — Docker (Rekomendasi)](#6-instalasi--menjalankan--docker-rekomendasi)
7. [Autentikasi & RBAC](#7-autentikasi--rbac)
8. [Penggunaan Dashboard](#8-penggunaan-dashboard)
9. [Referensi API](#9-referensi-api)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Arsitektur & Fitur

```
Browser (React Vite :5173)  ──►  FastAPI :8000  ──►  PostgreSQL :5432
                                   │  ├─ Celery Worker (Netmiko SSH → .rsc/.cfg)
                                   │  └─ Celery Beat (croniter, cek tiap 60s)
                                   └──►  Redis :6379 (broker) + Telegram Bot
```

**Fitur utama:**
- **Dashboard Cyaneum** — statistik, pie chart sukses/gagal, search/filter, auto-refresh 10s.
- **CRUD Perangkat** — Tambah/Edit/Hapus (RBAC admin-only), validasi IP duplikat, enkripsi password.
- **Jadwal Backup** — Time Picker WIB → cron `m H * * *` (default `0 2 * * *`), tahan `CroniterBadCronError`.
- **Eksekusi Backup** — trigger per-device, **Backup Semua** (paralel), log ke `BackupLog`.
- **Multi-Vendor Worker** — driver Netmiko: `mikrotik_routeros`, `cisco_ios`, `huawei_vrp`, `juniper_junos`, `tplink_jetstream`, `ruijie_os` + `autodetect`, file `.rsc/.cfg/.conf`.
- **Viewer & Diff** — modal terminal gelap untuk `.rsc`, download blob, compare side-by-side 2 versi.
- **Riwayat & Retensi** — tabel riwayat, `DELETE /backups/{id}` hapus file fisik, auto-cleanup >3 hari tiap `GET /backups`.
- **Telegram** — panel Settings di dashboard (Save + Test Kirim), kredensial via `TELEGRAM_BOT_TOKEN/CHAT_ID` (env/central `telegram_settings.py`).
- **Auth JWT + RBAC** — login `admin/admin123` & `operator/operator123`, Bearer token, interceptor axios.
- **Audit Trail** — tabel `audit_logs`, endpoint `GET /api/v1/audit`, tercatat `ADD/UPDATE/DELETE/TRIGGER_BACKUP`.

**Service & Port default:**

| Service | Port | URL |
|---|---|---|
| FastAPI (Uvicorn) | 8000 | http://127.0.0.1:8000 / http://127.0.0.1:8000/docs |
| Vite Frontend | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | `ncm_db` |
| Redis | 6379 | `redis://localhost:6379/0` |

---

## 2. Prasyarat

| Kebutuhan | Versi | Cek |
|---|---|---|
| Python | 3.12+ | `python --version` |
| Node.js + npm | 18+ / 10+ | `node -v && npm -v` |
| PostgreSQL | 15+ | `psql --version` |
| Redis | 7+ | `redis-cli ping` |
| Git | terbaru | `git --version` |
| Docker Desktop | terbaru | `docker --version && docker compose version` (opsional, untuk opsi Docker) |

> **Windows:** instal via winget/installer resmi. **Linux:** via `apt`. Lihat langkah per-OS di bawah.

---

## 3. Konfigurasi Environment (.env)

1. Salin template:
   ```bash
   cp .env.example .env   # Linux/macOS
   # atau
   Copy-Item .env.example .env   # Windows PowerShell
   ```
2. Isi `.env` (contoh lengkap):

   ```ini
   POSTGRES_USER=ncm_user
   POSTGRES_PASSWORD=ncm_secure_pass_123
   POSTGRES_DB=ncm_db
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432

   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_URL=redis://localhost:6379/0

   ENCRYPTION_KEY=rahasia-banget-bebas-apa-saja-ganti-di-produksi
   DATABASE_URL=postgresql://ncm_user:ncm_secure_pass_123@localhost:5432/ncm_db

   # Opsional — bisa juga diisi lewat Dashboard > Integrasi Telegram (disimpan in-memory)
   TELEGRAM_BOT_TOKEN=8963484658:AAFBUDF3jzuqZRNrEvJDlX6Uz_iqa2-ZSV4
   TELEGRAM_CHAT_ID=779086531
   ```

   > Untuk produksi: `ENCRYPTION_KEY` ganti random 32+ char, `POSTGRES_PASSWORD` kuat, dan **jangan commit `.env`** (sudah di `.gitignore`). Token Telegram juga bisa diatur lewat panel dashboard tanpa edit file.

---

## 4. Instalasi & Menjalankan — Windows (PowerShell)

### 4.1 Prasyarat Windows
```powershell
winget install Python.Python.3.12
winget install OpenJS.NodeJS.LTS
winget install PostgreSQL.PostgreSQL
winget install Redis.RedisStack  # atau jalankan Redis via Docker: docker run -d -p 6379:6379 redis:7-alpine
winget install Git.Git
```

### 4.2 Clone & Backend
```powershell
git clone https://github.com/Rzkyads/NCM-Network-Configuration-Management-.git
cd "Project-4"

python -m venv venv
.\venv\Scripts\Activate
pip install --upgrade pip
pip install -r requirements.txt
```

> `requirements.txt` sudah mencakup: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `psycopg2-binary`, `pydantic-settings`, `netmiko`, `celery`, `redis`, `requests`, `croniter`, `python-jose[cryptography]`, `passlib[bcrypt]`, `bcrypt`, `python-multipart`.

### 4.3 Setup PostgreSQL
```powershell
# Pastikan service PostgreSQL berjalan (Services.msc → postgresql-x64-15 → Running)
# Buat user & database (jalan sekali):
$env:PGPASSWORD="superadmin"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE DATABASE ncm_db;"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "CREATE USER ncm_user WITH PASSWORD 'ncm_secure_pass_123';"
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ncm_db TO ncm_user;"
```

### 4.4 Frontend
```powershell
cd frontend
npm install
cd ..
```

### 4.5 Menjalankan Service (4-5 terminal terpisah, venv aktif di tiap terminal backend)

**Terminal 1 — API:**
```powershell
.\venv\Scripts\Activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Celery Worker (wajib --pool=solo di Windows):**
```powershell
.\venv\Scripts\Activate
celery -A app.services.scheduler.celery_app worker --pool=solo --loglevel=info
```

**Terminal 3 — Celery Beat:**
```powershell
.\venv\Scripts\Activate
celery -A app.services.scheduler.celery_app beat --loglevel=info
```

**Terminal 4 — Frontend:**
```powershell
cd frontend
npm run dev
# buka http://localhost:5173
```

> Akses Swagger: `http://127.0.0.1:8000/docs` → Authorize dengan token dari `POST /api/v1/auth/login`.

---

## 5. Instalasi & Menjalankan — Linux (Ubuntu/Debian)

### 5.1 Prasyarat Linux
```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip nodejs npm postgresql postgresql-contrib redis-server git
node -v && npm -v
psql --version
redis-cli ping  # harus PONG
```

### 5.2 Clone & Backend
```bash
git clone https://github.com/Rzkyads/NCM-Network-Configuration-Management-.git
cd Project-4

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 5.3 Setup PostgreSQL
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE ncm_db;
CREATE USER ncm_user WITH PASSWORD 'ncm_secure_pass_123';
GRANT ALL PRIVILEGES ON DATABASE ncm_db TO ncm_user;
SQL

# .env gunakan:
# POSTGRES_HOST=localhost
# REDIS_HOST=localhost
```

### 5.4 Frontend
```bash
cd frontend && npm install && cd ..
```

### 5.5 Menjalankan Service

**Terminal 1 — API:**
```bash
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Worker (Linux tidak perlu --pool=solo):**
```bash
source venv/bin/activate
celery -A app.services.scheduler.celery_app worker --loglevel=info
```

**Terminal 3 — Beat:**
```bash
source venv/bin/activate
celery -A app.services.scheduler.celery_app beat --loglevel=info
```

**Terminal 4 — Frontend:**
```bash
cd frontend && npm run dev
```

> Alternatif 1 baris (tmux/screen) atau systemd — buat service unit untuk produksi (contoh `systemd` ada di repo `docs/` jika tersedia).

---

## 6. Instalasi & Menjalankan — Docker (Rekomendasi)

Cocok untuk dev maupun demo — PostgreSQL, Redis, API, Worker, Beat jalan dalam container. Frontend tetap jalan via `npm run dev` (atau build static).

### 6.1 Prasyarat Docker
- Docker Desktop (Windows/macOS) atau `docker + docker compose plugin` (Linux).
- File `.env` dari `.env.example` sudah terisi. Untuk Docker, `POSTGRES_HOST=postgres_db` dan `REDIS_HOST=redis_cache` akan di-inject otomatis via `docker-compose.yml`.

### 6.2 Jalankan Stack
```bash
# di root Project-4
cp .env.example .env   # isi sesuai kebutuhan, minimal ENCRYPTION_KEY

# build & up (detached)
docker compose up --build -d

# cek log
docker compose logs -f api celery_worker celery_beat
docker compose ps
```

**Service compose yang tersedia:**

| Container | Command |
|---|---|
| `ncm_postgres` | `postgres:15-alpine` |
| `ncm_redis` | `redis:7-alpine` |
| `ncm_fastapi` | `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` |
| `ncm_worker` | `celery -A app.services.scheduler.celery_app worker --loglevel=info` |
| `ncm_beat` | `celery -A app.services.scheduler.celery_app beat --loglevel=info` |

### 6.3 Frontend (tetap di host)
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173 → API di http://127.0.0.1:8000
```

### 6.4 Perintah Harian Docker
```bash
docker compose down              # stop
docker compose down -v           # stop + hapus volume postgres_data (reset DB)
docker compose up --build -d     # rebuild setelah ubah requirements/Dockerfile
docker compose logs -f --tail=100
```

> **Catatan:** `backups_storage/` dan `celerybeat-schedule*` sudah di-`.gitignore` dan di-mount sebagai volume, jadi file backup persist di host.

---

## 7. Autentikasi & RBAC

- **Login:** `POST /api/v1/auth/login` (form `username` + `password`, `Content-Type: application/x-www-form-urlencoded`).
- **Kredensial default (seed di `app/core/auth.py`):**
  - `admin / admin123` — role `admin` (full: Create/Update/Delete + trigger backup)
  - `operator / operator123` — role `operator` (read + trigger backup saja)
- **JWT:** `Authorization: Bearer <token>` (auto via axios interceptor). Swagger: klik **Authorize** → paste token.
- **RBAC backend:** `POST /devices`, `PUT /devices/{id}`, `DELETE /devices/{id}` → `Depends(require_role("admin"))`.
- **Frontend:** halaman Login full-screen jika `!token`; header menampilkan badge `ADMIN/OPERATOR`; tombol Tambah/Hapus/Edit & panel Telegram hanya untuk `admin`.

---

## 8. Penggunaan Dashboard

1. **Login** di `http://localhost:5173` dengan `admin/admin123`.
2. **Tambah Perangkat** (admin) → isi Hostname, IP, Vendor (MikroTik/Cisco/Huawei/Juniper/TP-Link Omada), Tipe, Username/Password SSH, **Waktu Backup Harian** (Time Picker WIB → cron).
3. **Cari/Filter** — ketik hostname/IP/vendor di search bar tabel Infrastruktur.
4. **Trigger Backup** — tombol **Backup** per baris atau **Backup Semua** (mass, paralel, konfirmasi).
5. **Riwayat** — tabel di bawah menampilkan `Waktu Eksekusi`, `Status`, `File Path`; aksi **Lihat** (modal terminal), **Download** (blob `.rsc`), **Hapus** (hapus DB + file fisik, auth required).
6. **Bandingkan Config** — tombol header; pilih 2 versi backup → modal diff side-by-side (merah = hapus, hijau = tambah).
7. **Audit Trail** — tabel paling bawah, auto-refresh tiap `fetchData` (10s interval).
8. **Telegram** (admin) — panel bawah: isi `Bot Token` + `Chat ID` → **Simpan** (POST `/settings/telegram/`) → **Tes Kirim** (POST `/settings/telegram/test`).

---

## 9. Referensi API

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| POST | `/api/v1/auth/login` | — | Login, return `access_token` + `role` |
| GET | `/api/v1/devices/` | — | List perangkat |
| POST | `/api/v1/devices/` | admin | Tambah perangkat |
| PUT | `/api/v1/devices/{id}` | admin | Update perangkat |
| DELETE | `/api/v1/devices/{id}` | admin | Hapus perangkat |
| POST | `/api/v1/devices/{id}/trigger-backup` | Bearer | Trigger backup manual |
| GET | `/api/v1/backups/` | — | List riwayat (auto cleanup >3 hari) |
| GET | `/api/v1/backups/{id}/content` | — | Plain text isi `.rsc` |
| DELETE | `/api/v1/backups/{id}` | Bearer | Hapus riwayat + file |
| GET/POST | `/api/v1/settings/telegram/` | — | Get/Save telegram config |
| POST | `/api/v1/settings/telegram/test` | — | Test kirim pesan Telegram |
| GET | `/api/v1/audit/` | Bearer | List audit logs (50 terbaru) |

---

## 10. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `FATAL: password authentication failed for user "ncm_user"` | Password `.env` vs DB tidak sinkron / role belum ada | `psql -U postgres -c "ALTER USER ncm_user WITH PASSWORD 'ncm_secure_pass_123';"` atau recreate DB (lihat 4.3/5.3) |
| `ModuleNotFoundError: No module named 'jose' / 'requests' / 'croniter'` | `pip install` belum dijalankan atau venv salah | Aktifkan venv yang benar, `pip install -r requirements.txt` |
| `ModuleNotFoundError: No module named 'app.services.notification'` | Import path salah | Sudah fix: `from app.core.telegram_settings import global_tg_config` |
| `AttributeError: module 'bcrypt' has no attribute '__about__'` | `passlib` vs `bcrypt` 5.x incompat | Fix di `app/core/auth.py` pakai `bcrypt` direct (`gensalt`/`hashpw`/`checkpw`), tidak via `CryptContext.verify` |
| `CroniterBadCronError` tiap menit | `cron_schedule` null/"" di DB | Sudah ditangani `if not device.cron_schedule: continue` + `try/except CroniterBadCronError` di `scheduler.py` |
| Tailwind tidak ter-apply / layar abu gelap | `tailwind.config.js` / `postcss.config.js` salah, `@tailwind` vs `@import` | Untuk Tailwind v4: `src/index.css` cukup `@import "tailwindcss";`, `postcss.config.js` pakai `@tailwindcss/postcss` |
| `401 Unauthorized` di frontend | Token expired / belum login | Login ulang; cek `localStorage ncm_token`; Swagger Authorize |
| `403 Forbidden: Memerlukan hak akses Administrator` | Login sebagai `operator` mencoba Create/Update/Delete | Login sebagai `admin` |
| Celery tidak terima task (Windows) | Worker tanpa `--pool=solo` | `celery -A app.services.scheduler.celery_app worker --pool=solo --loglevel=info` |
| Redis/DB connection refused | Service belum jalan | `redis-cli ping` / `pg_isready` / `docker compose ps`; cek `.env` host/port |
| File `.rsc` tidak ditemukan di viewer | Path lokal, retention 3 hari terhapus | Cek `backups_storage/`; `GET /backups` auto-cleanup >3 hari |

> Butuh bantuan? Buka `http://127.0.0.1:8000/docs` untuk eksplor API, atau cek log di terminal Worker/Beat.

---

**Versi panduan:** Fullstack Cyaneum NCM (React + FastAPI + Celery + PostgreSQL + Redis + Telegram + Audit + Retention) — diperbarui 2026-09-30.
