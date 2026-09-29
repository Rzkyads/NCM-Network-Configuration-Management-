# Panduan Pengguna: Network Configuration Management (NCM) API

Selamat datang di sistem NCM API. Panduan ini membantu Anda memulai, menjalankan, dan memelihara sistem manajemen backup perangkat jaringan.

---

### 1. Persiapan Awal
Pastikan kebutuhan berikut terpenuhi:
*   **Python 3.12+** terinstal.
*   **Redis** terinstal dan berjalan.
*   **Virtual Environment** di direktori project (`venv`).

---

### 2. Menjalankan Komponen Backend
Sistem terdiri dari tiga komponen yang berjalan di terminal terpisah. Aktifkan virtual environment di setiap terminal:
`.\venv\Scripts\Activate`

#### A. Uvicorn (Server API)
Melayani request API, mengatur data perangkat, dan menerima perintah manual.
*   **Perintah:**
    ```powershell
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ```
    *(Hapus `--reload` untuk lingkungan produksi).*

#### B. Celery Worker (Eksekutor Tugas)
"Pekerja" yang melakukan SSH, menarik konfigurasi, dan menyimpan ke database.
*   **Perintah (di terminal baru):**
    ```powershell
    celery -A app.services.scheduler.celery_app worker --pool=solo --loglevel=info
    ```
    *( `--pool=solo` wajib pada Windows).*

#### C. Celery Beat (Penjadwal Otomatis)
"Jam alarm" yang mengecek jadwal tugas setiap menit.
*   **Perintah (di terminal ketiga):**
    ```powershell
    celery -A app.services.scheduler.celery_app beat --loglevel=info
    ```

---

### 3. Penggunaan Sistem
1.  **Akses Antarmuka**: Buka `http://127.0.0.1:8000/docs` untuk Swagger UI.
2.  **Registrasi**: Gunakan `POST /api/v1/devices/` untuk mendaftarkan perangkat.
3.  **Backup**: Gunakan `POST /api/v1/devices/{device_id}/trigger-backup` untuk backup manual.

---

### 4. Tips Troubleshooting
*   **Redis Mati**: Worker tidak bisa menerima tugas tanpa Redis.
*   **Koneksi SSH**: Pastikan kredensial perangkat benar dan SSH aktif.
*   **Venv**: Jika perintah `uvicorn`/`celery` tidak ditemukan, pastikan venv aktif.
*   **Log**: Periksa terminal Worker/Beat jika terjadi error backup.
