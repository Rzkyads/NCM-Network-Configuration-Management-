import os
import requests
from datetime import datetime
from netmiko import ConnectHandler
from app.core.device_mapping import get_netmiko_driver

BACKUP_DIR = "backup_results"
os.makedirs(BACKUP_DIR, exist_ok=True)

# Konfigurasi Token Bot Telegram Asli 
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "GANTI_DENGAN_TOKEN_BOT_ANDA")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "GANTI_DENGAN_CHAT_ID_ANDA")

def get_backup_command(vendor: str) -> str:
    """Menentukan perintah backup berdasarkan vendor."""
    if "mikrotik" in vendor.lower():
        return "/export"
    return "show running-config"

def send_telegram_alert(message):
    """Fungsi mengirim notifikasi asli ke Telegram"""
    if "GANTI_DENGAN" in TELEGRAM_BOT_TOKEN:
        print("[TELEGRAM] Token belum dikonfigurasi, melewati pengiriman pesan.")
        return
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code != 200:
            print(f"[ERROR] Gagal mengirim Telegram: {response.text}")
    except Exception as e:
        print(f"[ERROR] Exception Telegram: {e}")

def execute_device_backup(device_config):
    """Menjalankan backup perangkat via Netmiko secara multi-vendor"""
    name = device_config.get("name")
    vendor = device_config.get("vendor") 
    device_type = device_config.get("device_type")
    # Gunakan driver dari config, fallback ke mapping, lalu autodetect
    netmiko_driver = device_config.get("netmiko_driver") or get_netmiko_driver(vendor) or "autodetect"
    host = device_config.get("host")
    port = device_config.get("port", 22)
    username = device_config.get("username")
    password = device_config.get("password")
    
    backup_cmd = get_backup_command(vendor)

    print(f"\n[BACKUP] Memulai backup untuk {name} ({host}:{port}) menggunakan driver: {netmiko_driver}...")
    
    try:
        # Koneksi Netmiko menggunakan netmiko_driver
        net_connect = ConnectHandler(
            device_type=netmiko_driver,
            host=host,
            port=port,
            username=username,
            password=password,
            timeout=20
        )
        
        raw_output = net_connect.send_command(backup_cmd)
        net_connect.disconnect()
        
        if not raw_output or len(raw_output.strip()) < 5:
            raise ValueError("Output konfigurasi kosong dari perangkat.")
            
        # Simpan hasil backup
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{vendor}_{timestamp}.txt"
        filepath = os.path.join(BACKUP_DIR, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(raw_output.strip())
            
        print(f"[SUKSES] Backup {name} tersimpan di {filepath}")
        
        # Kirim notifikasi sukses ke Telegram
        msg = f"✅ *Backup Sukses*\n\nDevice: `{name}`\nVendor: `{vendor}`\nFile: `{filename}`"
        send_telegram_alert(msg)
        
        return {"status": "success", "device": name, "file": filename}
        
    except Exception as e:
        error_msg = f"❌ *Backup Gagal*\n\nDevice: `{name}`\nError: `{str(e)}`"
        print(f"[ERROR] {name}: {e}")
        send_telegram_alert(error_msg)
        return {"status": "error", "device": name, "message": str(e)}
