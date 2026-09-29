from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.base import Base
from app.db.session import engine
from app.api.v1 import devices, backups

# Membuat tabel database jika belum ada
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Network Configuration Management (NCM) API",
    description="API untuk manajemen backup perangkat jaringan multi-vendor",
    version="1.0.0"
)

# Konfigurasi CORS agar bisa diakses oleh frontend Vue/React nantinya
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router, prefix="/api/v1/devices", tags=["Devices"])
app.include_router(backups.router, prefix="/api/v1/backups", tags=["Backups"])

@app.get("/")
def root():
    return {"message": "Sistem NCM Aktif. Buka /docs untuk Swagger UI."}
