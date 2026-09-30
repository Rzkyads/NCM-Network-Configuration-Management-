import hashlib
import time
from pathlib import Path
from netmiko import ConnectHandler
from app.core.security import decrypt_password
from app.services.notification import send_telegram_alert

# Menggunakan pathlib untuk kompatibilitas OS (Windows/Linux)
BACKUP_DIR = Path("backups_storage")
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def get_netmiko_device_type(vendor: str):
    vendor = vendor.lower()
    if "mikrotik" in vendor:
        return "mikrotik_routeros"
    elif "cisco" in vendor:
        return "cisco_ios"
    elif "huawei" in vendor:
        return "huawei_vrp"
    elif "juniper" in vendor:
        return "juniper_junos"
    elif "tp-link" in vendor or "omada" in vendor:
        return "tplink_jetstream"
    elif "ruijie" in vendor:
        return "ruijie_os"
    else:
        return "autodetect"

def backup_device_cli(device_ip: str, port: int, vendor: str, username: str, encrypted_pass: str, hostname: str):
    start_time = time.time()
    password = decrypt_password(encrypted_pass)
    
    device_params = {
        'device_type': get_netmiko_device_type(vendor),
        'ip': device_ip,
        'username': username,
        'password': password,
        'port': port,
        'timeout': 30,
        'conn_timeout': 30,
        'global_delay_factor': 2,
    }
    
    try:
        with ConnectHandler(**device_params) as net_connect:
            net_connect.enable()
            vendor_lower = vendor.lower()
            
            if "mikrotik" in vendor_lower:
                output = net_connect.send_command("/export")
                ext = ".rsc"
            elif "cisco" in vendor_lower:
                output = net_connect.send_command("show running-config")
                ext = ".cfg"
            elif "huawei" in vendor_lower:
                output = net_connect.send_command("display current-configuration")
                ext = ".cfg"
            elif "juniper" in vendor_lower:
                output = net_connect.send_command("show configuration")
                ext = ".conf"
            elif "tp-link" in vendor_lower or "omada" in vendor_lower:
                output = net_connect.send_command("show running-config")
                ext = ".cfg"
            elif "ruijie" in vendor_lower:
                output = net_connect.send_command("show running-config")
                ext = ".cfg"
            else:
                output = net_connect.send_command("show running-config")
                ext = ".txt"

        config_hash = hashlib.md5(output.encode('utf-8')).hexdigest()
        
        date_str = time.strftime("%Y%m%d_%H%M%S")
        filename = f"{hostname}_{date_str}{ext}"
        filepath = BACKUP_DIR / filename
        
        filepath.write_text(output, encoding='utf-8')
        
        duration = time.time() - start_time
        
        # Kirim notifikasi sukses
        send_telegram_alert(
            hostname=hostname, 
            status="success", 
            message="File konfigurasi berhasil dicadangkan dan disimpan ke server."
        )
        
        return True, str(filepath), config_hash, duration, None
        
    except Exception as e:
        duration = time.time() - start_time
        error_msg = str(e)
        
        # Kirim notifikasi gagal
        send_telegram_alert(
            hostname=hostname, 
            status="failed", 
            message=f"Koneksi SSH gagal: {error_msg}"
        )
        
        return False, None, None, duration, error_msg

