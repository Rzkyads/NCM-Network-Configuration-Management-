import traceback
from datetime import datetime
from croniter import croniter, CroniterBadCronError
from celery import Celery
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.device import Device
from app.models.backup_log import BackupLog
from app.services.netmiko_worker import backup_device_cli
from app.services.omada_worker import backup_omada_controller

celery_app = Celery(
    "ncm_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Jakarta',
    enable_utc=False,
)

@celery_app.task(name="run_device_backup")
def run_device_backup(device_id: str):
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.id == device_id).first()
        if not device or not device.is_active:
            return "Device not found or inactive"

        if device.vendor.lower() == "omada_controller":
            success, filepath, config_hash, duration, error = backup_omada_controller(
                ip_address=device.ip_address,
                port=device.port,
                username=device.username,
                encrypted_pass=device.password_enc,
                hostname=device.hostname
            )
        else:
            success, filepath, config_hash, duration, error = backup_device_cli(
                device_ip=device.ip_address,
                port=device.port,
                vendor=device.vendor,
                username=device.username,
                encrypted_pass=device.password_enc,
                hostname=device.hostname
            )

        status = "success" if success else "failed"
        log = BackupLog(
            device_id=device.id,
            status=status,
            backup_type="plaintext",
            file_path=filepath,
            config_hash=config_hash,
            execution_duration=duration,
            error_msg=error
        )
        db.add(log)
        db.commit()
        return f"Backup {status} for {device.hostname}"
    except Exception as e:
        traceback.print_exc()
        return f"Task failed: {type(e).__name__}: {str(e)}"
    finally:
        db.close()

@celery_app.task(name="app.services.scheduler.check_scheduled_backups")
def check_scheduled_backups():
    db = SessionLocal()
    try:
        devices = db.query(Device).filter(Device.is_active == True).all()
        now = datetime.now()
        
        for device in devices:
            if not device.cron_schedule:
                continue
            
            try:
                # Evaluasi jadwal cron
                cron = croniter(device.cron_schedule, now)
                prev_time = cron.get_prev(datetime)
                
                # Jika eksekusi dalam 60 detik terakhir, picu backup
                if 0 <= (now - prev_time).total_seconds() < 60:
                    run_device_backup.delay(str(device.id))
            except CroniterBadCronError:
                print(f"Format cron tidak valid untuk device ID: {device.id}. Mengabaikan...")
                continue
    finally:
        db.close()

celery_app.conf.beat_schedule = {
    'check-backups-every-minute': {
        'task': 'app.services.scheduler.check_scheduled_backups',
        'schedule': 60.0,
    },
}
