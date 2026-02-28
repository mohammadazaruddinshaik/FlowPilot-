# app/api/ws_routes.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from urllib.parse import parse_qs
from datetime import datetime

from app.database import SessionLocal
from app.models.db_models import CampaignExecution
from app.core.progress_manager import progress_manager
from app.core.security import decode_access_token


router = APIRouter()


# =====================================================
# WEBSOCKET: EXECUTION PROGRESS (SECURE)
# =====================================================

@router.websocket("/ws/execution/{execution_id}")
async def execution_ws(websocket: WebSocket, execution_id: int):

    query_params = parse_qs(websocket.url.query)
    token = query_params.get("token", [None])[0]

    if not token:
        await websocket.close(code=1008)
        return

    payload = decode_access_token(token)

    if not payload:
        await websocket.close(code=1008)
        return

    user_id = payload.get("user_id")
    organization_id = payload.get("organization_id")

    if not user_id or not organization_id:
        await websocket.close(code=1008)
        return

    # ---------------------------------------------
    # 2️⃣ Validate Execution Ownership
    # ---------------------------------------------
    db: Session = SessionLocal()

    try:
        execution = db.query(CampaignExecution).filter(
            CampaignExecution.id == execution_id,
            CampaignExecution.organization_id == organization_id
        ).first()

        if not execution:
            await websocket.close(code=1008)
            return

        # ---------------------------------------------
        # 3️⃣ Accept Connection
        # ---------------------------------------------
        await progress_manager.connect(execution_id, websocket)

        # Send initial state immediately
        await websocket.send_json({
            "status": execution.status,
            "processed": execution.processed_count,
            "total": execution.total_count,
            "success": execution.success_count,
            "failed": execution.failure_count,
            "timestamp": datetime.utcnow().isoformat()
        })

        # ---------------------------------------------
        # 4️⃣ Keep Alive Loop
        # ---------------------------------------------
        while True:
            # Receive heartbeat from frontend
            await websocket.receive_text()

    except WebSocketDisconnect:
        await progress_manager.disconnect(execution_id, websocket)

    except Exception:
        await websocket.close(code=1011)

    finally:
        db.close()