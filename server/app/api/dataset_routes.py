import os
import uuid
import hashlib
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from sqlalchemy import func
from app.models.db_models import CampaignExecution, ExecutionLog
from datetime import datetime, timedelta
import shutil

from app.database import get_db
from app.models.db_models import Dataset, CampaignTemplate, TempDataset
from app.core.csv_engine import parse_csv
from app.core.dependencies import CurrentUser, get_current_user


import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
TEMP_DIR = os.path.join(STORAGE_DIR, "temp")
PERM_DIR = os.path.join(STORAGE_DIR, "permanent")


router = APIRouter(prefix="/dataset", tags=["Dataset"])


# =====================================================
# DIRECTORIES
# =====================================================

UPLOAD_DIR = "uploads"
TEMP_DIR = "temp_uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)



TEMP_DATASETS = {}


# =====================================================
# TEMP UPLOAD (Used During Template Creation)
# =====================================================

@router.post("/temp-upload")
async def temp_upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    temp_id = uuid.uuid4()

    os.makedirs(TEMP_DIR, exist_ok=True)

    file_path = os.path.join(TEMP_DIR, f"{temp_id}.csv")
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    df = pd.read_csv(file_path, dtype=str)
    df.columns = df.columns.str.strip().str.lower()

    schema = [
        {
            "name": col,
            "type": "number" if pd.to_numeric(df[col], errors="coerce").notna().all() else "string"
        }
        for col in df.columns
    ]

    temp = TempDataset(
        id=temp_id,
        organization_id=current_user.organization_id,
        original_filename=file.filename,
        storage_path=file_path,
        schema=schema,
        row_count=len(df)
    )

    db.add(temp)
    db.commit()

    return {
        "temp_dataset_id": str(temp_id),
        "schema": schema,
        "row_count": len(df),
        "preview_rows": df.head(10).to_dict(orient="records")
    }


# =====================================================
# LIST PERMANENT DATASETS (Org Scoped)
# =====================================================
@router.get("/")
def list_datasets(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    List datasets with full schema + analytics insights.
    """

    org_id = current_user.organization_id

    datasets = db.query(Dataset).filter(
        Dataset.organization_id == org_id
    ).order_by(Dataset.created_at.desc()).all()

    response = []

    for d in datasets:

        execution_count = db.query(func.count(CampaignExecution.id)).join(
            CampaignTemplate,
            CampaignExecution.campaign_template_id == CampaignTemplate.id
        ).filter(
            CampaignTemplate.dataset_id == d.id,
            CampaignTemplate.organization_id == org_id
        ).scalar()

        total_messages = db.query(func.count(ExecutionLog.id)).join(
            CampaignExecution
        ).join(
            CampaignTemplate,
            CampaignExecution.campaign_template_id == CampaignTemplate.id
        ).filter(
            CampaignTemplate.dataset_id == d.id,
            CampaignTemplate.organization_id == org_id
        ).scalar()

        success_messages = db.query(func.count(ExecutionLog.id)).join(
            CampaignExecution
        ).join(
            CampaignTemplate,
            CampaignExecution.campaign_template_id == CampaignTemplate.id
        ).filter(
            CampaignTemplate.dataset_id == d.id,
            CampaignTemplate.organization_id == org_id,
            ExecutionLog.delivery_status == "delivered"
        ).scalar()

        success_rate = (
            (success_messages / total_messages) * 100
            if total_messages else 0
        )

        schema = d.schema or []

        column_count = len(schema)

        numeric_columns = len(
            [col for col in schema if col.get("type") == "number"]
        )

        string_columns = column_count - numeric_columns

        response.append({
            "id": d.id,
            "original_filename": d.original_filename,
            "row_count": d.row_count or 0,
            "column_count": column_count,
            "numeric_columns": numeric_columns,
            "string_columns": string_columns,

            # 🔥 FULL SCHEMA INCLUDED
            "schema": schema,

            "execution_count": execution_count or 0,
            "total_messages_sent": total_messages or 0,
            "success_rate_percent": round(success_rate, 2),
            "file_size_kb": round((d.file_size or 0) / 1024, 2),
            "created_at": d.created_at
        })

    return {
        "total": len(response),
        "datasets": response
    }


def move_temp_to_permanent(
    temp_dataset_id: str,
    db: Session,
    current_user
):
    """
    Moves temp dataset file to permanent storage
    and converts TempDataset → Dataset safely.
    """

    # 1️⃣ Fetch temp dataset
    temp = db.query(TempDataset).filter(
        TempDataset.id == temp_dataset_id,
        TempDataset.organization_id == current_user.organization_id
    ).first()

    if not temp:
        raise HTTPException(
            status_code=404,
            detail="Temp dataset not found or expired. Please re-upload."
        )

    source_path = temp.storage_path

    # 2️⃣ Validate file exists
    if not os.path.exists(source_path):
        raise HTTPException(
            status_code=500,
            detail="Temp file missing on server. Please re-upload dataset."
        )

    # 3️⃣ Ensure permanent directory exists
    os.makedirs(PERM_DIR, exist_ok=True)

    # 4️⃣ Build destination path
    file_name = os.path.basename(source_path)
    destination_path = os.path.join(PERM_DIR, file_name)

    try:
        # 5️⃣ Move file safely
        shutil.move(source_path, destination_path)

        # 6️⃣ Create permanent dataset record
        dataset = Dataset(
            organization_id=current_user.organization_id,
            original_filename=temp.original_filename,
            storage_path=destination_path,
            row_count=temp.row_count,
            schema=temp.schema,
            created_at=datetime.utcnow()
        )

        db.add(dataset)

        # 7️⃣ Delete temp record
        db.delete(temp)

        db.commit()
        db.refresh(dataset)

        return dataset

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to move dataset: {str(e)}"
        )