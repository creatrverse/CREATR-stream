import os
import logging
from typing import Optional, Dict, List
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)


class ChatBotService:
    """Service to handle chat bot commands and responses"""
    
    def __init__(self):
        self.channel_name = os.getenv('TWITCH_CHANNEL_NAME', '').lower()
        self.command_cooldowns: Dict[str, datetime] = {}
        self.user_command_cooldowns: Dict[str, Dict[str, datetime]] = {}
        self.global_cooldown = 3  # seconds between same command globally
        self.user_cooldown = 30  # seconds between commands per user
        self.discord_manager = None
        self.irc_chat = None
        
        # Command definitions
        self.commands = {
            '!queue': self._handle_queue_command,
            '!task': self._handle_task_command,
            '!grwm': self._handle_grwm_command,
            '!commands': self._handle_commands_list,
            '!help': self._handle_help_command,
        }
    
    def set_discord_manager(self, discord_manager):
        """Set reference to discord manager for queue data"""
        self.discord_manager = discord_manager
    
    def set_irc_chat(self, irc_chat):
        """Set reference to IRC chat for sending messages"""
        self.irc_chat = irc_chat
    
    def _check_cooldown(self, command: str, username: str) -> bool:
        """Check if command is on cooldown"""
        now = datetime.now(timezone.utc)
        
        # Check global cooldown for this command
        if command in self.command_cooldowns:
            time_since_last = (now - self.command_cooldowns[command]).total_seconds()
            if time_since_last < self.global_cooldown:
                return False
        
        # Check user cooldown
        if username not in self.user_command_cooldowns:
            self.user_command_cooldowns[username] = {}
        
        if command in self.user_command_cooldowns[username]:
            time_since_last = (now - self.user_command_cooldowns[username][command]).total_seconds()
            if time_since_last < self.user_cooldown:
                return False
        
        return True
    
    def _update_cooldown(self, command: str, username: str):
        """Update cooldown timestamps"""
        now = datetime.now(timezone.utc)
        self.command_cooldowns[command] = now
        if username not in self.user_command_cooldowns:
            self.user_command_cooldowns[username] = {}
        self.user_command_cooldowns[username][command] = now
    
    async def _handle_queue_command(self, username: str, args: List[str]) -> Optional[str]:
        """Handle !queue command"""
        if not self.discord_manager:
            return "Queue system not available."
        
        stats = self.discord_manager.get_stats()
        queue = self.discord_manager.get_queue()
        
        # Get pending submissions
        pending = [sub for sub in queue if sub['status'] == 'pending']
        
        if not pending:
            return "The queue is currently empty! Submit your tracks in Discord!"
        
        # Show first 3 in queue
        response = f"📋 Queue ({stats['pending']} pending): "
        for i, sub in enumerate(pending[:3], 1):
            response += f"{i}. {sub['discord_display_name']} "
        
        if len(pending) > 3:
            response += f"(+{len(pending) - 3} more)"
        
        return response
    
    async def _handle_task_command(self, username: str, args: List[str]) -> Optional[str]:
        """Handle !task command"""
        # This could be integrated with a task management system
        # For now, return a placeholder
        return f"@{username} Task bot is currently in development! Stay tuned for updates! 🚧"
    
    async def _handle_grwm_command(self, username: str, args: List[str]) -> Optional[str]:
        """Handle !grwm command"""
        return "🎀 Get Ready With Me! Today's vibes: cozy stream, good music, and great company! ✨"
    
    async def _handle_commands_list(self, username: str, args: List[str]) -> Optional[str]:
        """Handle !commands command"""
        available_commands = ", ".join(self.commands.keys())
        return f"Available commands: {available_commands}"
    
    async def _handle_help_command(self, username: str, args: List[str]) -> Optional[str]:
        """Handle !help command"""
        return "Type !commands to see all available commands. Use !queue to check the music queue!"
    
    async def process_message(self, message_data: Dict) -> Optional[str]:
        """Process a chat message and return response if it's a command"""
        try:
            message_text = message_data.get('message', '').strip()
            username = message_data.get('username', 'user')
            
            # Check if message starts with a command
            if not message_text.startswith('!'):
                return None
            
            # Parse command and arguments
            parts = message_text.split()
            command = parts[0].lower()
            args = parts[1:] if len(parts) > 1 else []
            
            # Check if command exists
            if command not in self.commands:
                return None
            
            # Check cooldown
            if not self._check_cooldown(command, username):
                logger.info(f"Command {command} from {username} is on cooldown")
                return None
            
            # Execute command
            handler = self.commands[command]
            response = await handler(username, args)
            
            if response:
                # Update cooldown
                self._update_cooldown(command, username)
                logger.info(f"Command {command} executed by {username}: {response}")
                return response
            
            return None
            
        except Exception as e:
            logger.error(f"Error processing command: {e}")
            return None
    
    async def send_message(self, message: str):
        """Send a message to chat via IRC"""
        if self.irc_chat and self.irc_chat.writer:
            try:
                chat_message = f"PRIVMSG #{self.channel_name} :{message}\r\n"
                self.irc_chat.writer.write(chat_message.encode('utf-8'))
                await self.irc_chat.writer.drain()
                logger.info(f"Bot sent message: {message}")
            except Exception as e:
                logger.error(f"Error sending bot message: {e}")


# Global instance
chat_bot = ChatBotService()
