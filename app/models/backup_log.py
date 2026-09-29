import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class BackupLog(Base):
    __tablename__ = "backup_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=False)
    status = Column(String, nullable=False)  # success, failed
    backup_type = Column(String, nullable=False)  # plaintext, binary
    file_path = Column(String, nullable=True)
    config_hash = Column(String, nullable=True)
    execution_duration = Column(Float, nullable=True)
    error_msg = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="backups")
