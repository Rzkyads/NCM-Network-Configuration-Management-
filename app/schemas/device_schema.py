from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class DeviceBase(BaseModel):
    hostname: str
    ip_address: str
    port: int = 22
    vendor: str
    device_type: str
    username: str
    cron_schedule: str
    is_active: bool = True

class DeviceCreate(DeviceBase):
    password: str

class DeviceResponse(DeviceBase):
    id: UUID
    
    model_config = ConfigDict(from_attributes=True)
