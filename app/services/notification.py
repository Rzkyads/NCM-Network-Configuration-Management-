import requests
from app.core.telegram_settings import global_tg_config

def send_telegram_alert(hostname: str, status: str, message: str):
    """Mengirimkan notifikasi instan ke Telegram Bot"""
    bot_token = global_tg_config.get("bot_token")
    chat_id = global_tg_config.get("chat_id")

    if not bot_token or not chat_id:
        return # Skip jika belum dikonfigurasi
    
    emoji = "✅" if status == "success" else "❌"
    text = (
        f"{emoji} *Cyaneum NCM Alert*\n\n"
        f"🖥️ *Perangkat:* `{hostname}`\n"
        f"📊 *Status:* `{status.upper()}`\n"
        f"💬 *Keterangan:* {message}"
    )
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    
    try:
        requests.post(url, json=payload, timeout=5)
    except Exception as e:
        print(f"Gagal mengirim notifikasi Telegram: {str(e)}")


