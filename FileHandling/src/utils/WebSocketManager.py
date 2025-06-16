from typing import List, Dict, Any
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {} 

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        print(f"WebSocket connected for project {project_id}. Total: {len(self.active_connections[project_id])}")


    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)
                if not self.active_connections[project_id]: 
                    del self.active_connections[project_id]
                print(f"WebSocket disconnected for project {project_id}.")
            
            if project_id in self.active_connections and not self.active_connections[project_id]:
                 del self.active_connections[project_id]


    async def broadcast(self, project_id: str, message_data: Dict[str, Any]):
        if project_id in self.active_connections:
            disconnected_sockets = []
            
            for connection in list(self.active_connections.get(project_id, [])): 
                try:
                    await connection.send_json(message_data)
                except Exception as e: 
                    print(f"Error broadcasting to a websocket for project {project_id}: {e}. Marking for disconnection.")
                    disconnected_sockets.append(connection)
            
            for sock in disconnected_sockets:
                self.disconnect(sock, project_id)


chat_socket_manager = ConnectionManager()
project_socket_manager = ConnectionManager()
