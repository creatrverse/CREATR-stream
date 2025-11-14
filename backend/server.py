from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import random
import asyncio
from contextlib import asynccontextmanager
import httpx

from twitch_service import twitch_service
from obs_service import obs_service
from irc_chat_service import irc_chat
from oauth_database import TokenData, create_db_and_tables, get_session
from sqlmodel import Session
from oauth_service import oauth_service

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
    # Initialize OAuth database
    create_db_and_tables()
    logger.info("OAuth database initialized")
    
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
    
    # Start IRC chat
    try:
        logger.info("Starting IRC chat integration...")
        
        # Set callback for chat messages
        async def on_irc_message(msg):
            await manager.broadcast({'type': 'chat_message', 'data': msg})
        
        irc_chat.set_message_callback(on_irc_message)
        
        # Start IRC in background
        asyncio.create_task(irc_chat.connect())
        
        logger.info("IRC chat integration started")
    except Exception as e:
        logger.error(f"Failed to start IRC chat: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down integrations...")
    await twitch_service.stop()
    await obs_service.disconnect()
    await irc_chat.disconnect()
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
async def get_twitch_stats(session: Session = Depends(get_session)):
    """Get real Twitch stream stats"""
    try:
        stream_info = await twitch_service.get_stream_info()
        channel_info = await twitch_service.get_channel_info()
        uptime = await twitch_service.get_uptime()
        
        # Try to get subscriber count if authenticated
        subscriber_count = 487  # Default mock
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if token_data:
            # Refresh token if needed
            if token_data.expires_at < datetime.now(timezone.utc):
                try:
                    new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
                    token_data.access_token = new_token_response['access_token']
                    token_data.refresh_token = new_token_response['refresh_token']
                    token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                        seconds=new_token_response.get('expires_in', 3600)
                    )
                    session.add(token_data)
                    session.commit()
                except Exception as e:
                    logger.error(f"Failed to refresh token: {e}")
                    pass
            
            # Try to get real subscriber count
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"https://api.twitch.tv/helix/subscriptions?broadcaster_id={token_data.user_id}&first=1",
                        headers={
                            'Authorization': f'Bearer {token_data.access_token}',
                            'Client-ID': os.getenv('TWITCH_CLIENT_ID')
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        subscriber_count = data.get('total', 487)
            except Exception as e:
                logger.error(f"Failed to get subscriber count: {e}")
        
        if not stream_info or not channel_info:
            return {
                "viewers": 0,
                "followers": 0,
                "subscribers": subscriber_count,
                "stream_title": "🎵 Music Review Stream | Submit Your Tracks!",
                "stream_category": "Music",
                "uptime_minutes": 0
            }
        
        uptime_minutes = uptime['total_seconds'] // 60 if uptime else 0
        
        return {
            "viewers": stream_info.get('viewer_count', 0),
            "followers": channel_info.get('followers', 0),
            "subscribers": subscriber_count,
            "stream_title": channel_info.get('title', ''),
            "stream_category": channel_info.get('game_name', 'Music'),
            "uptime_minutes": uptime_minutes
        }
    except Exception as e:
        logger.error(f"Error getting Twitch stats: {e}")
        return {
            "viewers": 0,
            "followers": 0,
            "subscribers": 487,
            "stream_title": "Error loading data",
            "stream_category": "",
            "uptime_minutes": 0
        }

@api_router.get("/twitch/chat")
async def get_chat_messages():
    """Get recent chat messages from IRC"""
    messages = irc_chat.get_recent_messages()
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

# Real OBS Endpoints
@api_router.get("/obs/stats")
async def get_obs_stats():
    """Get real OBS statistics"""
    if not obs_service.connected:
        # Fallback to mock if OBS not connected
        return OBSStats(
            streaming=False,
            recording=False,
            cpu_usage=0,
            gpu_usage=0,
            fps=0,
            bitrate=0,
            dropped_frames=0,
            current_scene="OBS Not Connected"
        )
    
    stats = await obs_service.get_stats()
    return OBSStats(
        streaming=stats['streaming'],
        recording=stats['recording'],
        cpu_usage=stats['cpu_usage'],
        gpu_usage=stats['memory_usage'],  # Using memory as GPU proxy
        fps=stats['fps'],
        bitrate=stats['output_bitrate'],
        dropped_frames=stats['dropped_frames'],
        current_scene=stats['current_scene']
    )

@api_router.post("/obs/stream")
async def control_stream(control: StreamControl):
    """Control OBS streaming"""
    if not obs_service.connected:
        return {"success": False, "error": "OBS not connected"}
    
    if control.action == "start":
        success = await obs_service.start_streaming()
    elif control.action == "stop":
        success = await obs_service.stop_streaming()
    else:
        return {"success": False, "error": "Invalid action"}
    
    stats = await obs_service.get_stats()
    return {"success": success, "streaming": stats['streaming']}

@api_router.post("/obs/recording")
async def control_recording(control: StreamControl):
    """Control OBS recording"""
    if not obs_service.connected:
        return {"success": False, "error": "OBS not connected"}
    
    if control.action == "start":
        success = await obs_service.start_recording()
    elif control.action == "stop":
        success = await obs_service.stop_recording()
    else:
        return {"success": False, "error": "Invalid action"}
    
    stats = await obs_service.get_stats()
    return {"success": success, "recording": stats['recording']}

@api_router.get("/obs/scenes")
async def get_scenes():
    """Get list of OBS scenes"""
    if not obs_service.connected:
        return {"scenes": ["OBS Not Connected"], "current": "OBS Not Connected"}
    
    scenes = await obs_service.get_scenes()
    stats = await obs_service.get_stats()
    return {"scenes": scenes, "current": stats['current_scene']}

@api_router.post("/obs/scene")
async def switch_scene(switch: SceneSwitch):
    """Switch OBS scene"""
    if not obs_service.connected:
        return {"success": False, "error": "OBS not connected"}
    
    success = await obs_service.switch_scene(switch.scene_name)
    stats = await obs_service.get_stats()
    return {"success": success, "current_scene": stats['current_scene']}

@api_router.get("/obs/sources")
async def get_sources():
    """Get OBS sources"""
    if not obs_service.connected:
        return {"sources": {}}
    
    sources = await obs_service.get_sources()
    return {"sources": sources}

@api_router.post("/obs/source")
async def toggle_source(toggle: SourceToggle):
    """Toggle OBS source visibility"""
    if not obs_service.connected:
        return {"success": False, "error": "OBS not connected"}
    
    success = await obs_service.toggle_source(toggle.source_name, toggle.visible)
    return {"success": success, "source": toggle.source_name, "visible": toggle.visible}

@api_router.post("/obs/clip")
async def save_clip():
    """Save OBS replay buffer"""
    if not obs_service.connected:
        return {"success": False, "error": "OBS not connected"}
    
    success = await obs_service.save_replay_buffer()
    if success:
        return {"success": True, "message": "Replay buffer saved!", "filename": f"replay_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"}
    return {"success": False, "error": "Failed to save replay buffer"}

# OAuth Endpoints
@api_router.get("/auth/login")
async def oauth_login():
    """Redirect to Twitch OAuth authorization"""
    auth_url = oauth_service.get_authorization_url()
    return {"authorization_url": auth_url}

@api_router.get("/auth/callback")
async def oauth_callback(code: str, session: Session = Depends(get_session)):
    """Handle OAuth callback from Twitch"""
    try:
        # Exchange code for tokens
        token_response = await oauth_service.exchange_code_for_token(code)
        
        if 'error' in token_response:
            raise HTTPException(status_code=400, detail=token_response.get('error_description'))
        
        # Get user info
        user_info = await oauth_service.get_user_info(token_response['access_token'])
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user information")
        
        user_id = user_info['id']
        username = user_info['login']
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_response.get('expires_in', 3600))
        
        # Check if token exists for this user
        from sqlmodel import select
        existing_token = session.exec(select(TokenData).where(TokenData.user_id == user_id)).first()
        
        if existing_token:
            # Update existing token
            existing_token.access_token = token_response['access_token']
            existing_token.refresh_token = token_response['refresh_token']
            existing_token.expires_at = expires_at
            existing_token.scopes = token_response.get('scope', oauth_service.scopes)
            existing_token.updated_at = datetime.now(timezone.utc)
            session.add(existing_token)
        else:
            # Create new token
            new_token = TokenData(
                user_id=user_id,
                username=username,
                access_token=token_response['access_token'],
                refresh_token=token_response['refresh_token'],
                expires_at=expires_at,
                scopes=token_response.get('scope', oauth_service.scopes)
            )
            session.add(new_token)
        
        session.commit()
        
        # Create session token for frontend
        session_token = oauth_service.create_session_token(user_id, timedelta(days=7))
        
        # Redirect to frontend with session token
        frontend_url = os.getenv('FRONTEND_URL', 'https://obs-twitch-dash.preview.emergentagent.com')
        return RedirectResponse(url=f"{frontend_url}/?session_token={session_token}&auth=success")
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/auth/user")
async def get_current_user(session: Session = Depends(get_session)):
    """Get current authenticated user"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if token needs refresh
    if token_data.expires_at < datetime.now(timezone.utc):
        try:
            # Refresh token
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            
            if 'error' in new_token_response:
                raise HTTPException(status_code=401, detail="Token refresh failed")
            
            token_data.access_token = new_token_response['access_token']
            token_data.refresh_token = new_token_response['refresh_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_token_response.get('expires_in', 3600)
            )
            token_data.updated_at = datetime.now(timezone.utc)
            session.add(token_data)
            session.commit()
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    return {
        "user_id": token_data.user_id,
        "username": token_data.username,
        "access_token": token_data.access_token,
        "scopes": token_data.scopes
    }

@api_router.post("/auth/logout")
async def oauth_logout(session: Session = Depends(get_session)):
    """Logout and clear OAuth tokens"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if token_data:
        session.delete(token_data)
        session.commit()
    
    return {"status": "logged out"}

@api_router.get("/auth/status")
async def auth_status(session: Session = Depends(get_session)):
    """Check if user is authenticated"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    return {
        "authenticated": token_data is not None,
        "username": token_data.username if token_data else None
    }

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
