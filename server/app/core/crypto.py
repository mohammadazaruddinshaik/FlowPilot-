# app/core/encryption.py

import os
import json
from cryptography.fernet import Fernet, InvalidToken
from typing import Dict, Any


class EncryptionError(Exception):
    pass


def _get_fernet_instance() -> Fernet:
    """
    Load encryption key from environment safely.
    """
    master_key = os.getenv("ENCRYPTION_KEY")

    if not master_key:
        raise EncryptionError("ENCRYPTION_KEY is not set in environment.")

    try:
        return Fernet(master_key.encode() if isinstance(master_key, str) else master_key)
    except Exception:
        raise EncryptionError("Invalid ENCRYPTION_KEY format.")


# ----------------------------
# Encrypt JSON credentials
# ----------------------------
def encrypt_credentials(data: Dict[str, Any]) -> str:
    """
    Encrypt dictionary credentials safely.
    Returns encrypted string.
    """
    try:
        fernet = _get_fernet_instance()
        json_data = json.dumps(data)
        encrypted = fernet.encrypt(json_data.encode())
        return encrypted.decode()
    except Exception as e:
        raise EncryptionError(f"Encryption failed: {str(e)}")


# ----------------------------
# Decrypt credentials
# ----------------------------
def decrypt_credentials(encrypted_data: str) -> Dict[str, Any]:
    """
    Decrypt encrypted string safely.
    Returns dictionary.
    """
    try:
        fernet = _get_fernet_instance()
        decrypted = fernet.decrypt(encrypted_data.encode())
        return json.loads(decrypted.decode())
    except InvalidToken:
        raise EncryptionError("Invalid or corrupted encrypted data.")
    except Exception as e:
        raise EncryptionError(f"Decryption failed: {str(e)}")