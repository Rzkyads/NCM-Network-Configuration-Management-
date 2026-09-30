from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
from app.core.telegram_settings import global_tg_config

router = APIRouter()

class TelegramConfig(BaseModel):
    bot_token: str
    chat_id: str

@router.post("/")
def save_telegram_settings(config: TelegramConfig):
    global_tg_config["bot_token"] = config.bot_token
    global_tg_config["chat_id"] = config.chat_id
    return {"status": "success", "message": "Konfigurasi Telegram berhasil disimpan!"}

@router.get("/")
def get_telegram_settings():
    return global_tg_config

@router.post("/test")
def test_telegram_settings(config: TelegramConfig):
    url = f"https://api.telegram.org/bot{config.bot_token}/sendMessage"
    payload = {
        "chat_id": config.chat_id,
        "text": "🤖 *Cyaneum NCM Test Alert*\n\nKoneksi bot Telegram berhasil dihubungkan dari Dashboard!",
        "parse_mode": "Markdown"
    }
    try:
        res = requests.post(url, json=payload, timeout=5)
        if res.status_code == 200:
            return {"status": "success", "message": "Pesan tes berhasil dikirim ke Telegram!"}
        else:
            return {"status": "failed", "message": "Gagal: Token atau Chat ID tidak valid."}
    except Exception as e:
        return {"status": "failed", "message": str(e)}

