import os
import discord
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class DiscordQueueManager:
    def __init__(self):
        self.bot_token = os.getenv('DISCORD_BOT_TOKEN')
        self.server_id = int(os.getenv('DISCORD_SERVER_ID'))
        self.submit_channel_id = int(os.getenv('DISCORD_SUBMIT_CHANNEL_ID'))
        self.skip_channel_id = int(os.getenv('DISCORD_SKIP_CHANNEL_ID'))
        
        # Setup Discord client with intents
        intents = discord.Intents.default()
        intents.message_content = True
        intents.members = True
        intents.presences = True
        
        self.client = discord.Client(intents=intents)
        self.guild: Optional[discord.Guild] = None
        self.submit_channel: Optional[discord.TextChannel] = None
        self.skip_channel: Optional[discord.TextChannel] = None
        
        # In-memory storage (will be replaced with MongoDB later)
        self.submissions = []
        self.skip_submissions = []
        self.username_mappings = {}  # {discord_username: twitch_username}
        
        # Setup event handlers
        self._setup_events()
        
    def _setup_events(self):
        @self.client.event
        async def on_ready():
            logger.info(f'Discord bot logged in as {self.client.user}')
            
            # Get guild and channels
            self.guild = self.client.get_guild(self.server_id)
            if self.guild:
                logger.info(f'Connected to server: {self.guild.name}')
                self.submit_channel = self.guild.get_channel(self.submit_channel_id)
                self.skip_channel = self.guild.get_channel(self.skip_channel_id)
                
                if self.submit_channel:
                    logger.info(f'Monitoring submit channel: {self.submit_channel.name}')
                if self.skip_channel:
                    logger.info(f'Monitoring skip channel: {self.skip_channel.name}')
                    
                # Load recent submissions on startup
                await self._load_recent_submissions()
            else:
                logger.error(f'Could not find guild with ID: {self.server_id}')
        
        @self.client.event
        async def on_message(message):
            # Ignore bot messages
            if message.author.bot:
                return
            
            # Handle submissions in submit channel
            if message.channel.id == self.submit_channel_id:
                await self._handle_submission(message)
            
            # Handle skip submissions
            elif message.channel.id == self.skip_channel_id:
                await self._handle_skip_submission(message)
    
    async def _load_recent_submissions(self):
        """Load recent submissions from Discord history"""
        try:
            if self.submit_channel:
                async for message in self.submit_channel.history(limit=50):
                    if not message.author.bot:
                        await self._handle_submission(message, is_historical=True)
                logger.info(f'Loaded {len(self.submissions)} recent submissions')
            
            if self.skip_channel:
                async for message in self.skip_channel.history(limit=20):
                    if not message.author.bot:
                        await self._handle_skip_submission(message, is_historical=True)
                logger.info(f'Loaded {len(self.skip_submissions)} skip submissions')
        except Exception as e:
            logger.error(f'Error loading recent submissions: {e}')
    
    async def _handle_submission(self, message: discord.Message, is_historical=False):
        """Parse and store music submission"""
        try:
            content = message.content
            
            # Extract song link (look for URLs)
            links = [word for word in content.split() if word.startswith('http')]
            if not links:
                return
            
            submission = {
                'id': str(message.id),
                'discord_username': message.author.name,
                'discord_display_name': message.author.display_name,
                'discord_user_id': str(message.author.id),
                'song_link': links[0],
                'message_content': content,
                'submitted_at': message.created_at.isoformat(),
                'status': 'pending',  # pending, played, skipped
                'twitch_username': self.username_mappings.get(message.author.name, None)
            }
            
            # Check if already exists
            if not any(sub['id'] == submission['id'] for sub in self.submissions):
                self.submissions.append(submission)
                if not is_historical:
                    logger.info(f'New submission from {message.author.name}: {links[0]}')
        
        except Exception as e:
            logger.error(f'Error handling submission: {e}')
    
    async def _handle_skip_submission(self, message: discord.Message, is_historical=False):
        """Parse and store skip submission"""
        try:
            content = message.content
            
            # Extract song link
            links = [word for word in content.split() if word.startswith('http')]
            if not links:
                return
            
            skip_submission = {
                'id': str(message.id),
                'discord_username': message.author.name,
                'discord_display_name': message.author.display_name,
                'discord_user_id': str(message.author.id),
                'song_link': links[0],
                'message_content': content,
                'submitted_at': message.created_at.isoformat(),
                'status': 'pending',
                'twitch_username': self.username_mappings.get(message.author.name, None)
            }
            
            if not any(sub['id'] == skip_submission['id'] for sub in self.skip_submissions):
                self.skip_submissions.append(skip_submission)
                if not is_historical:
                    logger.info(f'New skip submission from {message.author.name}')
        
        except Exception as e:
            logger.error(f'Error handling skip submission: {e}')
    
    async def start(self):
        """Start the Discord bot"""
        try:
            logger.info('Starting Discord bot...')
            await self.client.start(self.bot_token)
        except Exception as e:
            logger.error(f'Failed to start Discord bot: {e}')
            raise
    
    async def stop(self):
        """Stop the Discord bot"""
        try:
            await self.client.close()
            logger.info('Discord bot stopped')
        except Exception as e:
            logger.error(f'Error stopping Discord bot: {e}')
    
    def get_queue(self) -> List[Dict]:
        """Get pending submissions in order"""
        return [sub for sub in self.submissions if sub['status'] == 'pending']
    
    def get_skip_queue(self) -> List[Dict]:
        """Get pending skip submissions"""
        return [sub for sub in self.skip_submissions if sub['status'] == 'pending']
    
    def mark_submission(self, submission_id: str, status: str) -> bool:
        """Mark submission as played or skipped"""
        for sub in self.submissions:
            if sub['id'] == submission_id:
                sub['status'] = status
                sub['completed_at'] = datetime.now(timezone.utc).isoformat()
                logger.info(f'Marked submission {submission_id} as {status}')
                return True
        return False
    
    def mark_skip_submission(self, submission_id: str, status: str) -> bool:
        """Mark skip submission as played or skipped"""
        for sub in self.skip_submissions:
            if sub['id'] == submission_id:
                sub['status'] = status
                sub['completed_at'] = datetime.now(timezone.utc).isoformat()
                return True
        return False
    
    def add_username_mapping(self, discord_username: str, twitch_username: str):
        """Map Discord username to Twitch username"""
        self.username_mappings[discord_username] = twitch_username
        
        # Update existing submissions
        for sub in self.submissions + self.skip_submissions:
            if sub['discord_username'] == discord_username:
                sub['twitch_username'] = twitch_username
        
        logger.info(f'Mapped Discord user {discord_username} to Twitch user {twitch_username}')
    
    def remove_username_mapping(self, discord_username: str):
        """Remove username mapping"""
        if discord_username in self.username_mappings:
            del self.username_mappings[discord_username]
            logger.info(f'Removed mapping for {discord_username}')
    
    def get_username_mappings(self) -> Dict:
        """Get all username mappings"""
        return self.username_mappings.copy()
    
    def get_stats(self) -> Dict:
        """Get queue statistics"""
        played = len([s for s in self.submissions if s['status'] == 'played'])
        skipped = len([s for s in self.submissions if s['status'] == 'skipped'])
        pending = len([s for s in self.submissions if s['status'] == 'pending'])
        
        return {
            'total_submissions': len(self.submissions),
            'played': played,
            'skipped': skipped,
            'pending': pending,
            'skip_queue_count': len(self.get_skip_queue())
        }

# Global instance
discord_manager = DiscordQueueManager()
