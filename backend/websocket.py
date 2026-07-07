"""
WebSocket connection manager for real-time alert push.
"""

import asyncio
from typing import Any, Dict, List

from fastapi import WebSocket


class AlertWebSocketManager:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.connections.setdefault(user_id, []).append(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket):
        async with self.lock:
            conns = self.connections.get(user_id, [])
            if websocket in conns:
                conns.remove(websocket)
            if not conns and user_id in self.connections:
                del self.connections[user_id]

    async def send_to_user(self, user_id: int, message: Dict[str, Any]):
        async with self.lock:
            conns = list(self.connections.get(user_id, []))
        stale = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        for ws in stale:
            await self.disconnect(user_id, ws)

    async def broadcast_alert(self, alert: Dict[str, Any], event_type: str):
        user_id = alert.get("user_id")
        if user_id is not None:
            await self.send_to_user(user_id, {"type": event_type, "payload": alert})

    async def send_initial_snapshot(self, user_id: int):
        from services import alert_service
        alerts = alert_service.get_actionable_alerts(user_id, limit=50)
        if alerts:
            await self.send_to_user(user_id, {"type": "alert.snapshot", "payload": alerts})


# Singleton used by routes
alert_ws_manager = AlertWebSocketManager()
