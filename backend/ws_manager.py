import json
import uuid
from typing import Dict
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        self.connections[conn_id] = websocket
        return conn_id

    def disconnect(self, conn_id: str):
        self.connections.pop(conn_id, None)

    async def broadcast(self, message: dict):
        dead = []
        for conn_id, ws in self.connections.items():
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                dead.append(conn_id)
        for conn_id in dead:
            self.disconnect(conn_id)

    async def send_to(self, conn_id: str, message: dict):
        ws = self.connections.get(conn_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                self.disconnect(conn_id)
