import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List
from twitchAPI.twitch import Twitch
from twitchAPI.helper import first
from twitchAPI.type import AuthScope
from twitchAPI.chat import Chat, EventData, ChatMessage

logger = logging.getLogger(__name__)

class TwitchService:
    def __init__(self):
        self.client_id = os.getenv('TWITCH_CLIENT_ID')
        self.client_secret = os.getenv('TWITCH_CLIENT_SECRET')
        self.channel_name = os.getenv('TWITCH_CHANNEL_NAME')
        self.twitch: Optional[Twitch] = None
        self.chat: Optional[Chat] = None
        self.user_id: Optional[str] = None
        self.chat_messages: List[Dict] = []
        self.max_messages = 50
        self.recent_alerts: List[Dict] = []
        self.message_callback = None
        
    async def initialize(self):
        """Initialize Twitch API connection"""
        try:
            self.twitch = await Twitch(self.client_id, self.client_secret)
            await self.twitch.authenticate_app([])
            
            # Get user ID for the channel
            user = await first(self.twitch.get_users(logins=[self.channel_name]))
            if user:
                self.user_id = user.id
                logger.info(f"Successfully connected to Twitch. User ID: {self.user_id}")
            else:
                logger.error(f"Channel {self.channel_name} not found")
                
        except Exception as e:
            logger.error(f"Failed to initialize Twitch API: {e}")
            raise
    
    async def start_chat(self):
        """Start listening to chat messages"""
        if not self.twitch:
            await self.initialize()
            
        try:
            self.chat = await Chat(self.twitch)
            
            self.chat.register_event('ready', self._on_ready)
            self.chat.register_event('message', self._on_message)
            
            await self.chat.start()
            logger.info("Chat listener started")
            
        except Exception as e:
            logger.error(f"Failed to start chat: {e}")
    
    async def _on_ready(self, ready_event: EventData):
        """Called when chat is ready"""
        await ready_event.chat.join_room(self.channel_name)
        logger.info(f"Joined chat room: {self.channel_name}")
    
    async def _on_message(self, msg: ChatMessage):
        """Called when a new chat message arrives"""
        message_data = {
            'id': msg.id,
            'username': msg.user.name,
            'message': msg.text,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'badges': [badge.set_id for badge in msg.badges] if msg.badges else [],
            'color': msg.color or '#9147FF'
        }
        
        self.chat_messages.insert(0, message_data)
        if len(self.chat_messages) > self.max_messages:
            self.chat_messages.pop()
        
        # Call callback if registered
        if self.message_callback:
            await self.message_callback(message_data)
    
    def set_message_callback(self, callback):
        """Register callback for new messages"""
        self.message_callback = callback
    
    def get_recent_messages(self) -> List[Dict]:
        """Get recent chat messages"""
        return self.chat_messages
    
    async def get_stream_info(self) -> Optional[Dict]:
        """Get current stream information"""
        if not self.twitch or not self.user_id:
            return None
            
        try:
            stream = await first(self.twitch.get_streams(user_id=[self.user_id]))
            
            if stream:
                return {
                    'is_live': True,
                    'viewer_count': stream.viewer_count,
                    'title': stream.title,
                    'game_name': stream.game_name,
                    'started_at': stream.started_at.isoformat(),
                    'language': stream.language
                }
            else:
                return {
                    'is_live': False,
                    'viewer_count': 0,
                    'title': None,
                    'game_name': None,
                    'started_at': None
                }
        except Exception as e:
            logger.error(f"Error getting stream info: {e}")
            return None
    
    async def get_channel_info(self) -> Optional[Dict]:
        """Get channel information (followers, etc.)"""
        if not self.twitch or not self.user_id:
            return None
            
        try:
            # Get follower count
            followers_response = await self.twitch.get_channel_followers(broadcaster_id=self.user_id)
            follower_count = followers_response.total if followers_response else 0
            
            # Get channel information
            channel = await first(self.twitch.get_channel_information(broadcaster_id=self.user_id))
            
            return {
                'followers': follower_count,
                'title': channel.title if channel else None,
                'game_name': channel.game_name if channel else None
            }
        except Exception as e:
            logger.error(f"Error getting channel info: {e}")
            return None
    
    async def update_stream_title(self, title: str) -> bool:
        """Update stream title (requires user auth, will return False)"""
        # This requires user authentication with channel:manage:broadcast scope
        # For read-only dashboard, this won't work with app token
        logger.warning("Updating stream title requires user authentication")
        return False
    
    async def create_clip(self) -> Optional[Dict]:
        """Create a clip (requires user auth)"""
        # Clips require user authentication with clips:edit scope
        logger.warning("Creating clips requires user authentication")
        return None
    
    async def create_stream_marker(self, description: str = "") -> bool:
        """Create stream marker (requires user auth)"""
        # Markers require user authentication
        logger.warning("Creating markers requires user authentication")
        return False
    
    async def get_uptime(self) -> Optional[Dict]:
        """Calculate stream uptime"""
        stream_info = await self.get_stream_info()
        
        if not stream_info or not stream_info['is_live']:
            return None
        
        started_at = datetime.fromisoformat(stream_info['started_at'].replace('Z', '+00:00'))
        current_time = datetime.now(timezone.utc)
        uptime = current_time - started_at
        
        hours = int(uptime.total_seconds() // 3600)
        minutes = int((uptime.total_seconds() % 3600) // 60)
        seconds = int(uptime.total_seconds() % 60)
        
        return {
            'hours': hours,
            'minutes': minutes,
            'seconds': seconds,
            'total_seconds': int(uptime.total_seconds()),
            'formatted': f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        }
    
    async def stop(self):
        """Clean shutdown"""
        if self.chat:
            await self.chat.stop()
        if self.twitch:
            await self.twitch.close()
        logger.info("Twitch service stopped")

# Global instance
twitch_service = TwitchService()
