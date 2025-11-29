import os
import asyncio
import logging
import re
from typing import Optional, Callable, Dict
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class TwitchIRCChat:
    def __init__(self):
        self.channel_name = os.getenv('TWITCH_CHANNEL_NAME', '').lower()
        self.server = 'irc.chat.twitch.tv'
        self.port = 6667
        self.nickname = 'justinfan12345'  # Anonymous viewer
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self.running = False
        self.message_callback: Optional[Callable] = None
        self.recent_messages = []
        self.max_messages = 50
        self.emote_service = None  # Will be set from server.py
        
    def set_message_callback(self, callback: Callable):
        """Register callback for new messages"""
        self.message_callback = callback
    
    def set_emote_service(self, emote_service):
        """Set reference to twitch_service for emote data"""
        self.emote_service = emote_service
    
    async def connect(self):
        """Connect to Twitch IRC server"""
        try:
            logger.info(f"Connecting to Twitch IRC for channel: {self.channel_name}")
            
            # Connect to IRC server
            self.reader, self.writer = await asyncio.open_connection(
                self.server, self.port
            )
            
            # Send authentication (anonymous)
            self.writer.write(f"NICK {self.nickname}\r\n".encode('utf-8'))
            self.writer.write(f"CAP REQ :twitch.tv/tags twitch.tv/commands\r\n".encode('utf-8'))
            self.writer.write(f"JOIN #{self.channel_name}\r\n".encode('utf-8'))
            await self.writer.drain()
            
            self.running = True
            logger.info(f"Connected to #{self.channel_name} IRC chat")
            
            # Start reading messages
            await self._read_messages()
            
        except Exception as e:
            logger.error(f"Failed to connect to IRC: {e}")
            self.running = False
    
    async def _read_messages(self):
        """Read and process IRC messages"""
        while self.running:
            try:
                if not self.reader:
                    break
                    
                line = await asyncio.wait_for(
                    self.reader.readline(),
                    timeout=300  # 5 minute timeout
                )
                
                if not line:
                    logger.warning("IRC connection closed")
                    break
                
                message = line.decode('utf-8', errors='ignore').strip()
                
                # Handle PING to keep connection alive
                if message.startswith('PING'):
                    pong = message.replace('PING', 'PONG')
                    self.writer.write(f"{pong}\r\n".encode('utf-8'))
                    await self.writer.drain()
                    continue
                
                # Parse chat messages
                if 'PRIVMSG' in message:
                    parsed = self._parse_message(message)
                    if parsed:
                        # Store message
                        self.recent_messages.insert(0, parsed)
                        if len(self.recent_messages) > self.max_messages:
                            self.recent_messages.pop()
                        
                        # Call callback
                        if self.message_callback:
                            await self.message_callback(parsed)
                
            except asyncio.TimeoutError:
                # Send PING to keep connection alive
                if self.writer:
                    self.writer.write(b"PING :keepalive\r\n")
                    await self.writer.drain()
                continue
            except Exception as e:
                logger.error(f"Error reading IRC message: {e}")
                break
        
        await self.disconnect()
    
    def _parse_message(self, raw_message: str) -> Optional[dict]:
        """Parse IRC message into structured format"""
        try:
            # Extract tags
            tags = {}
            if raw_message.startswith('@'):
                tag_section = raw_message.split(' ', 1)[0][1:]
                for tag in tag_section.split(';'):
                    if '=' in tag:
                        key, value = tag.split('=', 1)
                        tags[key] = value
            
            # Extract username and message
            # Format: :username!username@username.tmi.twitch.tv PRIVMSG #channel :message
            username_match = re.search(r':(\w+)!', raw_message)
            message_match = re.search(r'PRIVMSG #\w+ :(.+)$', raw_message)
            
            if not username_match or not message_match:
                return None
            
            username = username_match.group(1)
            message_text = message_match.group(1)
            
            # Extract badges
            badges = []
            if 'badges' in tags and tags['badges']:
                badge_list = tags['badges'].split(',')
                for badge in badge_list:
                    if '/' in badge:
                        badge_name = badge.split('/')[0]
                        badges.append(badge_name)
            
            # Get color
            color = tags.get('color', '#9147FF')
            if not color:
                color = '#9147FF'
            
            # Parse emotes from message text
            emotes_list = []
            if self.emote_service:
                emote_data = self.emote_service.get_emotes()
                channel_emotes = emote_data.get('channel_emotes', {})
                global_emotes = emote_data.get('global_emotes', {})
                
                # Split message into words and check each against emote cache
                words = message_text.split()
                current_pos = 0
                
                for word in words:
                    # Find position of this word in the original text
                    word_start = message_text.find(word, current_pos)
                    if word_start == -1:
                        continue
                    word_end = word_start + len(word) - 1
                    
                    # Check if word is a channel emote
                    if word in channel_emotes:
                        emotes_list.append({
                            'id': channel_emotes[word],
                            'name': word,
                            'positions': [[word_start, word_end]]
                        })
                    # Check if word is a global emote
                    elif word in global_emotes:
                        emotes_list.append({
                            'id': global_emotes[word],
                            'name': word,
                            'positions': [[word_start, word_end]]
                        })
                    
                    current_pos = word_end + 1
            
            # Also check IRC tags for emote data
            if 'emotes' in tags and tags['emotes']:
                raw_emotes = tags['emotes']
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
                            # Check if we already have this emote
                            already_exists = any(e['id'] == emote_id for e in emotes_list)
                            if not already_exists:
                                emotes_list.append({
                                    'id': emote_id,
                                    'name': '',
                                    'positions': positions
                                })
            
            return {
                'id': tags.get('id', f"{username}_{datetime.now().timestamp()}"),
                'username': username,
                'message': message_text,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'badges': badges,
                'color': color,
                'emotes': emotes_list
            }
            
        except Exception as e:
            logger.error(f"Error parsing IRC message: {e}")
            return None
    
    def get_recent_messages(self):
        """Get recent chat messages"""
        return self.recent_messages.copy()
    
    async def disconnect(self):
        """Disconnect from IRC"""
        self.running = False
        if self.writer:
            try:
                self.writer.close()
                await self.writer.wait_closed()
            except Exception as e:
                logger.error(f"Error closing IRC connection: {e}")
        logger.info("Disconnected from Twitch IRC")

# Global instance
irc_chat = TwitchIRCChat()
