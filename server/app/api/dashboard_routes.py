from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta

from app.database import get_db
from app.models.db_models import (
    CampaignTemplate,
    CampaignExecution,
    ExecutionLog,
    ChannelIntegration,
    Organization,
    Dataset
)
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# =====================================================
# OVERVIEW (Enhanced)
# =====================================================

@router.get("/overview")
def dashboard_overview(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    org_id = current_user.organization_id

    organization = db.query(Organization).filter(
        Organization.id == org_id
    ).first()

    total_templates = db.query(func.count(CampaignTemplate.id)).filter(
        CampaignTemplate.organization_id == org_id,
        CampaignTemplate.is_deleted == False
    ).scalar()

    total_datasets = db.query(func.count(Dataset.id)).filter(
        Dataset.organization_id == org_id
    ).scalar()

    total_executions = db.query(func.count(CampaignExecution.id)).filter(
        CampaignExecution.organization_id == org_id
    ).scalar()

    total_messages = db.query(func.count(ExecutionLog.id)).join(
        CampaignExecution
    ).filter(
        CampaignExecution.organization_id == org_id
    ).scalar()

    success_messages = db.query(func.count(ExecutionLog.id)).join(
        CampaignExecution
    ).filter(
        CampaignExecution.organization_id == org_id,
        ExecutionLog.delivery_status == "delivered"
    ).scalar()

    failed_messages = db.query(func.count(ExecutionLog.id)).join(
        CampaignExecution
    ).filter(
        CampaignExecution.organization_id == org_id,
        ExecutionLog.delivery_status == "failed"
    ).scalar()

    success_rate = (
        (success_messages / total_messages) * 100
        if total_messages else 0
    )

    avg_duration = db.query(
        func.avg(CampaignExecution.execution_duration_seconds)
    ).filter(
        CampaignExecution.organization_id == org_id,
        CampaignExecution.status == "completed"
    ).scalar()

    return {
        "organization_name": organization.name if organization else "",
        "total_templates": total_templates or 0,
        "total_datasets": total_datasets or 0,
        "total_executions": total_executions or 0,
        "total_messages": total_messages or 0,
        "success_messages": success_messages or 0,
        "failed_messages": failed_messages or 0,
        "success_rate_percent": round(success_rate, 2),
        "average_execution_duration_seconds": round(avg_duration or 0, 2)
    }


# =====================================================
# EXECUTION TREND (Last 7 Days)
# =====================================================

@router.get("/executions/trend")
def execution_trend(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    org_id = current_user.organization_id
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    results = db.query(
        func.date(CampaignExecution.created_at).label("date"),
        func.count(CampaignExecution.id).label("count")
    ).filter(
        CampaignExecution.organization_id == org_id,
        CampaignExecution.created_at >= seven_days_ago
    ).group_by(
        func.date(CampaignExecution.created_at)
    ).all()

    return {
        "daily_executions": [
            {
                "date": str(r.date),
                "execution_count": r.count
            }
            for r in results
        ]
    }


# =====================================================
# MESSAGE TREND (Last 7 Days)
# =====================================================

@router.get("/messages/trend")
def message_trend(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    org_id = current_user.organization_id
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    results = db.query(
        func.date(ExecutionLog.created_at).label("date"),
        func.count(ExecutionLog.id).label("total"),
        func.sum(
            case(
                (ExecutionLog.delivery_status == "delivered", 1),
                else_=0
            )
        ).label("success")
    ).join(
        CampaignExecution
    ).filter(
        CampaignExecution.organization_id == org_id,
        ExecutionLog.created_at >= seven_days_ago
    ).group_by(
        func.date(ExecutionLog.created_at)
    ).all()

    return {
        "daily_messages": [
            {
                "date": str(r.date),
                "total": r.total,
                "success": r.success,
                "success_rate_percent": round(
                    ((r.success or 0) / r.total) * 100 if r.total else 0,
                    2
                )
            }
            for r in results
        ]
    }


# =====================================================
# TEMPLATE PERFORMANCE
# =====================================================

@router.get("/templates/performance")
def template_performance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    org_id = current_user.organization_id

    results = db.query(
        CampaignTemplate.name,
        func.count(ExecutionLog.id).label("total"),
        func.sum(
            case(
                (ExecutionLog.delivery_status == "delivered", 1),
                else_=0
            )
        ).label("success")
    ).join(
        CampaignExecution,
        CampaignExecution.campaign_template_id == CampaignTemplate.id
    ).join(
        ExecutionLog,
        ExecutionLog.campaign_execution_id == CampaignExecution.id
    ).filter(
        CampaignTemplate.organization_id == org_id
    ).group_by(
        CampaignTemplate.name
    ).all()

    return {
        "template_performance": [
            {
                "template": r.name,
                "total_messages": r.total,
                "success_rate_percent": round(
                    ((r.success or 0) / r.total) * 100 if r.total else 0,
                    2
                )
            }
            for r in results
        ]
    }


# =====================================================
# CHANNEL ANALYTICS (Improved)
# =====================================================

@router.get("/channels/analytics")
def channel_analytics(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    org_id = current_user.organization_id

    results = db.query(
        ExecutionLog.channel_type,
        func.count(ExecutionLog.id).label("total"),
        func.sum(
            case(
                (ExecutionLog.delivery_status == "delivered", 1),
                else_=0
            )
        ).label("success")
    ).join(
        CampaignExecution
    ).filter(
        CampaignExecution.organization_id == org_id
    ).group_by(
        ExecutionLog.channel_type
    ).all()

    return {
        "channel_performance": [
            {
                "channel": r.channel_type,
                "total_messages": r.total,
                "success_rate_percent": round(
                    ((r.success or 0) / r.total) * 100 if r.total else 0,
                    2
                )
            }
            for r in results
        ]
    }


# =====================================================
# RUNNING EXECUTIONS
# =====================================================

@router.get("/executions/running")
def running_executions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    org_id = current_user.organization_id

    running = db.query(CampaignExecution).filter(
        CampaignExecution.organization_id == org_id,
        CampaignExecution.status == "running"
    ).all()

    return {
        "running_executions": [
            {
                "execution_id": e.id,
                "processed": e.processed_count or 0,
                "total": e.total_count or 0,
                "progress_percent": round(
                    ((e.processed_count or 0) / e.total_count) * 100
                    if e.total_count else 0,
                    2
                )
            }
            for e in running
        ]
    }