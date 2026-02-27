# app/core/progress_manager.py

from typing import Dict, Set
from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)


class ProgressManager:
    """
    Manages WebSocket connections per execution.
    Safe for 1–2K row executions.
    Organization isolation must be handled in websocket route.
    """

    def __init__(self):
        # execution_id -> set of websocket connections
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    # =====================================================
    # CONNECT
    # =====================================================

    async def connect(self, execution_id: int, websocket: WebSocket):
        await websocket.accept()

        async with self.lock:
            if execution_id not in self.active_connections:
                self.active_connections[execution_id] = set()

            self.active_connections[execution_id].add(websocket)

    # =====================================================
    # DISCONNECT
    # =====================================================

    async def disconnect(self, execution_id: int, websocket: WebSocket):
        async with self.lock:
            if execution_id in self.active_connections:
                self.active_connections[execution_id].discard(websocket)

                # Clean up empty execution bucket
                if not self.active_connections[execution_id]:
                    del self.active_connections[execution_id]

    # =====================================================
    # SAFE BROADCAST
    # =====================================================

    async def broadcast(self, execution_id: int, message: dict):
        """
        Broadcast progress update to all clients of that execution.
        Does NOT hold lock while sending (important for performance).
        """

        async with self.lock:
            connections = list(
                self.active_connections.get(execution_id, set())
            )

        if not connections:
            return

        dead_connections = []

        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        # Cleanup dead connections
        if dead_connections:
            async with self.lock:
                for conn in dead_connections:
                    self.active_connections.get(execution_id, set()).discard(conn)


# Singleton instance
progress_manager = ProgressManager()