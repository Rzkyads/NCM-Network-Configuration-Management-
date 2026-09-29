import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hostname = Column(String, unique=True, index=True, nullable=False)
    ip_address = Column(String, nullable=False)
    port = Column(Integer, default=22, nullable=False)
    vendor = Column(String, nullable=False)  # mikrotik, ruijie, omada_controller
    device_type = Column(String, nullable=False)  # router, switch, access_point
    username = Column(String, nullable=False)
    password_enc = Column(String, nullable=False)
    cron_schedule = Column(String, default="0 2 * * *")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    backups = relationship("BackupLog", back_populates="device", cascade="all, delete-orphan")
