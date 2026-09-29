import hashlib
import time
from pathlib import Path
from netmiko import ConnectHandler
from app.core.security import decrypt_password

# Menggunakan pathlib untuk kompatibilitas OS (Windows/Linux)
BACKUP_DIR = Path("backups_storage")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def backup_device_cli(device_ip: str, port: int, vendor: str, username: str, encrypted_pass: str, hostname: str):
    start_time = time.time()
    password = decrypt_password(encrypted_pass)
    
    # Mapping vendor NCM ke format device_type Netmiko
    netmiko_device_type = "mikrotik_routeros" if vendor.lower() == "mikrotik" else "ruijie_os"
    
    device_params = {
        'device_type': netmiko_device_type,
        'ip': device_ip,
        'username': username,
        'password': password,
        'port': port,
        'timeout': 30,
        'conn_timeout': 30,
        'global_delay_factor': 2, # Membantu kestabilan jika CPU router sedang tinggi (misal saat kalkulasi BGP)
    }
    
    try:
        with ConnectHandler(**device_params) as net_connect:
            if vendor.lower() == "mikrotik":
                # Eksekusi plaintext export
                output = net_connect.send_command("/export")
                ext = ".rsc"
                # Opsi tambahan: untuk backup biner, bisa memicu command `/system backup save name=...`
            elif vendor.lower() == "ruijie":
                output = net_connect.send_command("show running-config")
                ext = ".cfg"
            else:
                raise ValueError(f"Vendor {vendor} tidak didukung via SSH")

        # Buat hash dari konfigurasi yang ditarik untuk perbandingan (Diff)
        config_hash = hashlib.md5(output.encode('utf-8')).hexdigest()
        
        # Penamaan file: Core-Router-1_20261025_020000.rsc
        date_str = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{hostname}_{date_str}{ext}"
        filepath = BACKUP_DIR / filename
        
        # Simpan file
        filepath.write_text(output)
        
        duration = time.time() - start_time
        return True, str(filepath), config_hash, duration, None
        
    except Exception as e:
        duration = time.time() - start_time
        return False, None, None, duration, str(e)
