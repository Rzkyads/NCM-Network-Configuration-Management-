from fastapi import FastAPI
from pydantic import BaseModel
from celery_worker import run_backup_task
from backup_parser import execute_device_backup

app = FastAPI(title="Multi-Vendor Network Auto-Backup API", version="1.0")

# Skema data perangkat yang masuk via API
class DeviceSchema(BaseModel):
    name: str
    device_type: str  # cisco_ios, mikrotik_routeros, hp_procurve, dll.
    host: str
    port: int = 22
    username: str
    password: str

@app.get("/")
def read_root():
    return {"message": "Sistem Auto-Backup Multi-Vendor FastAPI & Celery Aktif!"}

@app.post("/api/backup/manual")
def trigger_manual_backup(device: DeviceSchema):
    """Endpoint untuk memicu backup secara langsung (sync)"""
    result = execute_device_backup(device.dict())
    return {"message": "Backup manual selesai dieksekusi", "result": result}

@app.post("/api/backup/async")
def trigger_async_backup(device: DeviceSchema):
    """Endpoint untuk memicu backup via Celery Worker (async background)"""
    task = run_backup_task.delay(device.dict())
    return {
        "message": "Task backup berhasil dimasukkan ke antrean Celery",
        "task_id": task.id
    }
