import os
import logging
import asyncio
from typing import Optional, Dict, List
from obswebsocket import obsws, requests, events
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class OBSService:
    def __init__(self):
        self.host = os.getenv('OBS_WEBSOCKET_HOST', 'localhost')
        self.port = int(os.getenv('OBS_WEBSOCKET_PORT', '4455'))
        self.password = os.getenv('OBS_WEBSOCKET_PASSWORD', '')
        self.ws: Optional[obsws] = None
        self.connected = False
        self.current_stats = {
            'streaming': False,
            'recording': False,
            'current_scene': 'Unknown',
            'fps': 0,
            'cpu_usage': 0,
            'memory_usage': 0,
            'output_bitrate': 0,
            'dropped_frames': 0
        }
        
    async def connect(self):
        """Connect to OBS WebSocket"""
        try:
            logger.info(f"Connecting to OBS at {self.host}:{self.port}")
            
            # Run connection in executor since obsws is synchronous
            loop = asyncio.get_event_loop()
            self.ws = await loop.run_in_executor(
                None,
                lambda: obsws(self.host, self.port, self.password)
            )
            
            await loop.run_in_executor(None, self.ws.connect)
            
            self.connected = True
            logger.info("Successfully connected to OBS WebSocket")
            
            # Get initial state
            await self.update_stats()
            
        except Exception as e:
            logger.error(f"Failed to connect to OBS: {e}")
            self.connected = False
    
    async def disconnect(self):
        """Disconnect from OBS"""
        if self.ws:
            try:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, self.ws.disconnect)
                logger.info("Disconnected from OBS")
            except Exception as e:
                logger.error(f"Error disconnecting from OBS: {e}")
        self.connected = False
    
    async def _execute_request(self, request_obj):
        """Execute an OBS request in executor"""
        if not self.connected or not self.ws:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, self.ws.call, request_obj)
            return response
        except Exception as e:
            logger.error(f"OBS request failed: {e}")
            return None
    
    async def update_stats(self):
        """Update OBS statistics"""
        if not self.connected:
            return
        
        try:
            # Get streaming status
            stream_status = await self._execute_request(requests.GetStreamStatus())
            if stream_status:
                self.current_stats['streaming'] = stream_status.datain.get('outputActive', False)
                self.current_stats['output_bitrate'] = stream_status.datain.get('outputBytes', 0)
                self.current_stats['dropped_frames'] = stream_status.datain.get('outputSkippedFrames', 0)
            
            # Get recording status
            record_status = await self._execute_request(requests.GetRecordStatus())
            if record_status:
                self.current_stats['recording'] = record_status.datain.get('outputActive', False)
            
            # Get stats
            stats = await self._execute_request(requests.GetStats())
            if stats:
                self.current_stats['fps'] = int(stats.datain.get('activeFps', 0))
                self.current_stats['cpu_usage'] = stats.datain.get('cpuUsage', 0)
                self.current_stats['memory_usage'] = stats.datain.get('memoryUsage', 0)
            
            # Get current scene
            current_scene = await self._execute_request(requests.GetCurrentProgramScene())
            if current_scene:
                self.current_stats['current_scene'] = current_scene.datain.get('currentProgramSceneName', 'Unknown')
                
        except Exception as e:
            logger.error(f"Error updating OBS stats: {e}")
    
    async def get_stats(self) -> Dict:
        """Get current OBS stats"""
        await self.update_stats()
        return self.current_stats.copy()
    
    async def start_streaming(self) -> bool:
        """Start streaming"""
        try:
            response = await self._execute_request(requests.StartStream())
            await self.update_stats()
            return response is not None
        except Exception as e:
            logger.error(f"Failed to start stream: {e}")
            return False
    
    async def stop_streaming(self) -> bool:
        """Stop streaming"""
        try:
            response = await self._execute_request(requests.StopStream())
            await self.update_stats()
            return response is not None
        except Exception as e:
            logger.error(f"Failed to stop stream: {e}")
            return False
    
    async def start_recording(self) -> bool:
        """Start recording"""
        try:
            response = await self._execute_request(requests.StartRecord())
            await self.update_stats()
            return response is not None
        except Exception as e:
            logger.error(f"Failed to start recording: {e}")
            return False
    
    async def stop_recording(self) -> bool:
        """Stop recording"""
        try:
            response = await self._execute_request(requests.StopRecord())
            await self.update_stats()
            return response is not None
        except Exception as e:
            logger.error(f"Failed to stop recording: {e}")
            return False
    
    async def get_scenes(self) -> List[str]:
        """Get list of scenes"""
        try:
            response = await self._execute_request(requests.GetSceneList())
            if response:
                scenes = response.datain.get('scenes', [])
                return [scene['sceneName'] for scene in scenes]
            return []
        except Exception as e:
            logger.error(f"Failed to get scenes: {e}")
            return []
    
    async def switch_scene(self, scene_name: str) -> bool:
        """Switch to a different scene"""
        try:
            response = await self._execute_request(
                requests.SetCurrentProgramScene(sceneName=scene_name)
            )
            await self.update_stats()
            return response is not None
        except Exception as e:
            logger.error(f"Failed to switch scene: {e}")
            return False
    
    async def get_sources(self, scene_name: Optional[str] = None) -> Dict[str, bool]:
        """Get sources and their visibility status"""
        try:
            if not scene_name:
                scene_name = self.current_stats['current_scene']
            
            response = await self._execute_request(
                requests.GetSceneItemList(sceneName=scene_name)
            )
            
            if response:
                items = response.datain.get('sceneItems', [])
                sources = {}
                for item in items:
                    source_name = item.get('sourceName', '')
                    enabled = item.get('sceneItemEnabled', False)
                    if source_name:
                        sources[source_name] = enabled
                return sources
            return {}
        except Exception as e:
            logger.error(f"Failed to get sources: {e}")
            return {}
    
    async def toggle_source(self, source_name: str, visible: bool, scene_name: Optional[str] = None) -> bool:
        """Toggle source visibility"""
        try:
            if not scene_name:
                scene_name = self.current_stats['current_scene']
            
            # Get scene item ID
            response = await self._execute_request(
                requests.GetSceneItemList(sceneName=scene_name)
            )
            
            if response:
                items = response.datain.get('sceneItems', [])
                item_id = None
                for item in items:
                    if item.get('sourceName') == source_name:
                        item_id = item.get('sceneItemId')
                        break
                
                if item_id is not None:
                    toggle_response = await self._execute_request(
                        requests.SetSceneItemEnabled(
                            sceneName=scene_name,
                            sceneItemId=item_id,
                            sceneItemEnabled=visible
                        )
                    )
                    return toggle_response is not None
            
            return False
        except Exception as e:
            logger.error(f"Failed to toggle source: {e}")
            return False
    
    async def save_replay_buffer(self) -> bool:
        """Save replay buffer (if enabled)"""
        try:
            response = await self._execute_request(requests.SaveReplayBuffer())
            return response is not None
        except Exception as e:
            logger.error(f"Failed to save replay buffer: {e}")
            return False

# Global instance
obs_service = OBSService()
