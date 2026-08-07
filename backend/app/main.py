from fastapi import FastAPI, WebSocket

from fastapi.middleware.cors import CORSMiddleware

from contextlib import asynccontextmanager

import asyncio

import logging

from app.core.config import settings

from app.api import documents, review, health, auth

from app.workers.service_bus_receiver import ServiceBusReceiver



logger = logging.getLogger(__name__)



# Global receiver instance

service_bus_receiver = None



# WebSocket connections for real-time updates

active_websockets = set()





@asynccontextmanager

async def lifespan(app: FastAPI):

    # Startup: Service Bus receiver disabled until queue is created in Azure

    # Using direct processing fallback

    logger.info("Service Bus receiver disabled - using direct processing fallback")

    

    # Fix stuck processing documents on startup

    from app.services.processing_service import ProcessingService

    processing_service = ProcessingService()

    logger.info("Checking for documents stuck in processing status...")

    await processing_service.fix_stuck_processing_documents()

    

    yield

    

    # Shutdown

    logger.info("Application shutdown complete")





app = FastAPI(

    title=settings.app_name,

    version=settings.app_version,

    debug=settings.debug,

    lifespan=lifespan

)



# CORS middleware

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "https://formbridge-mauve.vercel.app",

        "http://localhost:3000",

        "ws://localhost:3000",

        "wss://formbridge-mauve.vercel.app",

        "http://localhost:8000",

        "ws://localhost:8000",

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)



# Include routers

app.include_router(health.router, prefix="/api", tags=["health"])

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

app.include_router(documents.router, prefix="/api/documents", tags=["documents"])

app.include_router(review.router, prefix="/api/review", tags=["review"])





@app.get("/")

async def root():

    return {

        "message": "FormBridge API",

        "version": settings.app_version,

        "status": "running"

    }





@app.websocket("/ws")

async def websocket_endpoint(websocket: WebSocket):

    """

    WebSocket endpoint for real-time document status updates

    """

    await websocket.accept()

    active_websockets.add(websocket)

    logger.info(f"WebSocket connection established. Total connections: {len(active_websockets)}")

    

    try:

        while True:

            # Keep connection alive and handle client messages

            data = await websocket.receive_text()

            # Echo back or handle client messages if needed

            await websocket.send_json({"type": "pong", "message": "Connection alive"})

    except Exception as e:

        logger.error(f"WebSocket error: {str(e)}")

    finally:

        active_websockets.remove(websocket)

        logger.info(f"WebSocket connection closed. Total connections: {len(active_websockets)}")





async def broadcast_document_update(document_id: str, status: str, progress: int = None, step: str = None):

    """

    Broadcast document status update to all connected WebSocket clients

    """

    message = {

        "type": "document_update",

        "document_id": document_id,

        "status": status,

        "progress": progress,

        "step": step,

        "timestamp": asyncio.get_event_loop().time()

    }

    

    disconnected = set()

    for ws in active_websockets:

        try:

            await ws.send_json(message)

        except Exception as e:

            logger.error(f"Error sending WebSocket message: {str(e)}")

            disconnected.add(ws)

    

    # Remove disconnected websockets

    for ws in disconnected:

        active_websockets.remove(ws)

    

    if disconnected:

        logger.info(f"Removed {len(disconnected)} disconnected WebSocket clients")

