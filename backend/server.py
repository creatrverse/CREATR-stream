from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import random
import asyncio
from contextlib import asynccontextmanager

from twitch_service import twitch_service
from obs_service import obs_service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def broadcast(self, data: dict):
        """Broadcast message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")

manager = ConnectionManager()

# Lifespan management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown"""
    # Startup
    try:
        logger.info("Starting Twitch integration...")
        await twitch_service.initialize()
        
        # Set callback for chat messages
        async def on_message(msg):
            await manager.broadcast({'type': 'chat_message', 'data': msg})
        
        twitch_service.set_message_callback(on_message)
        
        # Start chat in background
        asyncio.create_task(twitch_service.start_chat())
        
        logger.info("Twitch integration started successfully")
    except Exception as e:
        logger.error(f"Failed to start Twitch integration: {e}")
    
    # Start OBS integration
    try:
        logger.info("Starting OBS integration...")
        await obs_service.connect()
        logger.info("OBS integration started successfully")
    except Exception as e:
        logger.error(f"Failed to start OBS integration: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Twitch integration...")
    await twitch_service.stop()
    logger.info("Shutdown complete")

# Create the main app
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# OBS Models (keeping mock for now)
class OBSStats(BaseModel):
    streaming: bool
    recording: bool
    cpu_usage: float
    gpu_usage: float
    fps: int
    bitrate: int
    dropped_frames: int
    current_scene: str

class SceneSwitch(BaseModel):
    scene_name: str

class SourceToggle(BaseModel):
    source_name: str
    visible: bool

class StreamControl(BaseModel):
    action: str

class StreamTitleUpdate(BaseModel):
    title: str

# Music Queue Models
class MusicSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    artist: str
    title: str
    url: str
    submitted_by: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    votes: int = 0
    status: str = "queued"

class MusicSubmissionCreate(BaseModel):
    artist: str
    title: str
    url: str
    submitted_by: str

class MusicVote(BaseModel):
    song_id: str
    vote: int

# Mock OBS state
obs_state = {
    "streaming": False,
    "recording": False,
    "current_scene": "Main Camera",
    "scenes": ["Main Camera", "Desktop", "BRB", "Starting Soon", "Ending", "Music Review"],
    "sources": {
        "Webcam": True,
        "Microphone": True,
        "Screen Capture": False,
        "Overlay Graphics": True,
        "Chat Box": True,
        "Music Player": True
    }
}

# Routes
@api_router.get("/")
async def root():
    return {"message": "Kallie's Dashboard API - Twitch Connected"}

# Twitch Real Endpoints
@api_router.get("/twitch/stats")
async def get_twitch_stats():
    """Get real Twitch stream stats"""
    try:
        stream_info = await twitch_service.get_stream_info()
        channel_info = await twitch_service.get_channel_info()
        uptime = await twitch_service.get_uptime()
        
        if not stream_info or not channel_info:
            return {
                "viewers": 0,
                "followers": 0,
                "subscribers": 487,  # Mock - requires user auth
                "stream_title": "🎵 Music Review Stream | Submit Your Tracks!",
                "stream_category": "Music",
                "uptime_minutes": 0
            }
        
        uptime_minutes = uptime['total_seconds'] // 60 if uptime else 0
        
        return {
            "viewers": stream_info.get('viewer_count', 0),
            "followers": channel_info.get('followers', 0),
            "subscribers": 487,  # Mock - requires user auth
            "stream_title": channel_info.get('title', ''),
            "stream_category": channel_info.get('game_name', 'Music'),
            "uptime_minutes": uptime_minutes
        }
    except Exception as e:
        logger.error(f"Error getting Twitch stats: {e}")
        return {
            "viewers": 0,
            "followers": 0,
            "subscribers": 0,
            "stream_title": "Error loading data",
            "stream_category": "",
            "uptime_minutes": 0
        }

@api_router.get("/twitch/chat")
async def get_chat_messages():
    """Get recent chat messages"""
    messages = twitch_service.get_recent_messages()
    return messages

@api_router.post("/twitch/title")
async def update_stream_title(update: StreamTitleUpdate):
    success = await twitch_service.update_stream_title(update.title)
    return {"success": success, "message": "Title update requires user authentication"}

@api_router.post("/twitch/marker")
async def create_marker():
    return {"success": False, "message": "Stream markers require user authentication"}

@api_router.get("/twitch/alerts")
async def get_alerts():
    # Mock alerts for now
    return []

# Mock OBS Endpoints
@api_router.get("/obs/stats")
async def get_obs_stats():
    return OBSStats(
        streaming=obs_state["streaming"],
        recording=obs_state["recording"],
        cpu_usage=random.uniform(15, 45),
        gpu_usage=random.uniform(20, 60),
        fps=random.randint(58, 60) if obs_state["streaming"] else 0,
        bitrate=random.randint(5800, 6200) if obs_state["streaming"] else 0,
        dropped_frames=random.randint(0, 5) if obs_state["streaming"] else 0,
        current_scene=obs_state["current_scene"]
    )

@api_router.post("/obs/stream")
async def control_stream(control: StreamControl):
    if control.action == "start":
        obs_state["streaming"] = True
    elif control.action == "stop":
        obs_state["streaming"] = False
    return {"success": True, "streaming": obs_state["streaming"]}

@api_router.post("/obs/recording")
async def control_recording(control: StreamControl):
    if control.action == "start":
        obs_state["recording"] = True
    elif control.action == "stop":
        obs_state["recording"] = False
    return {"success": True, "recording": obs_state["recording"]}

@api_router.get("/obs/scenes")
async def get_scenes():
    return {"scenes": obs_state["scenes"], "current": obs_state["current_scene"]}

@api_router.post("/obs/scene")
async def switch_scene(switch: SceneSwitch):
    if switch.scene_name in obs_state["scenes"]:
        obs_state["current_scene"] = switch.scene_name
        return {"success": True, "current_scene": obs_state["current_scene"]}
    return {"success": False, "error": "Scene not found"}

@api_router.get("/obs/sources")
async def get_sources():
    return {"sources": obs_state["sources"]}

@api_router.post("/obs/source")
async def toggle_source(toggle: SourceToggle):
    if toggle.source_name in obs_state["sources"]:
        obs_state["sources"][toggle.source_name] = toggle.visible
        return {"success": True, "source": toggle.source_name, "visible": toggle.visible}
    return {"success": False, "error": "Source not found"}

@api_router.post("/obs/clip")
async def save_clip():
    return {"success": True, "message": "Clip saved!", "filename": f"clip_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"}

# Music Queue Endpoints
@api_router.post("/music/submit")
async def submit_music(submission: MusicSubmissionCreate):
    song = MusicSubmission(**submission.model_dump())
    doc = song.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.music_queue.insert_one(doc)
    return song

@api_router.get("/music/queue")
async def get_music_queue():
    songs = await db.music_queue.find({"status": "queued"}, {"_id": 0}).sort("timestamp", 1).to_list(100)
    for song in songs:
        if isinstance(song['timestamp'], str):
            song['timestamp'] = datetime.fromisoformat(song['timestamp'])
    return songs

@api_router.get("/music/now-playing")
async def get_now_playing():
    playing = await db.music_queue.find_one({"status": "playing"}, {"_id": 0})
    if playing and isinstance(playing.get('timestamp'), str):
        playing['timestamp'] = datetime.fromisoformat(playing['timestamp'])
    return playing or {"message": "No song currently playing"}

@api_router.post("/music/play/{song_id}")
async def play_song(song_id: str):
    await db.music_queue.update_many({"status": "playing"}, {"$set": {"status": "played"}})
    result = await db.music_queue.update_one({"id": song_id}, {"$set": {"status": "playing"}})
    if result.modified_count > 0:
        return {"success": True, "message": "Song now playing"}
    return {"success": False, "error": "Song not found"}

@api_router.post("/music/skip/{song_id}")
async def skip_song(song_id: str):
    result = await db.music_queue.update_one({"id": song_id}, {"$set": {"status": "skipped"}})
    if result.modified_count > 0:
        return {"success": True, "message": "Song skipped"}
    return {"success": False, "error": "Song not found"}

@api_router.post("/music/vote")
async def vote_song(vote: MusicVote):
    result = await db.music_queue.update_one({"id": vote.song_id}, {"$inc": {"votes": vote.vote}})
    if result.modified_count > 0:
        return {"success": True, "message": "Vote recorded"}
    return {"success": False, "error": "Song not found"}

# Analytics
@api_router.get("/analytics/summary")
async def get_analytics_summary():
    total_songs = await db.music_queue.count_documents({})
    played_songs = await db.music_queue.count_documents({"status": "played"})
    
    return {
        "stream_duration_minutes": random.randint(45, 180),
        "peak_viewers": random.randint(100, 300),
        "avg_viewers": random.randint(80, 150),
        "new_followers": random.randint(15, 45),
        "new_subscribers": random.randint(3, 12),
        "total_songs_reviewed": played_songs,
        "songs_in_queue": total_songs - played_songs,
        "chat_messages": random.randint(500, 2000),
        "clips_created": random.randint(5, 15),
        "top_chatters": ["VibezOnly", "BeatSeeker420", "MelodyQueen", "PixelPrincess", "Y2KVibes"]
    }

# AI Mock
@api_router.get("/ai/sentiment")
async def get_chat_sentiment():
    return {
        "overall": random.choice(["positive", "very_positive", "neutral"]),
        "score": random.uniform(0.7, 0.95),
        "top_emotes": ["🔥", "💖", "✨", "😍", "🎵"],
        "trending_topics": ["#BassBoost", "#Vibes", "#PlayMySong"]
    }

@api_router.get("/ai/highlights")
async def get_highlights():
    return {
        "suggested_clips": [
            {"timestamp": "00:15:30", "reason": "High chat activity + emotional reaction", "score": 0.92},
            {"timestamp": "00:45:12", "reason": "Peak viewer moment + raid event", "score": 0.88},
            {"timestamp": "01:02:45", "reason": "Emotional music reaction + chat spam", "score": 0.85}
        ]
    }

# WebSocket endpoint
@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back for testing
            await websocket.send_json({"type": "pong", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
