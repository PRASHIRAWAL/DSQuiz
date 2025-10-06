# main.py
import asyncio
import logging
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from session_manager import SessionManager

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")

app = FastAPI(title="Session Service (WebSocket Stub)")

# Simple in-memory mapping: session_id -> set of WebSocket connections
# Protected by asyncio primitives
_connection_lock = asyncio.Lock()
_connections = {}  # session_id -> set(websocket)


async def add_connection(session_id: str, ws: WebSocket):
    async with _connection_lock:
        conns = _connections.setdefault(session_id, set())
        conns.add(ws)
        logging.info(f"[{session_id}] New WS client connected. Total={len(conns)}")


async def remove_connection(session_id: str, ws: WebSocket):
    async with _connection_lock:
        conns = _connections.get(session_id, set())
        if ws in conns:
            conns.remove(ws)
            logging.info(f"[{session_id}] WS client disconnected. Total={len(conns)}")
        if not conns:
            _connections.pop(session_id, None)


async def broadcast(session_id: str, message: dict):
    """
    Send a JSON message to all connected websockets for the session.
    If a websocket fails, we remove it.
    """
    async with _connection_lock:
        conns = list(_connections.get(session_id, set()))
    if not conns:
        logging.debug(f"[{session_id}] No clients to broadcast to.")
        return
    to_remove = []
    for ws in conns:
        try:
            await ws.send_json(message)
        except Exception as e:
            logging.warning(f"[{session_id}] Failed to send to a client: {e}")
            to_remove.append(ws)
    for ws in to_remove:
        await remove_connection(session_id, ws)


@app.websocket("/ws/{session_id}")
async def ws_endpoint(websocket: WebSocket, session_id: str):
    """
    Clients connect here to receive questions and send answers.
    Messages from client are forwarded to the console as a simple demo.
    """
    await websocket.accept()
    await add_connection(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # For the stub: just log incoming client messages (answers)
            logging.info(f"[{session_id}] Received from client: {data}")
            # echo ack back
            await websocket.send_json({"type": "ack", "answer_id": data.get("answer_id")})
    except WebSocketDisconnect:
        logging.info(f"[{session_id}] Client disconnected.")
    finally:
        await remove_connection(session_id, websocket)


# Create a single SessionManager per session you want to demo.
# For a minimal demo, we'll use one session id; you can create more.
SESSION_ID = os.getenv("DEMO_SESSION_ID", "session-101")
QUESTION_INTERVAL = float(os.getenv("QUESTION_INTERVAL", "6.0"))

session_manager: SessionManager = None


@app.on_event("startup")
async def startup_event():
    global session_manager
    logging.info("Starting session service (WebSocket stub)...")
    session_manager = SessionManager(
        session_id=SESSION_ID,
        question_interval=QUESTION_INTERVAL,
        broadcaster=broadcast
    )
    # run the manager as a background task
    asyncio.create_task(session_manager.run())


@app.on_event("shutdown")
async def shutdown_event():
    global session_manager
    if session_manager:
        await session_manager.shutdown()
    logging.info("Session service shutting down.")


@app.get("/")
async def root():
    return JSONResponse({"msg": "session service (ws) up", "session": SESSION_ID})


@app.get("/status/{session_id}")
async def status(session_id: str):
    async with _connection_lock:
        clients = len(_connections.get(session_id, set()))
    return {"session": session_id, "clients": clients, "is_master": session_manager.is_master if session_manager else False}
