import time
import requests
import hashlib
from pathlib import Path
import urllib3
from app.core.security import decrypt_password

# Nonaktifkan peringatan SSL untuk Controller lokal yang menggunakan self-signed certificate
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BACKUP_DIR = Path("backups_storage")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def backup_omada_controller(ip_address: str, port: int, username: str, encrypted_pass: str, hostname: str):
    start_time = time.time()
    password = decrypt_password(encrypted_pass)
    decrypted_username = decrypt_password(username)
    
    # Base URL Omada Controller
    base_url = f"https://{ip_address}:{port}"
    login_url = f"{base_url}/api/v2/login"
    
    session = requests.Session()
    session.verify = False # Abaikan sertifikat SSL
    
    try:
        # 1. Login untuk mendapatkan Token
        login_payload = {
            "username": decrypted_username,
            "password": password
        }
        
        login_resp = session.post(login_url, json=login_payload, timeout=10)
        login_resp.raise_for_status()
        
        login_data = login_resp.json()
        if login_data.get("errorCode") != 0:
            raise ValueError(f"Omada Login Gagal: {login_data.get('msg')}")
            
        token = login_data["result"]["token"]
        
        # 2. Trigger Download Backup
        backup_url = f"{base_url}/api/v2/users/current/maintenance/backup"
        headers = {"Csrf-Token": token}
        backup_payload = {"retainDays": 7} 
        
        backup_resp = session.post(backup_url, headers=headers, json=backup_payload, timeout=60)
        backup_resp.raise_for_status()
        
        file_content = backup_resp.content
        
        # 3. Proses Penyimpanan
        config_hash = hashlib.md5(file_content).hexdigest()
        date_str = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{hostname}_{date_str}.cfg"
        filepath = BACKUP_DIR / filename
        
        with open(filepath, 'wb') as f:
            f.write(file_content)
            
        duration = time.time() - start_time
        return True, str(filepath), config_hash, duration, None
        
    except Exception as e:
        duration = time.time() - start_time
        return False, None, None, duration, str(e)
