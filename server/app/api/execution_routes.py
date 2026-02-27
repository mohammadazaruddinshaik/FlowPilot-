import os
import uuid
import threading
from typing import List, Dict

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd

from app.database import get_db
from app.models.db_models import (
    CampaignExecution,
    CampaignTemplate,
    ChannelIntegration,
    ExecutionLog,
)
from app.core.execution_engine import run_campaign_execution
from app.core.dependencies import get_current_user
from app.core.filter_engine import apply_filter


# =====================================================
# Router Config
# =====================================================

router = APIRouter(prefix="/execution", tags=["Execution"])

EXECUTION_UPLOAD_DIR = "execution_uploads"
os.makedirs(EXECUTION_UPLOAD_DIR, exist_ok=True)


# =====================================================
# Utilities
# =====================================================

def normalize_column(value: str) -> str:
    if not value:
        return ""
    return (
        str(value)
        .replace("\ufeff", "")
        .strip()
        .lower()
    )


def detect_column_type(series: pd.Series) -> str:
    numeric_ratio = pd.to_numeric(series, errors="coerce").notna().sum() / len(series)
    return "number" if numeric_ratio > 0.9 else "string"


def validate_datatype_for_operator(
    column_type: str,
    operator: str
):
    if operator in ["<", ">", "<=", ">="] and column_type != "number":
        return False
    return True


# =====================================================
# 1️⃣ VALIDATE EXECUTION (STRICT CHECK BEFORE RUN)
# =====================================================

@router.post("/validate")
async def validate_execution(
    logical_id: str = Form(...),
    recipient_column: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    recipient_column = normalize_column(recipient_column)

    template = db.query(CampaignTemplate).filter(
        CampaignTemplate.logical_id == logical_id,
        CampaignTemplate.organization_id == current_user.organization_id,
        CampaignTemplate.status == "published",
        CampaignTemplate.is_deleted == False,
        CampaignTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(404, "Published template not found.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed.")

    try:
        df = pd.read_csv(file.file, dtype=str)
    except Exception:
        raise HTTPException(400, "Invalid CSV file.")

    df.columns = (
        df.columns
        .str.replace("\ufeff", "", regex=False)
        .str.strip()
        .str.lower()
    )

    schema_fields = list(df.columns)
    errors: List[Dict] = []

    # 1️⃣ Recipient Column Check
    if recipient_column not in schema_fields:
        errors.append({
            "type": "missing_recipient_column",
            "column": recipient_column,
            "message": f"Recipient column '{recipient_column}' not found in CSV."
        })

    # 2️⃣ Template Variables Check
    for var in template.variables or []:
        normalized_var = normalize_column(var)
        if normalized_var not in schema_fields:
            errors.append({
                "type": "missing_template_variable",
                "column": var,
                "message": f"Template variable '{var}' missing in CSV."
            })

    # 3️⃣ Filter Validation
    if template.filter_dsl:
        for cond in template.filter_dsl.get("conditions", []):
            raw_col = cond.get("column")
            operator = cond.get("operator")

            col = normalize_column(raw_col)

            if col not in schema_fields:
                errors.append({
                    "type": "missing_filter_column",
                    "column": raw_col,
                    "message": f"Filter column '{raw_col}' missing in CSV."
                })
                continue

            detected_type = detect_column_type(df[col])

            if not validate_datatype_for_operator(detected_type, operator):
                errors.append({
                    "type": "datatype_mismatch",
                    "column": raw_col,
                    "expected": "number",
                    "found": detected_type,
                    "message": f"Column '{raw_col}' must be numeric for operator '{operator}'."
                })

    if errors:
        return {
            "valid": False,
            "errors": errors
        }

    # Apply filter preview
    try:
        filtered_df = apply_filter(df, template.filter_dsl or {}, [])
    except Exception as e:
        return {
            "valid": False,
            "errors": [{
                "type": "filter_error",
                "message": str(e)
            }]
        }

    return {
        "valid": True,
        "total_rows": len(df),
        "filtered_rows": len(filtered_df),
        "schema": [
            {
                "name": col,
                "type": detect_column_type(df[col])
            }
            for col in df.columns
        ]
    }


# =====================================================
# 2️⃣ RUN EXECUTION
# =====================================================

@router.post("/run")
async def run_execution(
    logical_id: str = Form(...),
    channel_type: str = Form(...),
    recipient_column: str = Form(...),
    integration_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    recipient_column = normalize_column(recipient_column)

    template = db.query(CampaignTemplate).filter(
        CampaignTemplate.logical_id == logical_id,
        CampaignTemplate.organization_id == current_user.organization_id,
        CampaignTemplate.status == "published",
        CampaignTemplate.is_deleted == False,
        CampaignTemplate.is_active == True
    ).first()

    if not template:
        raise HTTPException(404, "Published template not found.")

    integration = db.query(ChannelIntegration).filter(
        ChannelIntegration.id == integration_id,
        ChannelIntegration.organization_id == current_user.organization_id,
        ChannelIntegration.channel_type == channel_type,
        ChannelIntegration.is_active == True
    ).first()

    if not integration:
        raise HTTPException(400, "Invalid or inactive integration.")

    # Save file
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(EXECUTION_UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    # Create execution record
    execution = CampaignExecution(
        organization_id=current_user.organization_id,
        campaign_template_id=template.id,
        file_path=file_path,
        channel_type=channel_type,
        recipient_column=recipient_column,
        channel_integration_id=integration.id,
        status="queued",
        total_count=0,
        processed_count=0,
        success_count=0,
        failure_count=0,
        triggered_by=current_user.id,
        created_at=datetime.utcnow()
    )

    db.add(execution)
    db.commit()
    db.refresh(execution)

    # Start background execution
    threading.Thread(
        target=run_campaign_execution,
        args=(execution.id,),
        daemon=True
    ).start()

    return {
        "success": True,
        "execution_id": execution.id,
        "status": "queued"
    }


# =====================================================
# 3️⃣ GET EXECUTION STATUS
# =====================================================

@router.get("/{execution_id}")
def get_execution_status(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    execution = db.query(CampaignExecution).filter(
        CampaignExecution.id == execution_id,
        CampaignExecution.organization_id == current_user.organization_id
    ).first()

    if not execution:
        raise HTTPException(404, "Execution not found.")

    return {
        "execution_id": execution.id,
        "status": execution.status,
        "channel_type": execution.channel_type,
        "total": execution.total_count,
        "processed": execution.processed_count,
        "success": execution.success_count,
        "failed": execution.failure_count,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "duration_seconds": execution.execution_duration_seconds
    }


# =====================================================
# 4️⃣ LIST EXECUTIONS
# =====================================================

@router.get("/")
def list_executions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    executions = db.query(CampaignExecution).filter(
        CampaignExecution.organization_id == current_user.organization_id
    ).order_by(CampaignExecution.created_at.desc()).all()

    return {
        "total": len(executions),
        "executions": [
            {
                "execution_id": e.id,
                "template_id": e.campaign_template_id,
                "status": e.status,
                "success": e.success_count,
                "failed": e.failure_count,
                "created_at": e.created_at
            }
            for e in executions
        ]
    }


# =====================================================
# 5️⃣ CANCEL EXECUTION
# =====================================================

@router.post("/{execution_id}/cancel")
def cancel_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    execution = db.query(CampaignExecution).filter(
        CampaignExecution.id == execution_id,
        CampaignExecution.organization_id == current_user.organization_id
    ).first()

    if not execution:
        raise HTTPException(404, "Execution not found.")

    if execution.status not in ["queued", "running"]:
        raise HTTPException(
            400,
            "Only queued or running executions can be cancelled."
        )

    execution.status = "cancelled"
    db.commit()

    return {
        "success": True,
        "message": "Execution cancelled."
    }


# =====================================================
# 6️⃣ GET EXECUTION LOGS (Paginated)
# =====================================================

@router.get("/{execution_id}/logs")
def get_execution_logs(
    execution_id: int,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):

    execution = db.query(CampaignExecution).filter(
        CampaignExecution.id == execution_id,
        CampaignExecution.organization_id == current_user.organization_id
    ).first()

    if not execution:
        raise HTTPException(404, "Execution not found.")

    offset = (page - 1) * limit

    logs = db.query(ExecutionLog).filter(
        ExecutionLog.campaign_execution_id == execution_id
    ).order_by(ExecutionLog.created_at.desc()).offset(offset).limit(limit).all()

    total_logs = db.query(ExecutionLog).filter(
        ExecutionLog.campaign_execution_id == execution_id
    ).count()

    return {
        "total_logs": total_logs,
        "page": page,
        "limit": limit,
        "logs": [
            {
                "recipient": log.recipient_value,
                "status": log.delivery_status,
                "error": log.provider_response_message,
                "retry_count": log.retry_count,
                "timestamp": log.created_at
            }
            for log in logs
        ]
    }


# =====================================================
# 7️⃣ PREVIEW SCHEMA
# =====================================================

@router.post("/preview-schema")
async def preview_schema(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed.")

    try:
        df = pd.read_csv(file.file, dtype=str)
    except Exception:
        raise HTTPException(400, "Invalid CSV file.")

    df.columns = (
        df.columns
        .str.replace("\ufeff", "", regex=False)
        .str.strip()
        .str.lower()
    )

    schema = [
        {
            "name": col,
            "type": detect_column_type(df[col])
        }
        for col in df.columns
    ]

    return {
        "row_count": len(df),
        "schema": schema,
        "sample_rows": df.head(5).to_dict(orient="records")
    }