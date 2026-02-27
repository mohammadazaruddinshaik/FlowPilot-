# app/api/campaign_template_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime
import uuid
import re
import pandas as pd
import json

from app.database import get_db
from app.models.db_models import CampaignTemplate, Dataset
from app.core.dependencies import CurrentUser, get_current_user
from app.core.filter_engine import (
    validate_filter_dsl,
    FilterValidationError,
    apply_filter,
)
from app.core.template_engine import render_template


router = APIRouter(prefix="/campaign-template", tags=["Campaign Template"])


# =====================================================
# Utility
# =====================================================

VARIABLE_PATTERN = r"\{\{\s*(.*?)\s*\}\}"

def extract_variables(template: str):
    raw_vars = list(set(re.findall(VARIABLE_PATTERN, template or "")))
    return [v.strip().lower() for v in raw_vars]


def normalize_filter_dsl(filter_dsl: dict):
    if not filter_dsl:
        return None

    normalized_conditions = []

    for cond in filter_dsl.get("conditions", []):
        normalized_conditions.append({
            "column": cond.get("column", "").strip().lower(),
            "operator": cond.get("operator"),
            "value": cond.get("value")
        })

    return {
        "logic": filter_dsl.get("logic", "AND"),
        "conditions": normalized_conditions
    }




# =====================================================
# CREATE TEMPLATE
# =====================================================

@router.post("/")
def create_campaign_template(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    from app.api.dataset_routes import move_temp_to_permanent

    name = payload.get("name")
    template_body = payload.get("template")
    temp_dataset_id = payload.get("temp_dataset_id")
    filter_definition = payload.get("filter_definition")

    if not name or not template_body:
        raise HTTPException(status_code=400, detail="Name and template are required")

    if not temp_dataset_id:
        raise HTTPException(status_code=400, detail="temp_dataset_id is required")

    dataset = move_temp_to_permanent(
        temp_dataset_id=temp_dataset_id,
        db=db,
        current_user=current_user
    )

    normalized_filter = normalize_filter_dsl(filter_definition)

    if normalized_filter:
        try:
            validate_filter_dsl(normalized_filter, dataset.schema)
        except FilterValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))

    logical_id = str(uuid.uuid4())
    variables = extract_variables(template_body)

    template = CampaignTemplate(
        logical_id=logical_id,
        version=1,
        organization_id=current_user.organization_id,
        dataset_id=dataset.id,
        name=name,
        description=payload.get("description"),
        filter_dsl=normalized_filter,
        template=template_body,
        variables=variables,
        status="draft",
        is_active=True,
        is_deleted=False,
        created_by=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return {
        "success": True,
        "logical_id": logical_id,
        "version": 1,
        "dataset_id": dataset.id
    }



# =====================================================
# LIST LATEST PER LOGICAL_ID
# =====================================================

@router.get("/")
def list_latest_templates(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    subquery = (
        db.query(
            CampaignTemplate.logical_id,
            func.max(CampaignTemplate.version).label("max_version")
        )
        .filter(
            CampaignTemplate.organization_id == current_user.organization_id,
            CampaignTemplate.is_deleted == False
        )
        .group_by(CampaignTemplate.logical_id)
        .subquery()
    )

    templates = (
        db.query(CampaignTemplate)
        .join(
            subquery,
            and_(
                CampaignTemplate.logical_id == subquery.c.logical_id,
                CampaignTemplate.version == subquery.c.max_version
            )
        )
        .all()
    )

    return {
        "total": len(templates),
        "templates": [
            {
                "logical_id": t.logical_id,
                "version": t.version,
                "name": t.name,
                "description": t.description,
                "status": t.status,
                "variables": t.variables or [],
                "filter_dsl": t.filter_dsl,
                "dataset_id": t.dataset_id,
                "dataset_schema": t.dataset.schema if t.dataset else None,
                "updated_at": t.updated_at
            }
            for t in templates
        ]
    }


# =====================================================
# GET LATEST VERSION
# =====================================================

@router.get("/{logical_id}")
def get_latest_template(
    logical_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = (
        db.query(CampaignTemplate)
        .filter(
            CampaignTemplate.logical_id == logical_id,
            CampaignTemplate.organization_id == current_user.organization_id,
            CampaignTemplate.is_deleted == False
        )
        .order_by(CampaignTemplate.version.desc())
        .first()
    )

    if not template:
        raise HTTPException(404, "Template not found")

    return template


# =====================================================
# UPDATE (SMART VERSIONED UPDATE)
# =====================================================

@router.put("/{logical_id}")
def update_template(
    logical_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):

    current = (
        db.query(CampaignTemplate)
        .filter(
            CampaignTemplate.logical_id == logical_id,
            CampaignTemplate.organization_id == current_user.organization_id,
            CampaignTemplate.is_deleted == False
        )
        .order_by(CampaignTemplate.version.desc())
        .first()
    )

    if not current:
        raise HTTPException(404, "Template not found")

    dataset = current.dataset

    # Apply selective updates
    new_name = payload.get("name", current.name)
    new_description = payload.get("description", current.description)
    new_template_body = payload.get("template", current.template)
    new_filter_dsl = normalize_filter_dsl(
        payload.get("filter_dsl", current.filter_dsl)
    )

    # Validate filter if modified
    if new_filter_dsl:
        try:
            validate_filter_dsl(new_filter_dsl, dataset.schema)
        except FilterValidationError as e:
            raise HTTPException(400, str(e))

    new_variables = extract_variables(new_template_body)

    new_version = current.version + 1

    new_template = CampaignTemplate(
        logical_id=logical_id,
        version=new_version,
        organization_id=current_user.organization_id,
        dataset_id=current.dataset_id,
        name=new_name,
        description=new_description,
        template=new_template_body,
        variables=new_variables,
        filter_dsl=new_filter_dsl,
        status="draft",
        is_active=True,
        is_deleted=False,
        created_by=current_user.id,
        created_at=current.created_at,
        updated_at=datetime.utcnow()
    )

    db.add(new_template)
    db.commit()

    return {
        "success": True,
        "logical_id": logical_id,
        "version": new_version
    }


# =====================================================
# PUBLISH
# =====================================================

@router.post("/{logical_id}/publish")
def publish_template(
    logical_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    template = (
        db.query(CampaignTemplate)
        .filter(
            CampaignTemplate.logical_id == logical_id,
            CampaignTemplate.organization_id == current_user.organization_id,
            CampaignTemplate.is_deleted == False
        )
        .order_by(CampaignTemplate.version.desc())
        .first()
    )

    if not template:
        raise HTTPException(404, "Template not found")

    template.status = "published"
    template.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "Template published"}


# =====================================================
# SOFT DELETE
# =====================================================

@router.delete("/{logical_id}")
def delete_template(
    logical_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):

    templates = (
        db.query(CampaignTemplate)
        .filter(
            CampaignTemplate.logical_id == logical_id,
            CampaignTemplate.organization_id == current_user.organization_id
        )
        .all()
    )

    if not templates:
        raise HTTPException(404, "Template not found")

    for t in templates:
        t.is_deleted = True
        t.is_active = False

    db.commit()

    return {"success": True}


# =====================================================
# PREVIEW TEMPLATE
# =====================================================

@router.post("/{logical_id}/preview")
def preview_template(
    logical_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):

    template = (
        db.query(CampaignTemplate)
        .filter(
            CampaignTemplate.logical_id == logical_id,
            CampaignTemplate.organization_id == current_user.organization_id,
            CampaignTemplate.is_deleted == False
        )
        .order_by(CampaignTemplate.version.desc())
        .first()
    )

    if not template:
        raise HTTPException(404, "Template not found")

    sample_row = payload.get("sample_row")

    if not sample_row:
        raise HTTPException(400, "sample_row required")

    rendered = render_template(template.template, sample_row)

    return {"rendered_message": rendered}


# =====================================================
# TEST FILTER (STATELESS)
# =====================================================

@router.post("/test-filter")
async def test_filter(
    file: UploadFile = File(...),
    filter_definition: str = Form(None),
    current_user: CurrentUser = Depends(get_current_user)
):

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Only CSV files allowed")

    df = pd.read_csv(file.file, dtype=str)

    df.columns = df.columns.str.strip().str.lower()

    schema = []

    for col in df.columns:
        if pd.to_numeric(df[col], errors="coerce").notna().all():
            schema.append({"name": col, "type": "number"})
        else:
            schema.append({"name": col, "type": "string"})

    if not filter_definition:
        return {
            "matched_count": len(df),
            "matched_rows": df.head(10).to_dict(orient="records"),
            "schema": schema
        }

    try:
        filter_definition = json.loads(filter_definition)
    except:
        raise HTTPException(400, "Invalid filter JSON")

    normalized_filter = normalize_filter_dsl(filter_definition)

    try:
        filtered_df = apply_filter(df, normalized_filter, schema)
    except FilterValidationError as e:
        raise HTTPException(400, str(e))

    return {
        "matched_count": len(filtered_df),
        "matched_rows": filtered_df.head(10).to_dict(orient="records"),
        "schema": schema
    }

