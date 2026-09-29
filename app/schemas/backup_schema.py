from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

class BackupSchema(BaseModel):
    id: Optional[UUID] = None
    device_id: UUID
    status: str
    backup_type: str
    file_path: Optional[str] = None
    config_hash: Optional[str] = None
    execution_duration: Optional[float] = None
    error_msg: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
