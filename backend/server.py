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
import json

from twitch_service import twitch_service
from obs_service import obs_service
from irc_chat_service import irc_chat
from oauth_database import TokenData, create_db_and_tables, get_session
from sqlmodel import Session
from oauth_service import oauth_service
from discord_service import discord_manager

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
    
    # Start Discord bot
    try:
        logger.info("Starting Discord integration...")
        asyncio.create_task(discord_manager.start())
        logger.info("Discord bot started")
    except Exception as e:
        logger.error(f"Failed to start Discord bot: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down integrations...")
    await twitch_service.stop()
    await obs_service.disconnect()
    await irc_chat.disconnect()
    await discord_manager.stop()
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

class StreamCategoryUpdate(BaseModel):
    category: str

class StreamTagsUpdate(BaseModel):
    tags: List[str]

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
            # Refresh token if needed (make expires_at timezone-aware if needed)
            expires_at = token_data.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if expires_at < datetime.now(timezone.utc):
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
async def update_stream_title(update: StreamTitleUpdate, session: Session = Depends(get_session)):
    """Update stream title using OAuth"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Refresh token if needed (make expires_at timezone-aware if needed)
    expires_at = token_data.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        try:
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.refresh_token = new_token_response['refresh_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_token_response.get('expires_in', 3600)
            )
            session.add(token_data)
            session.commit()
        except:
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"https://api.twitch.tv/helix/channels?broadcaster_id={token_data.user_id}",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID'),
                    'Content-Type': 'application/json'
                },
                json={"title": update.title}
            )
            
            if response.status_code == 204:
                return {"success": True, "title": update.title}
            else:
                return {"success": False, "error": "Failed to update title"}
    except Exception as e:
        logger.error(f"Failed to update stream title: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/category")
async def update_stream_category(update: StreamCategoryUpdate, session: Session = Depends(get_session)):
    """Update stream category using OAuth"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Refresh token if needed
    expires_at = token_data.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        try:
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.refresh_token = new_token_response['refresh_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_token_response.get('expires_in', 3600)
            )
            session.add(token_data)
            session.commit()
        except:
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    try:
        # First, search for the game/category ID
        async with httpx.AsyncClient() as client:
            # Search for the category
            search_response = await client.get(
                f"https://api.twitch.tv/helix/search/categories?query={update.category}",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID')
                }
            )
            
            if search_response.status_code != 200:
                return {"success": False, "error": "Failed to find category"}
            
            categories = search_response.json().get('data', [])
            if not categories:
                return {"success": False, "error": f"Category '{update.category}' not found"}
            
            # Get the first matching category ID
            game_id = categories[0]['id']
            
            # Update the stream category
            update_response = await client.patch(
                f"https://api.twitch.tv/helix/channels?broadcaster_id={token_data.user_id}",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID'),
                    'Content-Type': 'application/json'
                },
                json={"game_id": game_id}
            )
            
            if update_response.status_code == 204:
                return {"success": True, "category": update.category}
            else:
                return {"success": False, "error": "Failed to update category"}
    except Exception as e:
        logger.error(f"Failed to update stream category: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/twitch/tags")
async def get_stream_tags(session: Session = Depends(get_session)):
    """Get current stream tags"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.twitch.tv/helix/channels?broadcaster_id={token_data.user_id}",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID')
                }
            )
            
            if response.status_code == 200:
                data = response.json().get('data', [])
                if data:
                    tags = data[0].get('tags', [])
                    return {"success": True, "tags": tags}
            
            return {"success": False, "tags": []}
    except Exception as e:
        logger.error(f"Failed to get stream tags: {e}")
        return {"success": False, "tags": [], "error": str(e)}

@api_router.post("/twitch/tags")
async def update_stream_tags(update: StreamTagsUpdate, session: Session = Depends(get_session)):
    """Update stream tags using OAuth"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Refresh token if needed
    expires_at = token_data.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        try:
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.refresh_token = new_token_response['refresh_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_token_response.get('expires_in', 3600)
            )
            session.add(token_data)
            session.commit()
        except:
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    try:
        async with httpx.AsyncClient() as client:
            # Twitch API allows up to 10 tags, each max 25 characters
            tags = [tag[:25] for tag in update.tags[:10]]
            
            response = await client.patch(
                f"https://api.twitch.tv/helix/channels?broadcaster_id={token_data.user_id}",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID'),
                    'Content-Type': 'application/json'
                },
                json={"tags": tags}
            )
            
            if response.status_code == 204:
                return {"success": True, "tags": tags}
            else:
                return {"success": False, "error": "Failed to update tags"}
    except Exception as e:
        logger.error(f"Failed to update stream tags: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/marker")
async def create_marker(session: Session = Depends(get_session)):
    """Create stream marker using OAuth"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Refresh token if needed (make expires_at timezone-aware if needed)
    expires_at = token_data.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        try:
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.refresh_token = new_token_response['refresh_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_token_response.get('expires_in', 3600)
            )
            session.add(token_data)
            session.commit()
        except:
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.twitch.tv/helix/streams/markers",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID'),
                    'Content-Type': 'application/json'
                },
                json={"user_id": token_data.user_id, "description": "Dashboard marker"}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "message": "Stream marker created", "data": data}
            else:
                return {"success": False, "error": "Failed to create marker"}
    except Exception as e:
        logger.error(f"Failed to create marker: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/clip")
async def create_twitch_clip(session: Session = Depends(get_session)):
    """Create a Twitch clip using OAuth"""
    from sqlmodel import select
    token_data = session.exec(select(TokenData)).first()
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Refresh token if needed (make expires_at timezone-aware if needed)
    expires_at = token_data.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        try:
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.refresh_token = new_token_response['refresh_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_token_response.get('expires_in', 3600)
            )
            session.add(token_data)
            session.commit()
        except:
            raise HTTPException(status_code=401, detail="Token refresh failed")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.twitch.tv/helix/clips?broadcaster_id={token_data.user_id}",
                headers={
                    'Authorization': f'Bearer {token_data.access_token}',
                    'Client-ID': os.getenv('TWITCH_CLIENT_ID')
                }
            )
            
            if response.status_code == 202:
                data = response.json()
                clip_data = data.get('data', [{}])[0]
                return {
                    "success": True,
                    "message": "Clip created!",
                    "clip_id": clip_data.get('id'),
                    "edit_url": clip_data.get('edit_url')
                }
            else:
                return {"success": False, "error": "Failed to create clip"}
    except Exception as e:
        logger.error(f"Failed to create clip: {e}")
        return {"success": False, "error": str(e)}

@api_router.get("/twitch/alerts")
async def get_alerts():
    # Mock alerts for now
    return []

@api_router.post("/twitch/ad")
async def run_ad(duration: dict, session: Session = Depends(get_session)):
    """Run a Twitch ad"""
    try:
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Refresh token if needed
        expires_at = token_data.expires_at.replace(tzinfo=timezone.utc) if token_data.expires_at.tzinfo is None else token_data.expires_at
        if expires_at < datetime.now(timezone.utc):
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_token_response['expires_in'])
            session.add(token_data)
            session.commit()
        
        # Run ad using Twitch API
        headers = {
            'Authorization': f'Bearer {token_data.access_token}',
            'Client-Id': os.getenv('TWITCH_CLIENT_ID'),
            'Content-Type': 'application/json'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.twitch.tv/helix/channels/commercial",
                headers=headers,
                json={
                    "broadcaster_id": token_data.user_id,
                    "length": duration.get('duration', 30)
                }
            )
        
        if response.status_code == 200:
            return {"success": True, "message": f"Ad started ({duration.get('duration')}s)"}
        else:
            return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"Failed to run ad: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/poll")
async def create_poll(poll_data: dict, session: Session = Depends(get_session)):
    """Create a Twitch poll"""
    try:
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Refresh token if needed
        expires_at = token_data.expires_at.replace(tzinfo=timezone.utc) if token_data.expires_at.tzinfo is None else token_data.expires_at
        if expires_at < datetime.now(timezone.utc):
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_token_response['expires_in'])
            session.add(token_data)
            session.commit()
        
        headers = {
            'Authorization': f'Bearer {token_data.access_token}',
            'Client-Id': os.getenv('TWITCH_CLIENT_ID'),
            'Content-Type': 'application/json'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.twitch.tv/helix/polls",
                headers=headers,
                json={
                    "broadcaster_id": token_data.user_id,
                    "title": poll_data.get('title', 'New Poll'),
                    "choices": poll_data.get('choices', [{"title": "Yes"}, {"title": "No"}]),
                    "duration": poll_data.get('duration', 60)
                }
            )
        
        if response.status_code == 200:
            return {"success": True, "message": "Poll created"}
        else:
            return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"Failed to create poll: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/prediction")
async def create_prediction(prediction_data: dict, session: Session = Depends(get_session)):
    """Create a Twitch prediction"""
    try:
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Refresh token if needed
        expires_at = token_data.expires_at.replace(tzinfo=timezone.utc) if token_data.expires_at.tzinfo is None else token_data.expires_at
        if expires_at < datetime.now(timezone.utc):
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_token_response['expires_in'])
            session.add(token_data)
            session.commit()
        
        headers = {
            'Authorization': f'Bearer {token_data.access_token}',
            'Client-Id': os.getenv('TWITCH_CLIENT_ID'),
            'Content-Type': 'application/json'
        }
        
        response = await httpx_client.post(
            "https://api.twitch.tv/helix/predictions",
            headers=headers,
            json={
                "broadcaster_id": token_data.user_id,
                "title": prediction_data.get('title', 'New Prediction'),
                "outcomes": prediction_data.get('outcomes', [{"title": "Yes"}, {"title": "No"}]),
                "prediction_window": prediction_data.get('duration', 120)
            }
        )
        
        if response.status_code == 200:
            return {"success": True, "message": "Prediction created"}
        else:
            return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"Failed to create prediction: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/shoutout")
async def shoutout_streamer(shoutout_data: dict, session: Session = Depends(get_session)):
    """Send a shoutout to another streamer"""
    try:
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Refresh token if needed
        expires_at = token_data.expires_at.replace(tzinfo=timezone.utc) if token_data.expires_at.tzinfo is None else token_data.expires_at
        if expires_at < datetime.now(timezone.utc):
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_token_response['expires_in'])
            session.add(token_data)
            session.commit()
        
        headers = {
            'Authorization': f'Bearer {token_data.access_token}',
            'Client-Id': os.getenv('TWITCH_CLIENT_ID'),
            'Content-Type': 'application/json'
        }
        
        # Get user ID for the username to shoutout
        username = shoutout_data.get('username', '')
        if not username:
            return {"success": False, "error": "Username required"}
        
        user_response = await httpx_client.get(
            f"https://api.twitch.tv/helix/users?login={username}",
            headers=headers
        )
        
        if user_response.status_code == 200:
            users = user_response.json().get('data', [])
            if not users:
                return {"success": False, "error": "User not found"}
            
            to_broadcaster_id = users[0]['id']
            
            response = await httpx_client.post(
                f"https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id={token_data.user_id}&to_broadcaster_id={to_broadcaster_id}&moderator_id={token_data.user_id}",
                headers=headers
            )
            
            if response.status_code == 204:
                return {"success": True, "message": f"Shoutout sent to {username}"}
            else:
                return {"success": False, "error": response.text}
        else:
            return {"success": False, "error": "Failed to find user"}
    except Exception as e:
        logger.error(f"Failed to send shoutout: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/raid")
async def start_raid(raid_data: dict, session: Session = Depends(get_session)):
    """Start a raid"""
    try:
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Refresh token if needed
        expires_at = token_data.expires_at.replace(tzinfo=timezone.utc) if token_data.expires_at.tzinfo is None else token_data.expires_at
        if expires_at < datetime.now(timezone.utc):
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_token_response['expires_in'])
            session.add(token_data)
            session.commit()
        
        headers = {
            'Authorization': f'Bearer {token_data.access_token}',
            'Client-Id': os.getenv('TWITCH_CLIENT_ID'),
            'Content-Type': 'application/json'
        }
        
        # Get user ID for the username to raid
        username = raid_data.get('username', '')
        if not username:
            return {"success": False, "error": "Username required"}
        
        user_response = await httpx_client.get(
            f"https://api.twitch.tv/helix/users?login={username}",
            headers=headers
        )
        
        if user_response.status_code == 200:
            users = user_response.json().get('data', [])
            if not users:
                return {"success": False, "error": "User not found"}
            
            to_broadcaster_id = users[0]['id']
            
            response = await httpx_client.post(
                f"https://api.twitch.tv/helix/raids?from_broadcaster_id={token_data.user_id}&to_broadcaster_id={to_broadcaster_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                return {"success": True, "message": f"Raid started to {username}"}
            else:
                return {"success": False, "error": response.text}
        else:
            return {"success": False, "error": "Failed to find user"}
    except Exception as e:
        logger.error(f"Failed to start raid: {e}")
        return {"success": False, "error": str(e)}

@api_router.post("/twitch/clear-chat")
async def clear_chat(session: Session = Depends(get_session)):
    """Clear chat (delete all messages)"""
    try:
        from sqlmodel import select
        token_data = session.exec(select(TokenData)).first()
        
        if not token_data:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        # Refresh token if needed
        expires_at = token_data.expires_at.replace(tzinfo=timezone.utc) if token_data.expires_at.tzinfo is None else token_data.expires_at
        if expires_at < datetime.now(timezone.utc):
            new_token_response = await oauth_service.refresh_access_token(token_data.refresh_token)
            token_data.access_token = new_token_response['access_token']
            token_data.expires_at = datetime.now(timezone.utc) + timedelta(seconds=new_token_response['expires_in'])
            session.add(token_data)
            session.commit()
        
        headers = {
            'Authorization': f'Bearer {token_data.access_token}',
            'Client-Id': os.getenv('TWITCH_CLIENT_ID'),
            'Content-Type': 'application/json'
        }
        
        response = await httpx_client.delete(
            f"https://api.twitch.tv/helix/moderation/chat?broadcaster_id={token_data.user_id}&moderator_id={token_data.user_id}",
            headers=headers
        )
        
        if response.status_code == 204:
            return {"success": True, "message": "Chat cleared"}
        else:
            return {"success": False, "error": response.text}
    except Exception as e:
        logger.error(f"Failed to clear chat: {e}")
        return {"success": False, "error": str(e)}

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
        
        # Convert scopes to string if it's a list
        scopes = token_response.get('scope', oauth_service.scopes)
        if isinstance(scopes, list):
            scopes = ' '.join(scopes)
        
        if existing_token:
            # Update existing token
            existing_token.access_token = token_response['access_token']
            existing_token.refresh_token = token_response['refresh_token']
            existing_token.expires_at = expires_at
            existing_token.scopes = scopes
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
                scopes=scopes
            )
            session.add(new_token)
        
        session.commit()
        
        # Create session token for frontend
        session_token = oauth_service.create_session_token(user_id, timedelta(days=7))
        
        # Redirect to frontend with session token
        frontend_url = os.getenv('FRONTEND_URL', 'https://streamhub-1222.preview.emergentagent.com')
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
    
    # Check if token needs refresh (make expires_at timezone-aware if needed)
    expires_at = token_data.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
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
    # Get queue stats from Discord
    queue_stats = discord_manager.get_stats()
    
    # Get Twitch stats
    twitch_stats = await twitch_service.get_stream_info()
    channel_info = await twitch_service.get_channel_info()
    
    # Get uptime
    uptime = await twitch_service.get_uptime()
    uptime_minutes = uptime['total_seconds'] // 60 if uptime else 0
    
    # Get IRC chat messages
    chat_messages = twitch_service.get_recent_messages()
    
    return {
        "stream_duration_minutes": uptime_minutes,
        "peak_viewers": twitch_stats.get('viewer_count', 0) if twitch_stats else 0,
        "avg_viewers": twitch_stats.get('viewer_count', 0) if twitch_stats else 0,
        "new_followers": channel_info.get('followers', 0) if channel_info else 0,
        "new_subscribers": 487,  # Twitch API doesn't provide sub count without special permissions
        "total_songs_reviewed": queue_stats['played'],
        "songs_in_queue": queue_stats['pending'],
        "chat_messages": len(chat_messages),
        "clips_created": 0,  # Would need clip API integration
        "top_chatters": [msg['username'] for msg in chat_messages[:5]] if chat_messages else []
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

# Root level OAuth callback (Twitch redirects here without /api prefix)
@app.get("/auth/callback")
async def root_oauth_callback(code: str, session: Session = Depends(get_session)):
    """Handle OAuth callback from Twitch at root level"""
    try:
        # Exchange code for tokens
        token_response = await oauth_service.exchange_code_for_token(code)
        
        if 'error' in token_response:
            logger.error(f"Token exchange error: {token_response}")
            raise HTTPException(status_code=400, detail=token_response.get('error_description'))
        
        # Get user info
        user_info = await oauth_service.get_user_info(token_response['access_token'])
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user information")
        
        user_id = user_info['id']
        username = user_info['login']
        
        logger.info(f"OAuth successful for user: {username} ({user_id})")
        
        # Calculate expiration
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_response.get('expires_in', 3600))
        
        # Check if token exists for this user
        from sqlmodel import select
        existing_token = session.exec(select(TokenData).where(TokenData.user_id == user_id)).first()
        
        # Convert scopes to string if it's a list
        scopes = token_response.get('scope', oauth_service.scopes)
        if isinstance(scopes, list):
            scopes = ' '.join(scopes)
        
        if existing_token:
            # Update existing token
            existing_token.access_token = token_response['access_token']
            existing_token.refresh_token = token_response['refresh_token']
            existing_token.expires_at = expires_at
            existing_token.scopes = scopes
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
                scopes=scopes
            )
            session.add(new_token)
        
        session.commit()
        
        # Redirect to frontend with success flag
        frontend_url = os.getenv('FRONTEND_URL', 'https://streamhub-1222.preview.emergentagent.com')
        redirect_url = f"{frontend_url}/?auth=success"
        
        logger.info(f"Redirecting to: {redirect_url}")
        
        response = RedirectResponse(url=redirect_url)
        # Set a simple cookie to indicate authentication
        response.set_cookie(
            key="twitch_auth",
            value=user_id,
            max_age=7*24*60*60,  # 7 days
            httponly=True,
            samesite="lax"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        # Redirect to frontend with error
        frontend_url = os.getenv('FRONTEND_URL', 'https://streamhub-1222.preview.emergentagent.com')
        return RedirectResponse(url=f"{frontend_url}/?auth=error&message={str(e)}")

# ============================================
# Discord Queue Management Endpoints
# ============================================

@api_router.get("/queue/submissions")
async def get_submissions():
    """Get all pending music submissions"""
    try:
        queue = discord_manager.get_queue()
        return {"submissions": queue, "count": len(queue)}
    except Exception as e:
        logger.error(f"Error getting submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/queue/skips")
async def get_skip_submissions():
    """Get all pending skip submissions"""
    try:
        skip_queue = discord_manager.get_skip_queue()
        return {"submissions": skip_queue, "count": len(skip_queue)}
    except Exception as e:
        logger.error(f"Error getting skip submissions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class MarkSubmissionRequest(BaseModel):
    submission_id: str
    status: str  # 'played' or 'skipped'

@api_router.post("/queue/mark")
async def mark_submission(request: MarkSubmissionRequest):
    """Mark a submission as played or skipped"""
    try:
        success = discord_manager.mark_submission(request.submission_id, request.status)
        if success:
            return {"success": True, "message": f"Submission marked as {request.status}"}
        else:
            raise HTTPException(status_code=404, detail="Submission not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/queue/mark-skip")
async def mark_skip_submission(request: MarkSubmissionRequest):
    """Mark a skip submission as played or skipped"""
    try:
        success = discord_manager.mark_skip_submission(request.submission_id, request.status)
        if success:
            return {"success": True, "message": f"Skip submission marked as {request.status}"}
        else:
            raise HTTPException(status_code=404, detail="Skip submission not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking skip submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UsernameMappingRequest(BaseModel):
    discord_username: str
    twitch_username: str

@api_router.post("/queue/map-username")
async def add_username_mapping(request: UsernameMappingRequest):
    """Map Discord username to Twitch username"""
    try:
        discord_manager.add_username_mapping(request.discord_username, request.twitch_username)
        return {"success": True, "message": "Username mapping added"}
    except Exception as e:
        logger.error(f"Error adding username mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/queue/map-username/{discord_username}")
async def remove_username_mapping(discord_username: str):
    """Remove username mapping"""
    try:
        discord_manager.remove_username_mapping(discord_username)
        return {"success": True, "message": "Username mapping removed"}
    except Exception as e:
        logger.error(f"Error removing username mapping: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/queue/mappings")
async def get_username_mappings():
    """Get all username mappings"""
    try:
        mappings = discord_manager.get_username_mappings()
        return {"mappings": mappings}
    except Exception as e:
        logger.error(f"Error getting username mappings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/queue/stats")
async def get_queue_stats():
    """Get queue statistics"""
    try:
        stats = discord_manager.get_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting queue stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# Sound Board Endpoints
# ============================================

import os
from pathlib import Path
from fastapi import UploadFile, File
from fastapi.responses import FileResponse

SOUNDS_DIR = Path("/app/backend/sounds")
SOUNDS_DIR.mkdir(exist_ok=True)

SOUNDS_METADATA_FILE = SOUNDS_DIR / "metadata.json"

def load_sound_metadata():
    """Load sound metadata from JSON file"""
    try:
        if SOUNDS_METADATA_FILE.exists() and SOUNDS_METADATA_FILE.stat().st_size > 0:
            with open(SOUNDS_METADATA_FILE, 'r') as f:
                return json.load(f)
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Error loading sound metadata: {e}")
    return {}

def save_sound_metadata(metadata):
    """Save sound metadata to JSON file"""
    with open(SOUNDS_METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=2)

@api_router.get("/sounds")
async def get_sounds():
    """Get list of available sounds with metadata"""
    try:
        metadata = load_sound_metadata()
        sounds = []
        for sound_file in SOUNDS_DIR.glob("*"):
            if sound_file.is_file() and sound_file.suffix.lower() in ['.mp3', '.wav', '.ogg', '.m4a']:
                sound_data = {
                    "name": sound_file.name,
                    "size": sound_file.stat().st_size
                }
                # Add metadata if exists
                if sound_file.name in metadata:
                    sound_data.update(metadata[sound_file.name])
                sounds.append(sound_data)
        
        # Sort by saved order if exists
        if '_order' in metadata:
            order = metadata['_order']
            sounds.sort(key=lambda s: order.index(s['name']) if s['name'] in order else 999)
        
        return {"success": True, "sounds": sounds}
    except Exception as e:
        logger.error(f"Error getting sounds: {e}")
        return {"success": False, "sounds": [], "error": str(e)}

@api_router.post("/sounds/upload")
async def upload_sound(sound: UploadFile = File(...)):
    """Upload a sound file"""
    try:
        # Validate file type
        if not sound.filename.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only MP3, WAV, OGG, M4A allowed")
        
        # Save file
        file_path = SOUNDS_DIR / sound.filename
        with open(file_path, "wb") as f:
            content = await sound.read()
            f.write(content)
        
        logger.info(f"Sound uploaded: {sound.filename}")
        return {"success": True, "message": f"Sound {sound.filename} uploaded successfully"}
    except Exception as e:
        logger.error(f"Error uploading sound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sounds/play/{sound_name}")
async def play_sound(sound_name: str):
    """Serve sound file for playback"""
    try:
        file_path = SOUNDS_DIR / sound_name
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Sound not found")
        
        return FileResponse(file_path, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error playing sound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SoundMetadata(BaseModel):
    displayName: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None

class SoundOrder(BaseModel):
    order: List[str]

@api_router.post("/sounds/reorder")
async def reorder_sounds(order_data: SoundOrder):
    """Save sound order"""
    try:
        metadata = load_sound_metadata()
        metadata['_order'] = order_data.order
        save_sound_metadata(metadata)
        logger.info(f"Sound order updated: {len(order_data.order)} sounds")
        return {"success": True, "message": "Sound order saved"}
    except Exception as e:
        logger.error(f"Error saving sound order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.patch("/sounds/{sound_name}")
async def update_sound(sound_name: str, metadata: SoundMetadata):
    """Update sound metadata (display name, color)"""
    try:
        file_path = SOUNDS_DIR / sound_name
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Sound not found")
        
        # Load existing metadata
        all_metadata = load_sound_metadata()
        
        # Update metadata for this sound
        if sound_name not in all_metadata:
            all_metadata[sound_name] = {}
        
        if metadata.displayName is not None:
            all_metadata[sound_name]['displayName'] = metadata.displayName
        if metadata.color is not None:
            all_metadata[sound_name]['color'] = metadata.color
        if metadata.category is not None:
            all_metadata[sound_name]['category'] = metadata.category
        
        # Save metadata
        save_sound_metadata(all_metadata)
        
        logger.info(f"Sound metadata updated: {sound_name}")
        return {"success": True, "message": f"Sound {sound_name} updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/sounds/{sound_name}")
async def delete_sound(sound_name: str):
    """Delete a sound file"""
    try:
        file_path = SOUNDS_DIR / sound_name
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Sound not found")
        
        # Delete file
        file_path.unlink()
        
        # Remove from metadata
        metadata = load_sound_metadata()
        if sound_name in metadata:
            del metadata[sound_name]
            save_sound_metadata(metadata)
        
        logger.info(f"Sound deleted: {sound_name}")
        return {"success": True, "message": f"Sound {sound_name} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting sound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
