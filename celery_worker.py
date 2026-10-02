from celery import Celery
from backup_parser import execute_device_backup

# Konfigurasi broker menggunakan Redis
celery_app = Celery(
    "network_backup_tasks",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

@celery_app.task(name="tasks.run_backup_task")
def run_backup_task(device_data: dict):
    """Celery task untuk mengeksekusi backup perangkat di background"""
    result = execute_device_backup(device_data)
    return result
