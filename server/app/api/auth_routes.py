# app/api/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.db_models import User, Organization
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# =====================================================
# REGISTER
# =====================================================

@router.post("/register")
def register(payload: dict, db: Session = Depends(get_db)):

    if not payload.get("email") or not payload.get("password") or not payload.get("organization_name"):
        raise HTTPException(status_code=400, detail="Missing required fields.")

    existing = db.query(User).filter(User.email == payload["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists.")

    # Create Organization
    organization = Organization(
        name=payload["organization_name"]
    )
    db.add(organization)
    db.commit()
    db.refresh(organization)

    # Create User (Single-user model, no roles)
    user = User(
        email=payload["email"],
        password_hash=hash_password(payload["password"]),
        organization_id=organization.id,
        is_active=True
    )

    db.add(user)
    db.commit()

    return {
        "success": True,
        "message": "User registered successfully."
    }


# =====================================================
# LOGIN
# =====================================================

@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):

    if not payload.get("email") or not payload.get("password"):
        raise HTTPException(status_code=400, detail="Email and password required.")

    user = db.query(User).filter(User.email == payload["email"]).first()

    if not user or not verify_password(payload["password"], user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account inactive.")

    access_token = create_access_token(
        user_id=user.id,
        organization_id=user.organization_id,
        role="user"  # static (not stored)
    )

    refresh_token = create_refresh_token(user.id)

    # Store hashed refresh token (rotation support)
    user.refresh_token_hash = hash_password(refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# =====================================================
# REFRESH TOKEN
# =====================================================

@router.post("/refresh")
def refresh_token(payload: dict, db: Session = Depends(get_db)):

    token = payload.get("refresh_token")

    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required.")

    payload_data = decode_refresh_token(token)

    if not payload_data:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user = db.query(User).filter(User.id == payload_data["user_id"]).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    # Verify stored refresh token
    if not user.refresh_token_hash or not verify_password(token, user.refresh_token_hash):
        raise HTTPException(status_code=401, detail="Refresh token mismatch.")

    # Issue new tokens (rotation)
    new_access_token = create_access_token(
        user_id=user.id,
        organization_id=user.organization_id,
        role="user"
    )

    new_refresh_token = create_refresh_token(user.id)

    user.refresh_token_hash = hash_password(new_refresh_token)
    db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


# =====================================================
# LOGOUT
# =====================================================

@router.post("/logout")
def logout(payload: dict, db: Session = Depends(get_db)):

    token = payload.get("refresh_token")

    if not token:
        raise HTTPException(status_code=400, detail="Refresh token required.")

    payload_data = decode_refresh_token(token)

    if not payload_data:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")

    user = db.query(User).filter(User.id == payload_data["user_id"]).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    # Invalidate refresh token
    user.refresh_token_hash = None
    db.commit()

    return {
        "success": True,
        "message": "Logged out successfully."
    }