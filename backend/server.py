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


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# OBS Models
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
    action: str  # start, stop

# Twitch Models
class TwitchMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    badges: List[str] = []
    color: str = "#9147FF"

class TwitchStats(BaseModel):
    viewers: int
    followers: int
    subscribers: int
    stream_title: str
    stream_category: str
    uptime_minutes: int

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
    status: str = "queued"  # queued, playing, played, skipped

class MusicSubmissionCreate(BaseModel):
    artist: str
    title: str
    url: str
    submitted_by: str

class MusicVote(BaseModel):
    song_id: str
    vote: int  # 1-10

# Alert Models
class StreamAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # follower, subscriber, donation, raid
    username: str
    message: str
    amount: Optional[int] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Mock data stores
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

twitch_state = {
    "stream_title": "🎵 Music Review Stream | Submit Your Tracks!",
    "stream_category": "Music",
    "viewers": 0,
    "followers": 15234,
    "subscribers": 487,
    "uptime_start": None
}

music_queue = []
recent_alerts = []

# Mock chat messages
mock_usernames = ["xXMusicLuvr", "VibezOnly", "KalliesFan", "BeatSeeker420", "MelodyQueen", 
                  "PixelPrincess", "Y2KVibes", "StreamSniper", "ChatMod_Sarah", "ProducerMike"]
mock_messages = [
    "This song is fire! 🔥",
    "Can you react to my submission next?",
    "Love the Y2K setup Kallie!",
    "What's the current queue position?",
    "That drop was insane!",
    "!queue",
    "Rating this 10/10",
    "Submit mine please!",
    "The vibes are immaculate ✨",
    "This stream aesthetic is everything"
]


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "CREATR Dashboard API"}

# OBS Endpoints
@api_router.get("/obs/stats", response_model=OBSStats)
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
        twitch_state["uptime_start"] = datetime.now(timezone.utc)
        twitch_state["viewers"] = random.randint(50, 150)
    elif control.action == "stop":
        obs_state["streaming"] = False
        twitch_state["uptime_start"] = None
        twitch_state["viewers"] = 0
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

# Twitch Endpoints
@api_router.get("/twitch/stats", response_model=TwitchStats)
async def get_twitch_stats():
    uptime_minutes = 0
    if twitch_state["uptime_start"]:
        uptime_minutes = int((datetime.now(timezone.utc) - twitch_state["uptime_start"]).total_seconds() / 60)
    
    # Simulate viewer fluctuation
    if obs_state["streaming"] and twitch_state["viewers"] > 0:
        twitch_state["viewers"] += random.randint(-5, 10)
        twitch_state["viewers"] = max(10, min(500, twitch_state["viewers"]))
    
    return TwitchStats(
        viewers=twitch_state["viewers"],
        followers=twitch_state["followers"],
        subscribers=twitch_state["subscribers"],
        stream_title=twitch_state["stream_title"],
        stream_category=twitch_state["stream_category"],
        uptime_minutes=uptime_minutes
    )

@api_router.post("/twitch/title")
async def update_stream_title(update: StreamTitleUpdate):
    twitch_state["stream_title"] = update.title
    return {"success": True, "title": twitch_state["stream_title"]}

@api_router.get("/twitch/chat", response_model=List[TwitchMessage])
async def get_chat_messages():
    # Generate mock messages
    messages = []
    for _ in range(random.randint(3, 8)):
        msg = TwitchMessage(
            username=random.choice(mock_usernames),
            message=random.choice(mock_messages),
            badges=random.sample(["moderator", "subscriber", "vip"], k=random.randint(0, 2)),
            color=random.choice(["#9147FF", "#FF69B4", "#00D9FF", "#FFD700", "#FF6B6B"])
        )
        messages.append(msg)
    return messages

@api_router.post("/twitch/marker")
async def create_marker():
    return {"success": True, "message": "Stream marker created", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/twitch/alerts", response_model=List[StreamAlert])
async def get_alerts():
    # Generate random alerts
    if random.random() > 0.7 and obs_state["streaming"]:
        alert_types = [
            {"type": "follower", "username": random.choice(mock_usernames), "message": "just followed!"},
            {"type": "subscriber", "username": random.choice(mock_usernames), "message": "just subscribed!"},
            {"type": "donation", "username": random.choice(mock_usernames), "message": "donated", "amount": random.randint(2, 50)},
        ]
        alert_data = random.choice(alert_types)
        alert = StreamAlert(**alert_data)
        recent_alerts.insert(0, alert)
        recent_alerts[:10]  # Keep only last 10
    
    return recent_alerts[:5]

# Music Queue Endpoints
@api_router.post("/music/submit", response_model=MusicSubmission)
async def submit_music(submission: MusicSubmissionCreate):
    song = MusicSubmission(**submission.model_dump())
    
    # Store in MongoDB
    doc = song.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.music_queue.insert_one(doc)
    
    music_queue.append(song)
    return song

@api_router.get("/music/queue", response_model=List[MusicSubmission])
async def get_music_queue():
    # Get from MongoDB
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
    # Set all others to queued/played
    await db.music_queue.update_many({"status": "playing"}, {"$set": {"status": "played"}})
    
    # Set this one to playing
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
    result = await db.music_queue.update_one(
        {"id": vote.song_id},
        {"$inc": {"votes": vote.vote}}
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": "Vote recorded"}
    return {"success": False, "error": "Song not found"}

# Analytics Endpoints
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
        "top_chatters": random.sample(mock_usernames, 5)
    }

# AI Mock Endpoints
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

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()