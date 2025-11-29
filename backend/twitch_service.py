import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List
from twitchAPI.twitch import Twitch
from twitchAPI.helper import first
from twitchAPI.type import AuthScope
from twitchAPI.chat import Chat, EventData, ChatMessage
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
            logger.info(f"Initializing Twitch with client_id: {self.client_id[:10]}...")
            self.twitch = Twitch(self.client_id, self.client_secret)
            await self.twitch.authenticate_app([])
            logger.info("Authenticated with Twitch")
            
            # Get user ID for the channel
            user = await first(self.twitch.get_users(logins=[self.channel_name]))
            if user:
                self.user_id = user.id
                logger.info(f"Successfully connected to Twitch. User ID: {self.user_id}")
            else:
                logger.error(f"Channel {self.channel_name} not found")
                
        except Exception as e:
            import traceback
            logger.error(f"Failed to initialize Twitch API: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def start_chat(self):
        """Start listening to chat messages"""
        # Chat requires user authentication with chat:read scope
        # For app-only auth, we can't access real-time chat
        # Dashboard will show that chat requires OBS integration or user auth
        logger.warning("Real-time chat requires user authentication - using mock chat")
    
    async def _on_ready(self, ready_event: EventData):
        """Called when chat is ready"""
        await ready_event.chat.join_room(self.channel_name)
        logger.info(f"Joined chat room: {self.channel_name}")
    
    async def _on_message(self, msg: ChatMessage):
        """Called when a new chat message arrives"""
        # Log raw message data for debugging
        logger.info(f"Message received - Text: {msg.text}")
        logger.info(f"Has emotes attr: {hasattr(msg, 'emotes')}, Value: {getattr(msg, 'emotes', None)}")
        logger.info(f"Has tags attr: {hasattr(msg, 'tags')}, Value: {getattr(msg, 'tags', None)}")
        
        # Parse emotes from the message
        emotes_list = []
        if hasattr(msg, 'emotes') and msg.emotes:
            for emote in msg.emotes:
                emotes_list.append({
                    'id': emote.emote_id,
                    'name': getattr(emote, 'emote_set_id', ''),
                    'positions': [[pos.start, pos.end] for pos in emote.positions]
                })
        
        # Also try to get emote data from tags if available
        if hasattr(msg, 'tags') and msg.tags and 'emotes' in msg.tags:
            raw_emotes = msg.tags['emotes']
            if raw_emotes:
                logger.info(f"Found emotes in tags: {raw_emotes}")
                # Parse emotes from IRC tags format: emote_id:start-end,start-end/emote_id:start-end
                for emote_data in raw_emotes.split('/'):
                    if ':' in emote_data:
                        emote_id, positions_str = emote_data.split(':', 1)
                        positions = []
                        for pos_str in positions_str.split(','):
                            if '-' in pos_str:
                                start, end = pos_str.split('-')
                                positions.append([int(start), int(end)])
                        
                        if positions:
                            emotes_list.append({
                                'id': emote_id,
                                'name': '',
                                'positions': positions
                            })
        
        message_data = {
            'id': msg.id,
            'username': msg.user.name,
            'message': msg.text,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'badges': [badge.set_id for badge in msg.badges] if msg.badges else [],
            'color': msg.color or '#9147FF',
            'emotes': emotes_list
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
            
            # Get channel information - returns a list
            channels = await self.twitch.get_channel_information(broadcaster_id=self.user_id)
            channel = channels[0] if channels else None
            
            if channel:
                return {
                    'followers': follower_count,
                    'title': channel.title,
                    'game_name': channel.game_name
                }
            
            return {
                'followers': follower_count,
                'title': None,
                'game_name': None
            }
        except Exception as e:
            logger.error(f"Error getting channel info: {e}")
            import traceback
            logger.error(traceback.format_exc())
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
