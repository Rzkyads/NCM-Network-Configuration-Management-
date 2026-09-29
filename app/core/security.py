import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings

def _get_fernet():
    # Mengubah key .env menjadi 32-byte valid secara konsisten
    key_bytes = hashlib.sha256(settings.ENCRYPTION_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))

def encrypt_password(password: str) -> str:
    if not password:
        return ""
    return _get_fernet().encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return ""
    return _get_fernet().decrypt(encrypted_password.encode()).decode()
