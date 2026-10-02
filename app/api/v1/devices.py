from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.models.device import Device
from app.schemas.device_schema import DeviceCreate, DeviceResponse
from app.core.security import encrypt_password
from app.core.auth import get_current_user, require_role
from app.services.scheduler import run_device_backup
from app.services.audit_service import log_activity

router = APIRouter()

@router.post("/", response_model=DeviceResponse)
def create_device(
    device: DeviceCreate, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(require_role("admin"))
):
    db_device = db.query(Device).filter(Device.ip_address == device.ip_address, Device.port == device.port).first()
    if db_device:
        raise HTTPException(status_code=400, detail="IP Address dan Port tersebut sudah terdaftar di sistem")
    
    device_data = device.model_dump()
    raw_password = device_data.pop("password")
    device_data["password_enc"] = encrypt_password(raw_password)
    
    new_device = Device(**device_data)
    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    log_activity(
        db=db,
        username=current_user["username"],
        action="ADD_DEVICE",
        description=f"Menambahkan perangkat baru: {new_device.hostname} ({new_device.ip_address})"
    )

    return new_device

@router.get("/", response_model=List[DeviceResponse])
def get_all_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Device).offset(skip).limit(limit).all()

@router.post("/{device_id}/trigger-backup")
def trigger_manual_backup(
    device_id: UUID, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Perangkat tidak ditemukan")
    
    run_device_backup.delay(str(device.id))

    log_activity(
        db=db,
        username=current_user["username"],
        action="TRIGGER_BACKUP",
        description=f"Memicu backup manual untuk perangkat: {device.hostname}"
    )

    return {"message": f"Instruksi backup untuk {device.hostname} telah dikirim ke Worker."}

@router.put("/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: UUID, 
    device_update: DeviceCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    db_device = db.query(Device).filter(Device.id == device_id).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    update_data = device_update.model_dump()
    raw_password = update_data.pop("password", None)
    
    for key, value in update_data.items():
        setattr(db_device, key, value)
    
    if raw_password:
        db_device.password_enc = encrypt_password(raw_password)
    
    db.commit()
    db.refresh(db_device)

    log_activity(
        db=db,
        username=current_user["username"],
        action="UPDATE_DEVICE",
        description=f"Memperbarui data perangkat: {db_device.hostname}"
    )

    return db_device

@router.delete("/{device_id}")
def delete_device(
    device_id: UUID, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device tidak ditemukan")

    hostname = device.hostname
    db.delete(device)
    db.commit()

    log_activity(
        db=db,
        username=current_user["username"],
        action="DELETE_DEVICE",
        description=f"Menghapus perangkat infrastruktur: {hostname}"
    )

    return {"message": "Perangkat berhasil dihapus"}
