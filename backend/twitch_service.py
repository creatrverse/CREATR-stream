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
        self.channel_emotes: Dict[str, str] = {}  # name -> id mapping
        self.global_emotes: Dict[str, str] = {}   # name -> id mapping
        
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
                
                # Fetch channel and global emotes
                await self.fetch_channel_emotes()
            else:
                logger.error(f"Channel {self.channel_name} not found")
                
        except Exception as e:
            import traceback
            logger.error(f"Failed to initialize Twitch API: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def fetch_channel_emotes(self):
        """Fetch channel-specific emotes and global emotes"""
        try:
            if not self.twitch or not self.user_id:
                logger.warning("Cannot fetch emotes - Twitch not initialized")
                return
            
            # Fetch channel emotes
            logger.info(f"Fetching channel emotes for broadcaster ID: {self.user_id}")
            channel_emotes_response = await self.twitch.get_channel_emotes(self.user_id)
            
            for emote in channel_emotes_response:
                # Store emote name -> ID mapping
                self.channel_emotes[emote.name] = emote.id
                logger.info(f"Loaded channel emote: {emote.name} -> {emote.id}")
            
            # Fetch global emotes
            logger.info("Fetching global Twitch emotes")
            global_emotes_response = await self.twitch.get_global_emotes()
            
            for emote in global_emotes_response:
                self.global_emotes[emote.name] = emote.id
            
            logger.info(f"Loaded {len(self.channel_emotes)} channel emotes and {len(self.global_emotes)} global emotes")
            
        except Exception as e:
            logger.error(f"Error fetching emotes: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
    
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
        # Parse emotes from the message text using our cached emote data
        emotes_list = []
        
        # Split message into words and check each against our emote cache
        words = msg.text.split()
        current_pos = 0
        
        for word in words:
            # Find position of this word in the original text
            word_start = msg.text.find(word, current_pos)
            word_end = word_start + len(word) - 1
            
            # Check if word is a channel emote
            if word in self.channel_emotes:
                emotes_list.append({
                    'id': self.channel_emotes[word],
                    'name': word,
                    'positions': [[word_start, word_end]]
                })
            # Check if word is a global emote
            elif word in self.global_emotes:
                emotes_list.append({
                    'id': self.global_emotes[word],
                    'name': word,
                    'positions': [[word_start, word_end]]
                })
            
            current_pos = word_end + 1
        
        # Also try to get emote data from IRC tags if available (fallback)
        if hasattr(msg, 'tags') and msg.tags and 'emotes' in msg.tags:
            raw_emotes = msg.tags['emotes']
            if raw_emotes:
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
                            # Check if we already have this emote from our cache
                            already_exists = any(e['id'] == emote_id for e in emotes_list)
                            if not already_exists:
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
    
    def get_emotes(self) -> Dict:
        """Get cached emote data"""
        return {
            'channel_emotes': self.channel_emotes,
            'global_emotes': self.global_emotes
        }
    
    async def get_user_subscription(self, username: str) -> Optional[Dict]:
        """Get user's subscription status and tier for the channel"""
        if not self.twitch or not self.user_id:
            return None
        
        try:
            # Get user ID from username
            user = await first(self.twitch.get_users(logins=[username]))
            if not user:
                logger.warning(f"User {username} not found on Twitch")
                return {'is_subscribed': False, 'tier': None}
            
            # Check if user is subscribed to the channel
            try:
                is_subscribed = await self.twitch.check_user_subscription(
                    broadcaster_id=self.user_id,
                    user_id=user.id
                )
                
                if is_subscribed:
                    # Tier mapping: 1000 = T1, 2000 = T2, 3000 = T3
                    tier_map = {
                        '1000': 'T1',
                        '2000': 'T2',
                        '3000': 'T3'
                    }
                    tier = tier_map.get(is_subscribed.tier, 'T1')
                    
                    return {
                        'is_subscribed': True,
                        'tier': tier,
                        'is_gift': is_subscribed.is_gift if hasattr(is_subscribed, 'is_gift') else False
                    }
                else:
                    return {'is_subscribed': False, 'tier': None}
                    
            except Exception as e:
                logger.error(f"Error checking subscription for {username}: {e}")
                return {'is_subscribed': False, 'tier': None}
                
        except Exception as e:
            logger.error(f"Error getting user subscription: {e}")
            return None
    
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
