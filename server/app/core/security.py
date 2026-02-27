# app/core/security.py

from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from typing import Optional, Dict


# =====================================================
# CONFIG
# =====================================================

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise Exception("SECRET_KEY must be set in environment.")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =====================================================
# PASSWORD HASHING
# =====================================================

def hash_password(password: str) -> str:
    """
    Hash password safely (bcrypt 72-byte safe).
    """
    if not password:
        raise ValueError("Password cannot be empty.")

    # bcrypt limit protection
    if len(password.encode("utf-8")) > 72:
        password = password[:72]

    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False

    if len(plain_password.encode("utf-8")) > 72:
        plain_password = plain_password[:72]

    return pwd_context.verify(plain_password, hashed_password)


# =====================================================
# TOKEN CREATION
# =====================================================

def create_access_token(user_id: int, organization_id: int, role: str) -> str:
    """
    Create short-lived access token.
    """

    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "user_id": user_id,
        "organization_id": organization_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """
    Create long-lived refresh token.
    """

    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "user_id": user_id,
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# =====================================================
# TOKEN DECODE (STRICT)
# =====================================================

def decode_access_token(token: str) -> Optional[Dict]:
    """
    Decode and validate access token.
    Strictly enforces:
    - type == access
    - required claims present
    """

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "access":
            return None

        if "user_id" not in payload:
            return None

        if "organization_id" not in payload:
            return None

        if "exp" not in payload:
            return None

        return payload

    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[Dict]:
    """
    Decode and validate refresh token.
    """

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("type") != "refresh":
            return None

        if "user_id" not in payload:
            return None

        return payload

    except JWTError:
        return None


# =====================================================
# GENERIC SAFE DECODE
# =====================================================

def decode_token(token: str) -> Optional[Dict]:
    """
    Generic decode.
    Use carefully — does not enforce token type.
    """

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None