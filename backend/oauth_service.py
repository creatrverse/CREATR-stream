import os
import httpx
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from jose import jwt
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class OAuthService:
    def __init__(self):
        self.client_id = os.getenv('TWITCH_CLIENT_ID')
        self.client_secret = os.getenv('TWITCH_CLIENT_SECRET')
        self.redirect_uri = os.getenv('TWITCH_REDIRECT_URI', 'https://obs-twitch-dash.preview.emergentagent.com/auth/callback')
        self.scopes = 'channel:read:subscriptions clips:edit channel:manage:broadcast user:read:email'
        self.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production-12345678')
        self.algorithm = 'HS256'
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """Generate Twitch OAuth authorization URL"""
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': self.scopes
        }
        if state:
            params['state'] = state
        
        query_string = '&'.join([f"{k}={v.replace(' ', '+')}" for k, v in params.items()])
        return f"https://id.twitch.tv/oauth2/authorize?{query_string}"
    
    async def exchange_code_for_token(self, code: str) -> Dict:
        """Exchange authorization code for access token"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    'https://id.twitch.tv/oauth2/token',
                    data={
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'code': code,
                        'grant_type': 'authorization_code',
                        'redirect_uri': self.redirect_uri
                    }
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Token exchange failed: {e}")
                raise
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh expired access token"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    'https://id.twitch.tv/oauth2/token',
                    data={
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'refresh_token': refresh_token,
                        'grant_type': 'refresh_token'
                    }
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Token refresh failed: {e}")
                raise
    
    async def get_user_info(self, access_token: str) -> Optional[Dict]:
        """Get user information from Twitch"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    'https://api.twitch.tv/helix/users',
                    headers={
                        'Authorization': f'Bearer {access_token}',
                        'Client-ID': self.client_id
                    }
                )
                response.raise_for_status()
                data = response.json()
                if data.get('data'):
                    return data['data'][0]
                return None
            except Exception as e:
                logger.error(f"Failed to get user info: {e}")
                return None
    
    async def validate_token(self, access_token: str) -> Optional[Dict]:
        """Validate token with Twitch"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    'https://id.twitch.tv/oauth2/validate',
                    headers={'Authorization': f'Bearer {access_token}'}
                )
                if response.status_code == 200:
                    return response.json()
                return None
            except Exception as e:
                logger.error(f"Token validation failed: {e}")
                return None
    
    def create_session_token(self, user_id: str, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT session token for frontend"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(hours=24)
        
        to_encode = {
            'user_id': user_id,
            'exp': expire
        }
        
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_session_token(self, token: str) -> Optional[Dict]:
        """Verify JWT session token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None

# Global instance
oauth_service = OAuthService()
