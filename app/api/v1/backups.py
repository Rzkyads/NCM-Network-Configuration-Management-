from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.backup_log import BackupLog
from app.schemas.backup_schema import BackupSchema

router = APIRouter()

@router.get("/", response_model=List[BackupSchema])
def list_backups(db: Session = Depends(get_db)):
    return db.query(BackupLog).order_by(BackupLog.created_at.desc()).all()
