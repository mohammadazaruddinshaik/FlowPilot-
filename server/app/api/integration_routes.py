# app/api/integration_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.db_models import ChannelIntegration, CampaignExecution
from app.core.dependencies import get_current_user
from app.core.crypto import encrypt_credentials

router = APIRouter(prefix="/integrations", tags=["Channel Integrations"])

SUPPORTED_CHANNELS = ["whatsapp", "email"]


# =====================================================
# CREATE INTEGRATION
# =====================================================
@router.post("/")
def create_integration(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    channel_type = payload.get("channel_type")

    if channel_type not in SUPPORTED_CHANNELS:
        raise HTTPException(status_code=400, detail="Unsupported channel type.")

    if not payload.get("provider_name"):
        raise HTTPException(status_code=400, detail="provider_name is required.")

    if not payload.get("credentials"):
        raise HTTPException(status_code=400, detail="credentials are required.")

    if not payload.get("sender_identifier"):
        raise HTTPException(status_code=400, detail="sender_identifier is required.")

    integration = ChannelIntegration(
        organization_id=current_user.organization_id,
        channel_type=channel_type,
        provider_name=payload["provider_name"],
        api_key_encrypted=encrypt_credentials(payload["credentials"]),
        sender_identifier=payload["sender_identifier"],
        rate_limit_per_minute=payload.get("rate_limit_per_minute", 60),
        is_active=True,
        is_deleted=False,
        created_at=datetime.utcnow(),
    )

    db.add(integration)
    db.commit()
    db.refresh(integration)

    return {
        "success": True,
        "integration_id": integration.id
    }


# =====================================================
# LIST INTEGRATIONS (ONLY ACTIVE + NOT DELETED)
# =====================================================
@router.get("/")
def list_integrations(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    integrations = db.query(ChannelIntegration).filter(
        ChannelIntegration.organization_id == current_user.organization_id,
        ChannelIntegration.is_deleted == False
    ).all()

    return {
        "total": len(integrations),
        "integrations": [
            {
                "id": i.id,
                "channel_type": i.channel_type,
                "provider_name": i.provider_name,
                "sender_identifier": i.sender_identifier,
                "rate_limit_per_minute": i.rate_limit_per_minute,
                "is_active": i.is_active,
                "created_at": i.created_at
            }
            for i in integrations
        ]
    }


# =====================================================
# GET SINGLE
# =====================================================
@router.get("/{integration_id}")
def get_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.organization_id == current_user.organization_id,
        ChannelIntegration.is_deleted == False
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found.")

    return {
        "id": integration.id,
        "channel_type": integration.channel_type,
        "provider_name": integration.provider_name,
        "sender_identifier": integration.sender_identifier,
        "rate_limit_per_minute": integration.rate_limit_per_minute,
        "is_active": integration.is_active,
        "created_at": integration.created_at
    }


# =====================================================
# UPDATE
# =====================================================
@router.put("/{integration_id}")
def update_integration(
    integration_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.organization_id == current_user.organization_id,
        ChannelIntegration.is_deleted == False
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found.")

    integration.provider_name = payload.get("provider_name", integration.provider_name)
    integration.sender_identifier = payload.get("sender_identifier", integration.sender_identifier)
    integration.rate_limit_per_minute = payload.get(
        "rate_limit_per_minute",
        integration.rate_limit_per_minute
    )

    if payload.get("credentials"):
        integration.api_key_encrypted = encrypt_credentials(payload["credentials"])

    db.commit()

    return {"success": True}


# =====================================================
# TOGGLE ACTIVE (SAFE)
# =====================================================
@router.patch("/{integration_id}/toggle")
def toggle_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.organization_id == current_user.organization_id,
        ChannelIntegration.is_deleted == False
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found.")

    # Optional: Prevent disabling if running executions exist
    running_execution = db.query(CampaignExecution).filter(
        CampaignExecution.channel_integration_id == integration.id,
        CampaignExecution.status == "running"
    ).first()

    if running_execution:
        raise HTTPException(
            status_code=400,
            detail="Cannot disable integration while execution is running."
        )

    integration.is_active = not integration.is_active
    db.commit()

    return {
        "success": True,
        "is_active": integration.is_active
    }


# =====================================================
# DELETE (SOFT DELETE — ENTERPRISE SAFE)
# =====================================================
@router.delete("/{integration_id}")
def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.organization_id == current_user.organization_id,
        ChannelIntegration.is_deleted == False
    ).first()

    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found.")

    # Prevent deletion if any execution ever used it
    execution_exists = db.query(CampaignExecution).filter(
        CampaignExecution.channel_integration_id == integration.id
    ).first()

    if execution_exists:
        # Soft archive instead
        integration.is_active = False
        integration.is_deleted = True
        db.commit()

        return {
            "success": True,
            "message": "Integration archived (used in executions)."
        }

    # If never used → allow hard delete
    db.delete(integration)
    db.commit()

    return {"success": True, "message": "Integration permanently deleted."}