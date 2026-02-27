from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta

from app.database import get_db
from app.models.db_models import (
    CampaignExecution,
    ExecutionLog
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# =====================================================
# ORG SUMMARY (Enhanced)
# =====================================================

@router.get("/summary")
def get_org_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    org_id = current_user.organization_id

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

    retry_count = db.query(func.sum(ExecutionLog.retry_count)).join(
        CampaignExecution
    ).filter(
        CampaignExecution.organization_id == org_id
    ).scalar()

    completed_executions = db.query(func.count(CampaignExecution.id)).filter(
        CampaignExecution.organization_id == org_id,
        CampaignExecution.status == "completed"
    ).scalar()

    completion_rate = (
        (completed_executions / total_executions) * 100
        if total_executions else 0
    )

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
        "total_executions": total_executions or 0,
        "total_messages": total_messages or 0,
        "success_messages": success_messages or 0,
        "failed_messages": failed_messages or 0,
        "success_rate_percent": round(success_rate, 2),
        "completion_rate_percent": round(completion_rate, 2),
        "total_retries": retry_count or 0,
        "average_execution_duration_seconds": round(avg_duration or 0, 2)
    }


# =====================================================
# DAILY MESSAGE TREND
# =====================================================

@router.get("/daily-trend")
def get_daily_trend(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    org_id = current_user.organization_id
    start_date = datetime.utcnow() - timedelta(days=days)

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
        ExecutionLog.created_at >= start_date
    ).group_by(
        func.date(ExecutionLog.created_at)
    ).all()

    return {
        "trend": [
            {
                "date": str(r.date),
                "total_messages": r.total,
                "success_messages": r.success,
                "success_rate_percent": round(
                    ((r.success or 0) / r.total) * 100 if r.total else 0,
                    2
                )
            }
            for r in results
        ]
    }


# =====================================================
# CHANNEL PERFORMANCE (Enhanced)
# =====================================================

@router.get("/channel-performance")
def get_channel_performance(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
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
        "channels": [
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
# THROUGHPUT METRICS
# =====================================================

@router.get("/throughput")
def get_throughput(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    org_id = current_user.organization_id

    results = db.query(
        func.sum(CampaignExecution.total_count).label("total_messages"),
        func.sum(CampaignExecution.execution_duration_seconds).label("total_duration")
    ).filter(
        CampaignExecution.organization_id == org_id,
        CampaignExecution.status == "completed"
    ).first()

    if not results or not results.total_duration:
        return {
            "messages_per_second": 0
        }

    throughput = results.total_messages / results.total_duration

    return {
        "messages_per_second": round(throughput, 2)
    }