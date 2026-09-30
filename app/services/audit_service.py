from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_activity(db: Session, username: str, action: str, description: str):
    new_log = AuditLog(
        username=username,
        action=action,
        description=description
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log
