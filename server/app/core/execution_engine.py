# app/core/execution_engine.py

import asyncio
import time
import os
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.db_models import (
    CampaignExecution,
    CampaignTemplate,
    ChannelIntegration,
    ExecutionLog,
)
from app.core.filter_engine import apply_filter
from app.core.template_engine import render_template
from app.core.dataset_validator import validate_dataset_compatibility
from app.channels.factory import get_channel
from app.core.progress_manager import progress_manager


# =====================================================
# CONFIG (STABLE FOR 1–2K ROWS)
# =====================================================

ROW_PARALLELISM = 10
MAX_RETRIES = 2
LOG_BATCH_SIZE = 50
MAX_ROWS_ALLOWED = 2000
PROGRESS_BROADCAST_INTERVAL = 10


# =====================================================
# RATE LIMITER
# =====================================================

class AsyncRateLimiter:
    def __init__(self, rate_per_minute: int):
        self.interval = 60 / max(rate_per_minute, 1)
        self.last_called = 0
        self.lock = asyncio.Lock()

    async def wait(self):
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_called
            if elapsed < self.interval:
                await asyncio.sleep(self.interval - elapsed)
            self.last_called = time.time()


# =====================================================
# NORMALIZER
# =====================================================

def normalize_column(value: str) -> str:
    if not value:
        return ""
    return str(value).replace("\ufeff", "").strip().lower()


# =====================================================
# SAFE ENTRY POINT
# =====================================================

def run_campaign_execution(execution_id: int):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(execute_campaign(execution_id))
    loop.close()


# =====================================================
# PROCESS SINGLE ROW
# =====================================================

async def process_row(
    row_dict,
    recipient_column,
    template,
    channel,
    rate_limiter,
):
    retry_count = 0
    sent_successfully = False
    last_error = None
    rendered_message = None

    recipient_value = row_dict.get(recipient_column)

    if not recipient_value:
        return {
            "recipient": None,
            "rendered_message": None,
            "success": False,
            "error": "Missing recipient value",
            "retry_count": 0,
        }

    while retry_count <= MAX_RETRIES and not sent_successfully:
        try:
            rendered_message = render_template(
                template.template,
                row_dict
            )

            await rate_limiter.wait()

            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                channel.send,
                str(recipient_value),
                rendered_message,
            )

            if isinstance(response, dict) and response.get("success") is True:
                sent_successfully = True
            else:
                last_error = (
                    response.get("response_message")
                    if isinstance(response, dict)
                    else "Provider error"
                )
                retry_count += 1
                await asyncio.sleep(2 ** retry_count)

        except Exception as e:
            last_error = str(e)
            retry_count += 1
            await asyncio.sleep(2 ** retry_count)

    return {
        "recipient": str(recipient_value),
        "rendered_message": rendered_message if sent_successfully else None,
        "success": sent_successfully,
        "error": last_error,
        "retry_count": retry_count,
    }


# =====================================================
# MAIN EXECUTION
# =====================================================

async def execute_campaign(execution_id: int):

    db: Session = SessionLocal()
    execution = None

    try:
        execution = db.query(CampaignExecution).filter(
            CampaignExecution.id == execution_id
        ).first()

        if not execution or execution.status != "queued":
            return

        execution.status = "running"
        execution.started_at = datetime.utcnow()
        db.commit()

        template = db.query(CampaignTemplate).filter(
            CampaignTemplate.id == execution.campaign_template_id
        ).first()

        integration = db.query(ChannelIntegration).filter(
            ChannelIntegration.id == execution.channel_integration_id,
            ChannelIntegration.is_active == True
        ).first()

        if not template or not integration:
            raise Exception("Missing template or integration.")

        if not execution.file_path or not os.path.exists(execution.file_path):
            raise Exception("Execution file not found.")

        df = pd.read_csv(execution.file_path, dtype=str)

        if df.empty:
            execution.status = "completed"
            execution.total_count = 0
            execution.completed_at = datetime.utcnow()
            execution.execution_duration_seconds = 0
            db.commit()
            return

        if len(df) > MAX_ROWS_ALLOWED:
            raise Exception(f"Max {MAX_ROWS_ALLOWED} rows allowed.")

        df.columns = (
            df.columns
            .str.replace("\ufeff", "", regex=False)
            .str.strip()
            .str.lower()
        )

        recipient_column = normalize_column(execution.recipient_column)

        # Build schema
        schema = []
        for col in df.columns:
            if pd.to_numeric(df[col], errors="coerce").notna().all():
                schema.append({"name": col, "type": "number"})
            else:
                schema.append({"name": col, "type": "string"})

        # Validate compatibility
        is_valid, errors = validate_dataset_compatibility(
            template,
            schema,
            recipient_column
        )

        if not is_valid:
            raise Exception(str(errors))

        # Apply filter
        filtered_df = apply_filter(
            df,
            template.filter_dsl or {},
            schema
        )

        execution.total_count = len(filtered_df)
        execution.processed_count = 0
        execution.success_count = 0
        execution.failure_count = 0
        db.commit()

        if execution.total_count == 0:
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            db.commit()
            return

        channel = get_channel(integration.channel_type, integration)
        rate_limiter = AsyncRateLimiter(
            integration.rate_limit_per_minute or 60
        )

        records = filtered_df.to_dict(orient="records")

        log_batch = []

        for idx, row in enumerate(records, start=1):

            db.refresh(execution)
            if execution.status == "cancelled":
                return

            result = await process_row(
                row,
                recipient_column,
                template,
                channel,
                rate_limiter,
            )

            log = ExecutionLog(
                campaign_execution_id=execution.id,
                channel_type=execution.channel_type,
                recipient_value=result["recipient"],
                rendered_message=result["rendered_message"],
                delivery_status="delivered" if result["success"] else "failed",
                is_failed=not result["success"],
                provider_response_message=result["error"],
                retry_count=result["retry_count"],
                is_retried=result["retry_count"] > 0,
                sent_at=datetime.utcnow() if result["success"] else None
            )

            log_batch.append(log)

            if result["success"]:
                execution.success_count += 1
            else:
                execution.failure_count += 1

            execution.processed_count += 1

            # Commit counters every 10 rows
            if idx % 10 == 0:
                db.commit()

            # Batch insert logs
            if len(log_batch) >= LOG_BATCH_SIZE:
                try:
                    db.bulk_save_objects(log_batch)
                    db.commit()
                except IntegrityError:
                    db.rollback()
                log_batch.clear()

            # Broadcast progress
            if idx % PROGRESS_BROADCAST_INTERVAL == 0:
                await progress_manager.broadcast(execution.id, {
                    "status": "running",
                    "processed": execution.processed_count,
                    "total": execution.total_count,
                    "success": execution.success_count,
                    "failed": execution.failure_count,
                    "progress_percent": round(
                        (execution.processed_count / execution.total_count) * 100,
                        2
                    )
                })

        if log_batch:
            try:
                db.bulk_save_objects(log_batch)
                db.commit()
            except IntegrityError:
                db.rollback()

        db.commit()

        execution.status = "completed"
        execution.completed_at = datetime.utcnow()
        execution.execution_duration_seconds = int(
            (execution.completed_at - execution.started_at).total_seconds()
        )
        db.commit()

        await progress_manager.broadcast(execution.id, {
            "status": "completed",
            "processed": execution.processed_count,
            "total": execution.total_count,
            "success": execution.success_count,
            "failed": execution.failure_count,
            "progress_percent": 100
        })

    except Exception as e:
        if execution:
            execution.status = "failed"
            execution.failure_reason = str(e)
            db.commit()

            await progress_manager.broadcast(execution.id, {
                "status": "failed",
                "error": str(e)
            })

    finally:
        try:
            if execution and execution.file_path and os.path.exists(execution.file_path):
                os.remove(execution.file_path)
        except Exception:
            pass

        db.close()