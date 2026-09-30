from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.models.audit import AuditLog
from app.core.auth import get_current_user

router = APIRouter()

class AuditLogResponse(BaseModel):
    id: int
    username: str
    action: str
    description: str
    ip_address: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(50).all()
    return logs
