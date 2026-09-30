from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.backup_log import BackupLog
from app.schemas.backup_schema import BackupSchema
from app.core.auth import get_current_user

router = APIRouter()

def cleanup_old_backups(db: Session):
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    old_backups = db.query(BackupLog).filter(BackupLog.created_at < three_days_ago).all()
    for backup in old_backups:
        if backup.file_path and os.path.exists(backup.file_path):
            try:
                os.remove(backup.file_path)
            except Exception as e:
                print(f"Gagal menghapus file fisik {backup.file_path}: {e}")
        db.delete(backup)
    if old_backups:
        db.commit()

@router.get("/", response_model=List[BackupSchema])
def list_backups(db: Session = Depends(get_db)):
    cleanup_old_backups(db)
    return db.query(BackupLog).order_by(BackupLog.created_at.desc()).all()

@router.delete("/{backup_id}")
def delete_backup(backup_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    backup = db.query(BackupLog).filter(BackupLog.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Riwayat backup tidak ditemukan")
    if backup.file_path and os.path.exists(backup.file_path):
        try:
            os.remove(backup.file_path)
        except Exception as e:
            print(f"Gagal menghapus file fisik: {e}")
    db.delete(backup)
    db.commit()
    return {"status": "success", "message": "Riwayat dan file konfigurasi berhasil dihapus."}

@router.get("/{backup_id}/content", response_class=PlainTextResponse)
def get_backup_content(backup_id: str, db: Session = Depends(get_db)):
    backup = db.query(BackupLog).filter(BackupLog.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Riwayat backup tidak ditemukan")
    
    file_path = backup.file_path
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File fisik konfigurasi tidak ditemukan di server")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        try:
            with open(file_path, "r", encoding="latin-1") as f:
                return f.read()
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Gagal membaca file: {str(err)}")
