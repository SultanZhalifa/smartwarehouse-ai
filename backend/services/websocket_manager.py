"""
Smart Warehouse — WebSocket Connection Manager
================================================
Thread-safe WebSocket broadcasting for real-time
alert notifications to connected dashboard clients.
"""

import asyncio
from typing import List
from fastapi import WebSocket

# Event loop reference (set during app startup)
global_loop = None


class ConnectionManager:
    """Manages active WebSocket connections with thread-safe broadcasting."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def broadcast_sync(self, message: dict):
        """Thread-safe broadcast from background threads to async WebSocket clients."""
        if global_loop and global_loop.is_running():
            dead_connections = []
            for connection in self.active_connections:
                try:
                    asyncio.run_coroutine_threadsafe(
                        connection.send_json(message), global_loop
                    )
                except Exception:
                    dead_connections.append(connection)
            # Clean up dead connections
            for dc in dead_connections:
                if dc in self.active_connections:
                    self.active_connections.remove(dc)


# Singleton instance
manager = ConnectionManager()
