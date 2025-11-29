import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play,
  Square,
  Circle,
  Video,
  Monitor,
  Eye,
  EyeOff,
  Users,
  Heart,
  Crown,
  TrendingUp,
  Music,
  SkipForward,
  Clock,
  MessageCircle,
  Zap,
  Sparkles,
  Activity,
  Cpu,
  Gauge,
  Radio,
  Scissors,
  Bookmark,
  BarChart3,
  Brain,
  Send,
  LogOut,
  User,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { QueueManager } from "@/components/QueueManager";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Sortable Sound Component
const SortableSound = ({ sound, playSound, openEditModal, deleteSound, playingSound }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sound.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorClass = sound.color || 'purple-pink';
  const gradients = {
    'purple-pink': 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
    'blue-cyan': 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
    'green-emerald': 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
    'red-orange': 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
    'yellow-amber': 'from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700',
    'pink-rose': 'from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700',
    'indigo-purple': 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
    'gray-slate': 'from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'
  };

  const isPlaying = playingSound === sound.name;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        onClick={(e) => {
          e.stopPropagation();
          playSound(sound.name);
        }}
        className={`w-full aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-br ${gradients[colorClass]} shadow-lg cursor-pointer ${isPlaying ? 'ring-4 ring-white animate-pulse' : ''}`}
      >
        <Music className={`w-8 h-8 text-white ${isPlaying ? 'animate-bounce' : ''}`} />
        <span className="text-white font-bold text-xs text-center leading-tight break-words">
          {sound.displayName || sound.name.replace(/\.[^/.]+$/, '')}
        </span>
      </button>
      {/* Drag handle - only visible on hover */}
      <div 
        className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gray-700/80 hover:bg-gray-600 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
        {...attributes}
        {...listeners}
      >
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openEditModal(sound);
          }}
          className="w-6 h-6 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center"
          title="Edit sound"
        >
          <Zap className="w-3 h-3 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteSound(sound.name);
          }}
          className="w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
          title="Delete sound"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout, login, isAuthenticated } = useAuth();
  
  // OBS State
  const [obsStats, setObsStats] = useState({
    streaming: false,
    recording: false,
    cpu_usage: 0,
    gpu_usage: 0,
    fps: 0,
    bitrate: 0,
    dropped_frames: 0,
    current_scene: "Main Camera"
  });
  const [scenes, setScenes] = useState(['Starting Soon', 'Webcam', 'Gaming', 'BRB', 'Chatting', 'Desktop', 'Ending', 'Full Screen', 'Split Cam', 'Screen Share']);
  const [sources, setSources] = useState({ 'Webcam': true, 'Mic/Aux': true, 'Desktop Audio': false, 'Camera 2': true, 'Mic 2': true });
  const [previewTab, setPreviewTab] = useState('stream');
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // Twitch State
  const [twitchStats, setTwitchStats] = useState({
    viewers: 0,
    followers: 0,
    subscribers: 0,
    stream_title: "",
    stream_category: "",
    uptime_minutes: 0
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [streamTags, setStreamTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [showAdMenu, setShowAdMenu] = useState(false);
  
  // Track if user is actively editing title (prevents auto-refresh from overwriting)
  const isEditingTitle = useRef(false);
  
  // Popular stream tags
  const popularTags = [
    "English", "Music", "Educational", "Tutorial", "Chill", 
    "Interactive", "Beginner Friendly", "Pro", "Speedrun"
  ];
  
  // Popular Twitch categories for music feedback
  const popularCategories = [
    "Just Chatting",
    "Music",
    "Creative",
    "Talk Shows & Podcasts",
    "Special Events"
  ];

  // Music Queue State
  const [musicQueue, setMusicQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [musicForm, setMusicForm] = useState({
    artist: "",
    title: "",
    url: "",
    submitted_by: ""
  });

  // Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  
  // Twitch Player URL with dynamic parent
  const [twitchPlayerUrl, setTwitchPlayerUrl] = useState("");
  
  // Queue Management State
  const [submissions, setSubmissions] = useState([]);
  const [skipQueue, setSkipQueue] = useState([]);
  const [queueStats, setQueueStats] = useState({
    total_submissions: 0,
    played: 0,
    skipped: 0,
    pending: 0,
    skip_queue_count: 0
  });
  const [usernameMappings, setUsernameMappings] = useState({});
  const [mappingForm, setMappingForm] = useState({ discord_username: '', twitch_username: '' });
  const [subTierCache, setSubTierCache] = useState({});
  const [autoMatchCache, setAutoMatchCache] = useState({});
  
  // Sound Board State
  const [sounds, setSounds] = useState([]);
  const [uploadingSound, setUploadingSound] = useState(false);
  const [editingSound, setEditingSound] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', color: '', category: '' });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentAudio, setCurrentAudio] = useState(null);
  const [playingSound, setPlayingSound] = useState(null);
  const [showModeration, setShowModeration] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  // Sound categories
  const soundCategories = [
    { id: 'all', name: 'All Sounds', icon: '🎵' },
    { id: 'effects', name: 'Effects', icon: '✨' },
    { id: 'music', name: 'Music', icon: '🎶' },
    { id: 'memes', name: 'Memes', icon: '😂' },
    { id: 'reactions', name: 'Reactions', icon: '🎭' },
    { id: 'celebrations', name: 'Celebrations', icon: '🎉' },
    { id: 'other', name: 'Other', icon: '📁' }
  ];

  // Fetch OBS stats
  const fetchOBSStats = async () => {
    try {
      const response = await axios.get(`${API}/obs/stats`);
      setObsStats(response.data);
    } catch (error) {
      console.error("Error fetching OBS stats:", error);
    }
  };

  // Fetch scenes
  const fetchScenes = async () => {
    try {
      const response = await axios.get(`${API}/obs/scenes`);
      // Only update if we get real scenes (not OBS Not Connected)
      if (response.data.scenes && 
          response.data.scenes.length > 0 && 
          response.data.scenes[0] !== 'OBS Not Connected') {
        setScenes(response.data.scenes);
      }
    } catch (error) {
      console.error("Error fetching scenes:", error);
      // Keep mockup data if fetch fails
    }
  };

  // Fetch sources
  const fetchSources = async () => {
    try {
      const response = await axios.get(`${API}/obs/sources`);
      if (response.data.sources && Object.keys(response.data.sources).length > 0) {
        setSources(response.data.sources);
      }
    } catch (error) {
      console.error("Error fetching sources:", error);
      // Keep mockup data if fetch fails
    }
  };

  // Fetch Twitch stats
  const fetchTwitchStats = async () => {
    try {
      const response = await axios.get(`${API}/twitch/stats`);
      setTwitchStats(response.data);
      // Only update newTitle if user is NOT actively editing
      if (!isEditingTitle.current) {
        setNewTitle(response.data.stream_title);
      }
    } catch (error) {
      console.error("Error fetching Twitch stats:", error);
    }
  };

  // Fetch chat messages
  const fetchChatMessages = async () => {
    try {
      const response = await axios.get(`${API}/twitch/chat`);
      // Remove duplicates by keeping only unique message IDs
      setChatMessages(prev => {
        const newMessages = response.data;
        const existingIds = new Set(prev.map(m => m.id));
        const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
        return [...uniqueNew, ...prev].slice(0, 50);
      });
    } catch (error) {
      console.error("Error fetching chat:", error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/twitch/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };
  
  // Fetch queue submissions
  const fetchSubmissions = async () => {
    try {
      const response = await axios.get(`${API}/queue/submissions`);
      const subs = response.data.submissions;
      setSubmissions(subs);
      
      // Process each submission
      subs.forEach(sub => {
        if (sub.twitch_username) {
          // Has explicit mapping - fetch tier
          fetchSubTier(sub.twitch_username);
        } else {
          // No mapping - try auto-match
          const discordUsername = sub.discord_username || sub.discord_display_name;
          if (discordUsername) {
            autoMatchTwitchUser(discordUsername);
          }
        }
      });
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };
  
  // Fetch skip queue
  const fetchSkipQueue = async () => {
    try {
      const response = await axios.get(`${API}/queue/skips`);
      const skips = response.data.submissions;
      setSkipQueue(skips);
      
      // Process each skip
      skips.forEach(skip => {
        if (skip.twitch_username) {
          // Has explicit mapping - fetch tier
          fetchSubTier(skip.twitch_username);
        } else {
          // No mapping - try auto-match
          const discordUsername = skip.discord_username || skip.discord_display_name;
          if (discordUsername) {
            autoMatchTwitchUser(discordUsername);
          }
        }
      });
    } catch (error) {
      console.error("Error fetching skip queue:", error);
    }
  };
  
  // Fetch queue stats
  const fetchQueueStats = async () => {
    try {
      const response = await axios.get(`${API}/queue/stats`);
      setQueueStats(response.data);
    } catch (error) {
      console.error("Error fetching queue stats:", error);
    }
  };
  
  // Fetch username mappings
  const fetchUsernameMappings = async () => {
    try {
      const response = await axios.get(`${API}/queue/mappings`);
      setUsernameMappings(response.data.mappings);
    } catch (error) {
      console.error("Error fetching username mappings:", error);
    }
  };

  // Fetch music queue
  const fetchMusicQueue = async () => {
    try {
      const response = await axios.get(`${API}/music/queue`);
      setMusicQueue(response.data);
    } catch (error) {
      console.error("Error fetching music queue:", error);
    }
  };

  // Fetch now playing
  const fetchNowPlaying = async () => {
    try {
      const response = await axios.get(`${API}/music/now-playing`);
      if (!response.data.message) {
        setNowPlaying(response.data);
      }
    } catch (error) {
      console.error("Error fetching now playing:", error);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/summary`);
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  // Fetch sentiment
  const fetchSentiment = async () => {
    try {
      const response = await axios.get(`${API}/ai/sentiment`);
      setSentiment(response.data);
    } catch (error) {
      console.error("Error fetching sentiment:", error);
    }
  };
  
  // Mark submission as played or skipped
  const markSubmission = async (submissionId, status) => {
    try {
      await axios.post(`${API}/queue/mark`, {
        submission_id: submissionId,
        status: status
      });
      toast.success(`Marked as ${status}! ✅`);
      fetchSubmissions();
      fetchQueueStats();
    } catch (error) {
      toast.error("Failed to mark submission");
      console.error("Error marking submission:", error);
    }
  };
  
  // Mark skip submission as played or skipped
  const markSkipSubmission = async (submissionId, status) => {
    try {
      await axios.post(`${API}/queue/mark-skip`, {
        submission_id: submissionId,
        status: status
      });
      toast.success(`Skip marked as ${status}! ✅`);
      fetchSkipQueue();
      fetchQueueStats();
    } catch (error) {
      toast.error("Failed to mark skip submission");
      console.error("Error marking skip submission:", error);
    }
  };
  
  // Add username mapping
  const addUsernameMapping = async () => {
    if (!mappingForm.discord_username || !mappingForm.twitch_username) {
      toast.error("Please fill in both usernames");
      return;
    }
    
    try {
      await axios.post(`${API}/queue/map-username`, mappingForm);
      toast.success("Username mapping added! 🔗");
      fetchUsernameMappings();
      fetchSubmissions();
      fetchSkipQueue();
      setMappingForm({ discord_username: '', twitch_username: '' });
    } catch (error) {
      toast.error("Failed to add mapping");
      console.error("Error adding username mapping:", error);
    }
  };
  
  // Remove username mapping
  const removeUsernameMapping = async (discordUsername) => {
    try {
      await axios.delete(`${API}/queue/map-username/${discordUsername}`);
      toast.success("Mapping removed!");
      fetchUsernameMappings();
      fetchSubmissions();
      fetchSkipQueue();
    } catch (error) {
      toast.error("Failed to remove mapping");
      console.error("Error removing username mapping:", error);
    }
  };
  
  // Fetch sounds
  const fetchSounds = async () => {
    try {
      const response = await axios.get(`${API}/sounds`);
      setSounds(response.data.sounds || []);
    } catch (error) {
      console.error("Error fetching sounds:", error);
    }
  };
  
  // Upload sound
  const uploadSound = async (file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('sound', file);
    
    setUploadingSound(true);
    try {
      await axios.post(`${API}/sounds/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`Sound "${file.name}" uploaded! 🎵`);
      fetchSounds();
    } catch (error) {
      toast.error("Failed to upload sound");
      console.error("Error uploading sound:", error);
    } finally {
      setUploadingSound(false);
    }
  };
  
  // Play sound
  const playSound = (soundName) => {
    try {
      // If the same sound is currently playing, stop it
      if (playingSound === soundName && currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        setPlayingSound(null);
        toast.success(`Stopped ${soundName}! 🔇`);
        return;
      }
      
      // Stop any currently playing sound
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      
      // Play the new sound
      const audio = new Audio(`${API}/sounds/play/${soundName}`);
      
      // Add event listener for when sound ends
      audio.addEventListener('ended', () => {
        setCurrentAudio(null);
        setPlayingSound(null);
      });
      
      audio.play();
      setCurrentAudio(audio);
      setPlayingSound(soundName);
      toast.success(`Playing ${soundName}! 🔊`);
    } catch (error) {
      toast.error("Failed to play sound");
      console.error("Error playing sound:", error);
      setCurrentAudio(null);
      setPlayingSound(null);
    }
  };
  
  // Delete sound
  const deleteSound = async (soundName) => {
    try {
      await axios.delete(`${API}/sounds/${soundName}`);
      toast.success(`Sound "${soundName}" deleted!`);
      fetchSounds();
    } catch (error) {
      toast.error("Failed to delete sound");
      console.error("Error deleting sound:", error);
    }
  };
  
  // Update sound metadata
  const updateSound = async (soundName, metadata) => {
    try {
      await axios.patch(`${API}/sounds/${soundName}`, metadata);
      toast.success("Sound updated! ✨");
      fetchSounds();
      setEditingSound(null);
    } catch (error) {
      toast.error("Failed to update sound");
      console.error("Error updating sound:", error);
    }
  };
  
  // Open edit modal
  const openEditModal = (sound) => {
    setEditingSound(sound);
    setEditForm({
      displayName: sound.displayName || sound.name.replace(/\.[^/.]+$/, ''),
      color: sound.color || 'purple-pink',
      category: sound.category || 'other'
    });
  };
  
  // Get filtered sounds by category
  const getFilteredSounds = () => {
    if (selectedCategory === 'all') return sounds;
    return sounds.filter(sound => (sound.category || 'other') === selectedCategory);
  };
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const filteredSounds = getFilteredSounds();
      const oldIndex = filteredSounds.findIndex((sound) => sound.name === active.id);
      const newIndex = filteredSounds.findIndex((sound) => sound.name === over.id);
      
      // Reorder within the filtered category
      const newFilteredSounds = arrayMove(filteredSounds, oldIndex, newIndex);
      
      // Merge back with all sounds
      const updatedSounds = sounds.map(sound => {
        const filtered = newFilteredSounds.find(s => s.name === sound.name);
        return filtered || sound;
      });
      
      // Replace category sounds in original order
      const otherSounds = sounds.filter(s => !filteredSounds.find(f => f.name === s.name));
      const finalSounds = [...newFilteredSounds, ...otherSounds];
      
      setSounds(finalSounds);
      
      // Save order to backend
      try {
        const soundOrder = finalSounds.map(s => s.name);
        await axios.post(`${API}/sounds/reorder`, { order: soundOrder, category: selectedCategory });
        toast.success("Sound order saved! 🎯");
      } catch (error) {
        console.error("Error saving sound order:", error);
        toast.error("Failed to save order");
      }
    }
  };

  // Control stream
  const controlStream = async (action) => {
    try {
      await axios.post(`${API}/obs/stream`, { action });
      toast.success(action === "start" ? "Stream started! 🎬" : "Stream stopped");
      fetchOBSStats();
    } catch (error) {
      toast.error("Failed to control stream");
    }
  };

  // Control recording
  const controlRecording = async (action) => {
    try {
      await axios.post(`${API}/obs/recording`, { action });
      toast.success(action === "start" ? "Recording started 🔴" : "Recording stopped");
      fetchOBSStats();
    } catch (error) {
      toast.error("Failed to control recording");
    }
  };

  // Switch scene
  const switchScene = async (sceneName) => {
    try {
      await axios.post(`${API}/obs/scene`, { scene_name: sceneName });
      toast.success(`Switched to ${sceneName}`);
      fetchOBSStats();
    } catch (error) {
      toast.error("Failed to switch scene");
    }
  };

  // Toggle source
  const toggleSource = async (sourceName, visible) => {
    try {
      await axios.post(`${API}/obs/source`, { source_name: sourceName, visible });
      fetchSources();
    } catch (error) {
      toast.error("Failed to toggle source");
    }
  };

  // Start camera preview
  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1920, height: 1080 }, 
        audio: false 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please check permissions.");
    }
  };

  // Stop camera preview
  const stopCameraPreview = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Handle preview tab change
  useEffect(() => {
    if (previewTab === 'preview') {
      startCameraPreview();
    } else {
      stopCameraPreview();
    }
    return () => {
      stopCameraPreview();
    };
  }, [previewTab]);

  // Save OBS clip (replay buffer)
  const saveClip = async () => {
    try {
      const response = await axios.post(`${API}/obs/clip`);
      toast.success(`${response.data.message} 🎥`);
    } catch (error) {
      toast.error("Failed to save clip");
    }
  };

  // Create Twitch clip
  const createTwitchClip = async () => {
    try {
      const response = await axios.post(`${API}/twitch/clip`);
      if (response.data.success) {
        toast.success(`${response.data.message} 🎬`, {
          description: response.data.edit_url ? "Click to view clip" : undefined,
          action: response.data.edit_url ? {
            label: "Open Clip",
            onClick: () => window.open(response.data.edit_url, '_blank')
          } : undefined
        });
      } else {
        toast.error(response.data.error || "Failed to create clip");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to create clips");
      } else {
        toast.error("Failed to create Twitch clip");
      }
    }
  };

  // Update stream title
  const updateStreamTitle = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    if (!newTitle || newTitle.trim() === "") {
      toast.error("Please enter a stream title");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/title`, { title: newTitle });
      if (response.data.success) {
        toast.success("Stream title updated! ✨");
        // Stop editing mode
        isEditingTitle.current = false;
        // Fetch updated stats
        const statsResponse = await axios.get(`${API}/twitch/stats`);
        setTwitchStats(statsResponse.data);
        setNewTitle(statsResponse.data.stream_title);
      } else {
        toast.error(response.data.error || "Failed to update title");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login with Twitch to edit stream title");
      } else {
        toast.error("Failed to update title");
      }
    }
  };
  
  // Handle title input change
  const handleTitleChange = (e) => {
    isEditingTitle.current = true;
    setNewTitle(e.target.value);
  };
  
  // Fetch stream tags
  const fetchStreamTags = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.get(`${API}/twitch/tags`);
      if (response.data.success) {
        setStreamTags(response.data.tags || []);
      }
    } catch (error) {
      console.error("Error fetching stream tags:", error);
    }
  };
  
  // Add tag
  const addTag = async (tag) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    if (streamTags.includes(tag)) {
      toast.error("Tag already added");
      return;
    }
    
    if (streamTags.length >= 10) {
      toast.error("Maximum 10 tags allowed");
      return;
    }
    
    const newTags = [...streamTags, tag];
    
    try {
      const response = await axios.post(`${API}/twitch/tags`, { tags: newTags });
      if (response.data.success) {
        setStreamTags(newTags);
        setNewTag("");
        setShowTagInput(false);
        toast.success(`Tag "${tag}" added! 🏷️`);
      } else {
        toast.error(response.data.error || "Failed to add tag");
      }
    } catch (error) {
      toast.error("Failed to add tag");
      console.error("Error adding tag:", error);
    }
  };
  
  // Remove tag
  const removeTag = async (tagToRemove) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    const newTags = streamTags.filter(tag => tag !== tagToRemove);
    
    try {
      const response = await axios.post(`${API}/twitch/tags`, { tags: newTags });
      if (response.data.success) {
        setStreamTags(newTags);
        toast.success(`Tag "${tagToRemove}" removed! 🗑️`);
      } else {
        toast.error(response.data.error || "Failed to remove tag");
      }
    } catch (error) {
      toast.error("Failed to remove tag");
      console.error("Error removing tag:", error);
    }
  };

  // Stream Presets
  const streamPresets = {
    grwm: {
      title: "GRWM | Get Ready With Me 💄✨",
      category: "Just Chatting",
      tags: ["English", "Chatting", "GRWM"]
    },
    coworking: {
      title: "Co-Working Stream | Work & Chat 💻☕",
      category: "Just Chatting",
      tags: ["English", "Chatting", "Study", "Productivity"]
    },
    musicfeedback: {
      title: "Music Feedback Queue | Submit Your Tracks! 🎵",
      category: "Music",
      tags: ["English", "Music", "Creative"]
    }
  };

  const applyPreset = async (presetKey) => {
    const preset = streamPresets[presetKey];
    if (!preset) return;

    try {
      // Update title
      setNewTitle(preset.title);
      await axios.post(`${API}/twitch/title`, { title: preset.title });
      
      // Update category
      await axios.post(`${API}/twitch/category`, { category: preset.category });
      
      // Update tags
      await axios.post(`${API}/twitch/tags`, { tags: preset.tags });
      setStreamTags(preset.tags);
      
      // Refresh stats to show new values
      await fetchTwitchStats();
      
      toast.success(`${presetKey.toUpperCase()} preset applied! 🎯`);
    } catch (error) {
      console.error("Error applying preset:", error);
      toast.error("Failed to apply preset");
    }
  };
  
  // Update stream category
  const updateStreamCategory = async (category) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/category`, { category });
      if (response.data.success) {
        toast.success(`Category updated to ${category}! 🎯`);
        fetchTwitchStats();
        setShowCategoryInput(false);
      } else {
        toast.error(response.data.error || "Failed to update category");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login with Twitch to edit stream category");
      } else {
        toast.error("Failed to update category");
      }
    }
  };

  // Run Ad
  const runAd = async (duration) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/ad`, { duration });
      if (response.data.success) {
        toast.success(`Ad started (${duration}s)! 📺`);
      } else {
        toast.error(response.data.error || "Failed to run ad");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to run ads");
      } else {
        toast.error("Failed to run ad");
      }
    }
  };

  // Create Poll
  const createPoll = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    // Simple poll with default options
    const pollData = {
      title: "What should we do next?",
      choices: [{ title: "Yes" }, { title: "No" }],
      duration: 60
    };
    
    try {
      const response = await axios.post(`${API}/twitch/poll`, pollData);
      if (response.data.success) {
        toast.success("Poll created! 📊");
      } else {
        toast.error(response.data.error || "Failed to create poll");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to create polls");
      } else {
        toast.error("Failed to create poll");
      }
    }
  };

  // Create Prediction
  const createPrediction = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    // Simple prediction with default options
    const predictionData = {
      title: "Will we win?",
      outcomes: [{ title: "Yes" }, { title: "No" }],
      duration: 120
    };
    
    try {
      const response = await axios.post(`${API}/twitch/prediction`, predictionData);
      if (response.data.success) {
        toast.success("Prediction created! 🔮");
      } else {
        toast.error(response.data.error || "Failed to create prediction");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to create predictions");
      } else {
        toast.error("Failed to create prediction");
      }
    }
  };

  // Shoutout Streamer
  const shoutoutStreamer = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    const username = prompt("Enter streamer username to shoutout:");
    if (!username) return;
    
    try {
      const response = await axios.post(`${API}/twitch/shoutout`, { username });
      if (response.data.success) {
        toast.success(`Shoutout sent to ${username}! 📣`);
      } else {
        toast.error(response.data.error || "Failed to send shoutout");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to send shoutouts");
      } else {
        toast.error("Failed to send shoutout");
      }
    }
  };

  // Start Raid
  const startRaid = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    const username = prompt("Enter streamer username to raid:");
    if (!username) return;
    
    try {
      const response = await axios.post(`${API}/twitch/raid`, { username });
      if (response.data.success) {
        toast.success(`Raid started to ${username}! 🚀`);
      } else {
        toast.error(response.data.error || "Failed to start raid");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to start raids");
      } else {
        toast.error("Failed to start raid");
      }
    }
  };

  // Clear Chat
  const clearChat = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    const confirmed = window.confirm("Are you sure you want to clear the entire chat?");
    if (!confirmed) return;
    
    try {
      const response = await axios.post(`${API}/twitch/clear-chat`);
      if (response.data.success) {
        toast.success("Chat cleared! 🧹");
      } else {
        toast.error(response.data.error || "Failed to clear chat");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to clear chat");
      } else {
        toast.error("Failed to clear chat");
      }
    }
  };

  // Toggle Slow Mode
  const toggleSlowMode = async (enabled) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/chat/slow-mode`, { 
        enabled, 
        wait_time: enabled ? 30 : 0 
      });
      if (response.data.success) {
        toast.success(response.data.message + " ⏱️");
      } else {
        toast.error(response.data.error || "Failed to toggle slow mode");
      }
    } catch (error) {
      toast.error("Failed to toggle slow mode");
    }
  };

  // Toggle Follower-Only Mode
  const toggleFollowerOnly = async (enabled) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/chat/follower-only`, { 
        enabled, 
        duration: 0 
      });
      if (response.data.success) {
        toast.success(response.data.message + " 👥");
      } else {
        toast.error(response.data.error || "Failed to toggle follower-only mode");
      }
    } catch (error) {
      toast.error("Failed to toggle follower-only mode");
    }
  };

  // Toggle Subscriber-Only Mode
  const toggleSubscriberOnly = async (enabled) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/chat/subscriber-only`, { enabled });
      if (response.data.success) {
        toast.success(response.data.message + " 👑");
      } else {
        toast.error(response.data.error || "Failed to toggle subscriber-only mode");
      }
    } catch (error) {
      toast.error("Failed to toggle subscriber-only mode");
    }
  };

  // Toggle Emote-Only Mode
  const toggleEmoteOnly = async (enabled) => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/twitch/chat/emote-only`, { enabled });
      if (response.data.success) {
        toast.success(response.data.message + " 😀");
      } else {
        toast.error(response.data.error || "Failed to toggle emote-only mode");
      }
    } catch (error) {
      toast.error("Failed to toggle emote-only mode");
    }
  };

  // Timeout User
  const timeoutUser = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    const username = prompt("Enter username to timeout:");
    if (!username) return;
    
    const duration = prompt("Timeout duration in seconds (default 600):", "600");
    if (!duration) return;
    
    try {
      const response = await axios.post(`${API}/twitch/chat/timeout`, { 
        username, 
        duration: parseInt(duration) 
      });
      if (response.data.success) {
        toast.success(response.data.message + " ⏰");
      } else {
        toast.error(response.data.error || "Failed to timeout user");
      }
    } catch (error) {
      toast.error("Failed to timeout user");
    }
  };

  // Ban User
  const banUser = async () => {
    if (!isAuthenticated) {
      toast.error("Please login with Twitch first!");
      return;
    }
    
    const username = prompt("Enter username to ban:");
    if (!username) return;
    
    const confirmed = window.confirm(`Are you sure you want to permanently ban ${username}?`);
    if (!confirmed) return;
    
    try {
      const response = await axios.post(`${API}/twitch/chat/ban`, { username });
      if (response.data.success) {
        toast.success(response.data.message + " 🔨");
      } else {
        toast.error(response.data.error || "Failed to ban user");
      }
    } catch (error) {
      toast.error("Failed to ban user");
    }
  };

  // Create stream marker
  const createMarker = async () => {
    try {
      const response = await axios.post(`${API}/twitch/marker`);
      if (response.data.success) {
        toast.success("Stream marker created! 📍");
      } else {
        toast.error(response.data.error || "Failed to create marker");
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Please login to create markers");
      } else {
        toast.error("Failed to create marker");
      }
    }
  };

  // Submit music
  const submitMusic = async (e) => {
    e.preventDefault();
    if (!musicForm.artist || !musicForm.title || !musicForm.url || !musicForm.submitted_by) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await axios.post(`${API}/music/submit`, musicForm);
      toast.success("Song submitted to queue! 🎵");
      setMusicForm({ artist: "", title: "", url: "", submitted_by: "" });
      fetchMusicQueue();
    } catch (error) {
      toast.error("Failed to submit song");
    }
  };

  // Play song
  const playSong = async (songId) => {
    try {
      await axios.post(`${API}/music/play/${songId}`);
      toast.success("Now playing! 🎶");
      fetchNowPlaying();
      fetchMusicQueue();
    } catch (error) {
      toast.error("Failed to play song");
    }
  };

  // Skip song
  const skipSong = async (songId) => {
    try {
      await axios.post(`${API}/music/skip/${songId}`);
      toast.success("Song skipped");
      fetchMusicQueue();
    } catch (error) {
      toast.error("Failed to skip song");
    }
  };

  // Build Twitch player URL with dynamic parent
  useEffect(() => {
    const hostname = window.location.hostname;
    const parents = ["localhost", "127.0.0.1", "yk2-obs-center.preview.emergentagent.com"];
    
    if (!parents.includes(hostname)) {
      parents.push(hostname);
    }
    
    const parentParams = parents.map(p => `parent=${p}`).join('&');
    const url = `https://player.twitch.tv/?channel=kalliestockton&${parentParams}`;
    setTwitchPlayerUrl(url);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchOBSStats();
    fetchScenes();
    fetchSources();
    fetchTwitchStats();
    fetchMusicQueue();
    fetchNowPlaying();
    fetchAnalytics();
    fetchSentiment();
    fetchSubmissions();
    fetchSkipQueue();
    fetchQueueStats();
    fetchUsernameMappings();
    fetchStreamTags();
    fetchSounds();

    // Set up polling
    const interval = setInterval(() => {
      fetchOBSStats();
      fetchTwitchStats();
      fetchChatMessages();
      fetchAlerts();
      fetchMusicQueue();
      fetchNowPlaying();
      fetchSentiment();
      fetchSubmissions();
      fetchSkipQueue();
      fetchQueueStats();
      fetchStreamTags();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get badge display name
  const getBadgeName = (badge) => {
    if (badge === "moderator") return "Mod";
    if (badge === "subscriber") return "Sub";
    if (badge === "vip") return "VIP";
    if (badge === "broadcaster") return "Broadcaster";
    if (badge === "sub-gifter") return "Gifter";
    return badge.charAt(0).toUpperCase() + badge.slice(1);
  };

  // Get sub tier from badge info
  const getSubTier = (badgeInfo) => {
    if (!badgeInfo) return "Non Sub";
    
    // Check if user has subscriber badge
    if (badgeInfo.subscriber) {
      const tier = badgeInfo.subscriber;
      // Twitch sub tiers: 0=Prime/T1, 1=T1, 2=T2, 3=T3
      if (tier === "0" || tier === "1") return "T1";
      if (tier === "2000" || tier === "2") return "T2";
      if (tier === "3000" || tier === "3") return "T3";
      return "T1"; // Default to T1 if unclear
    }
    
    // Check if user is founder (legacy sub)
    if (badgeInfo.founder) {
      return "Founder";
    }
    
    return "Non Sub";
  };

  // Get sub tier badge styling
  const getSubTierBadgeClass = (tier) => {
    if (tier === "T3") return "bg-purple-600 border-purple-400";
    if (tier === "T2") return "bg-pink-600 border-pink-400";
    if (tier === "T1") return "bg-blue-600 border-blue-400";
    if (tier === "Founder") return "bg-orange-600 border-orange-400";
    return "bg-gray-600 border-gray-400"; // Non Sub
  };

  // Auto-match Discord username to Twitch
  const autoMatchTwitchUser = async (discordUsername) => {
    if (!discordUsername || autoMatchCache[discordUsername]) {
      return autoMatchCache[discordUsername];
    }

    try {
      const response = await axios.get(`${API}/twitch/find-user/${discordUsername}`);
      const result = {
        matched: response.data.matched,
        twitchUsername: response.data.twitch_username,
        tier: response.data.subscription?.is_subscribed ? response.data.subscription.tier : 'Non Sub'
      };
      
      // Cache the result
      setAutoMatchCache(prev => ({ ...prev, [discordUsername]: result }));
      
      // Also cache the tier if matched
      if (result.matched && result.twitchUsername) {
        setSubTierCache(prev => ({ ...prev, [result.twitchUsername]: result.tier }));
      }
      
      return result;
    } catch (error) {
      console.error(`Error auto-matching ${discordUsername}:`, error);
      const result = { matched: false, twitchUsername: null, tier: null };
      setAutoMatchCache(prev => ({ ...prev, [discordUsername]: result }));
      return result;
    }
  };

  // Fetch Twitch sub tier for a username
  const fetchSubTier = async (twitchUsername) => {
    if (!twitchUsername || subTierCache[twitchUsername]) {
      return subTierCache[twitchUsername] || 'Non Sub';
    }

    try {
      const response = await axios.get(`${API}/twitch/subscription/${twitchUsername}`);
      const tier = response.data.is_subscribed ? response.data.tier : 'Non Sub';
      
      // Cache the result
      setSubTierCache(prev => ({ ...prev, [twitchUsername]: tier }));
      
      return tier;
    } catch (error) {
      console.error(`Error fetching sub tier for ${twitchUsername}:`, error);
      return 'Non Sub';
    }
  };

  // Get sub tier for a submission (with auto-matching)
  const getSubmissionSubTier = (discordUsername, twitchUsername) => {
    // If explicitly mapped, use that
    if (twitchUsername) {
      return subTierCache[twitchUsername] || 'Non Sub';
    }
    
    // Check auto-match cache
    const autoMatch = autoMatchCache[discordUsername];
    if (autoMatch) {
      if (autoMatch.matched) {
        return autoMatch.tier || 'Non Sub';
      }
      return 'NO_MATCH'; // Special flag for red dot
    }
    
    return 'PENDING'; // Still loading
  };

  // Extract song name from URL or return shortened version
  const getSongDisplayName = (songLink) => {
    try {
      const url = new URL(songLink);
      
      // Handle YouTube
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        // Try to get video title from URL params if available
        const params = new URLSearchParams(url.search);
        const videoId = params.get('v') || url.pathname.split('/').pop();
        return `YouTube: ${videoId}`;
      }
      
      // Handle SoundCloud
      if (url.hostname.includes('soundcloud.com')) {
        const parts = url.pathname.split('/').filter(p => p);
        return parts[parts.length - 1].replace(/-/g, ' ').substring(0, 40);
      }
      
      // Handle BandLab
      if (url.hostname.includes('bandlab.com')) {
        return 'BandLab Track';
      }
      
      // Handle Spotify
      if (url.hostname.includes('spotify.com')) {
        const parts = url.pathname.split('/').filter(p => p);
        return `Spotify: ${parts[parts.length - 1]}`;
      }
      
      // Generic: show domain + last path segment
      const pathParts = url.pathname.split('/').filter(p => p);
      const lastPart = pathParts[pathParts.length - 1] || url.hostname;
      return lastPart.substring(0, 40);
    } catch (e) {
      // If URL parsing fails, return truncated link
      return songLink.substring(0, 40) + '...';
    }
  };

  // Render message with emotes
  const renderMessageWithEmotes = (message, emotes) => {
    if (!emotes || emotes.length === 0) {
      return message;
    }

    // Sort emotes by position (from end to start to avoid offset issues)
    const sortedEmotes = [...emotes].sort((a, b) => b.positions[0][0] - a.positions[0][0]);
    
    let messageText = message;
    const parts = [];
    let lastIndex = message.length;

    sortedEmotes.forEach(emote => {
      emote.positions.forEach(([start, end]) => {
        // Add text after this emote
        parts.unshift(messageText.substring(end + 1, lastIndex));
        
        // Add emote image
        parts.unshift(
          <img 
            key={`${emote.id}-${start}`}
            src={`https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/default/dark/1.0`}
            alt={messageText.substring(start, end + 1)}
            className="inline h-5 align-middle mx-0.5"
            title={messageText.substring(start, end + 1)}
          />
        );
        
        lastIndex = start;
      });
    });

    // Add any remaining text at the start
    if (lastIndex > 0) {
      parts.unshift(messageText.substring(0, lastIndex));
    }

    return parts;
  };

  const formatUptime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8" data-testid="dashboard">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Sparkles className="w-10 h-10 text-pink-400" />
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold gradient-text">
                Kallie's Dashboard
              </h1>
              <p className="text-base text-white ml-1">Your streaming command center ✨</p>
            </div>
          </div>
          
          {/* User info and login/logout */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                {user && (
                  <div className="glass px-4 py-2 rounded-full flex items-center gap-3">
                    <User className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-white">{user.username}</span>
                  </div>
                )}
                <Button
                  onClick={logout}
                  variant="outline"
                  className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                  data-testid="btn-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={login}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                data-testid="btn-login"
              >
                <User className="w-4 h-4 mr-2" />
                Login with Twitch
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="control" className="space-y-6">
        <TabsList className="glass p-1">
          <TabsTrigger value="control" data-testid="tab-control">🎥 Control</TabsTrigger>
          <TabsTrigger value="soundboard" data-testid="tab-soundboard">🔊 Sound Board</TabsTrigger>
          <TabsTrigger value="music" data-testid="tab-music">🎵 Music Queue</TabsTrigger>
          <TabsTrigger value="chat" data-testid="tab-chat">💬 Chat & Alerts</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">📊 Analytics</TabsTrigger>
        </TabsList>

        {/* Control Tab */}
        <TabsContent value="control" className="space-y-6">
          {/* Quick Stats - Always stays at top */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass stat-card" data-testid="stat-viewers">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Users className="w-8 h-8 text-purple-400" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-400">{twitchStats.viewers}</p>
                    <p className="text-xs text-gray-400">Viewers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass stat-card" data-testid="stat-followers">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Heart className="w-8 h-8 text-pink-400" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-pink-400">{twitchStats.followers}</p>
                    <p className="text-xs text-gray-400">Followers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass stat-card" data-testid="stat-subscribers">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Crown className="w-8 h-8 text-yellow-400" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-400">{twitchStats.subscribers}</p>
                    <p className="text-xs text-gray-400">Subs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass stat-card" data-testid="stat-uptime">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Clock className="w-8 h-8 text-cyan-400" />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-400">{formatUptime(twitchStats.uptime_minutes)}</p>
                    <p className="text-xs text-gray-400">Uptime</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN LAYOUT: Left Column (Stream Deck + Scenes) | Right Column (Live Preview + Chat) */}
          <div className="grid lg:grid-cols-12 gap-4">
            
            {/* LEFT COLUMN (3 columns) */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Stream Deck Card */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-purple-400" />
                    Stream Deck
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Category Tabs */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {soundCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2 py-1 rounded-lg font-semibold text-[10px] whitespace-nowrap transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'glass text-gray-400 hover:text-white'
                        }`}
                      >
                        {cat.icon}
                      </button>
                    ))}
                  </div>
                  
                  {/* Sound Board - Smaller Version */}
                  <ScrollArea className="h-[195px]">
                    {getFilteredSounds().length === 0 ? (
                      <div className="text-center py-8">
                        <Music className="w-8 h-8 mx-auto mb-2 text-gray-500 opacity-50" />
                        <p className="text-[10px] text-gray-400">
                          {sounds.length === 0 ? 'No sounds yet' : 'No sounds in category'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2">
                        {getFilteredSounds().map((sound) => {
                          const colorClass = sound.color || 'purple-pink';
                          const gradients = {
                            'purple-pink': 'from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
                            'blue-cyan': 'from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700',
                            'green-emerald': 'from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700',
                            'red-orange': 'from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700',
                            'yellow-amber': 'from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700',
                            'pink-rose': 'from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700',
                            'indigo-purple': 'from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
                            'gray-slate': 'from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700'
                          };
                          
                          const isPlaying = playingSound === sound.name;
                          
                          return (
                            <button
                              key={sound.name}
                              onClick={() => playSound(sound.name)}
                              className={`aspect-square rounded-lg p-2 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-br ${gradients[colorClass]} shadow-lg ${isPlaying ? 'ring-2 ring-white animate-pulse' : ''}`}
                            >
                              <span className="text-[8px] font-bold text-white text-center leading-tight line-clamp-2">
                                {sound.displayName || sound.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
              
              {/* Sources Card */}
              <Card className="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    Sources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-16">
                  {/* Sources Toggle */}
                  <div className="space-y-1">
                    {Object.entries(sources).map(([name, visible]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs truncate">{name}</span>
                        <Button
                          onClick={() => toggleSource(name, !visible)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          data-testid={`btn-toggle-source-${name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {visible ? (
                            <Eye className="w-3 h-3 text-green-400" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN (9 columns) - Split into Preview and Chat */}
            <div className="lg:col-span-9">
              <div className="grid lg:grid-cols-3 gap-4 h-full">
                
                {/* Live Preview (2/3) */}
                <div className="lg:col-span-2">
              <Card className="glass h-full" data-testid="stream-preview">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-pink-400" />
                      Live Preview
                    </span>
                    {obsStats.streaming && (
                      <Badge className="bg-red-500 animate-pulse text-xs">
                        <Radio className="w-2 h-2 mr-1" />
                        LIVE
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Preview/Stream Tabs */}
                  <Tabs value={previewTab} onValueChange={setPreviewTab} className="mb-2">
                    <TabsList className="grid w-full grid-cols-2 glass border border-pink-400/30">
                      <TabsTrigger 
                        value="stream" 
                        className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                      >
                        Stream
                      </TabsTrigger>
                      <TabsTrigger 
                        value="preview" 
                        className="text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
                      >
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="relative w-full aspect-video bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-lg overflow-hidden border border-pink-400/30">
                    {previewTab === 'stream' ? (
                      /* Twitch Embed Player */
                      twitchPlayerUrl && (
                        <iframe
                          src={twitchPlayerUrl}
                          className="w-full h-full"
                          frameBorder="0"
                          allowFullScreen={true}
                          scrolling="no"
                          title="Twitch Stream"
                        />
                      )
                    ) : (
                      /* Camera Preview */
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  
                  {/* Scenes Section - Below Live Preview */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <Label className="text-sm text-gray-400 mb-2 block">Scenes</Label>
                    <div>
                      {scenes.length > 0 ? (
                        <div className="grid grid-cols-5 gap-1">
                          {scenes.map((scene) => (
                            <Button
                              key={scene}
                              onClick={() => switchScene(scene)}
                              variant={obsStats.current_scene === scene ? "default" : "outline"}
                              size="sm"
                              className={`text-[10px] px-1 py-1 h-7 ${obsStats.current_scene === scene ? "bg-gradient-to-r from-pink-500 to-purple-500" : ""}`}
                              data-testid={`btn-scene-${scene.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {scene}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          disabled
                        >
                          OBS Not Connected
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Transition Triggers Section */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <Label className="text-sm text-gray-400 mb-2 block">Transition Triggers</Label>
                    <div className="grid grid-cols-5 gap-1">
                      <Button
                        onClick={() => toast.success("Fade transition applied! 🎬")}
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1 py-1 h-7 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/20"
                        disabled={!isAuthenticated}
                      >
                        Fade
                      </Button>
                      <Button
                        onClick={() => toast.success("Cut transition applied! ✂️")}
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1 py-1 h-7 border-purple-400/50 text-purple-400 hover:bg-purple-400/20"
                        disabled={!isAuthenticated}
                      >
                        Cut
                      </Button>
                      <Button
                        onClick={() => toast.success("Slide transition applied! 📐")}
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1 py-1 h-7 border-pink-400/50 text-pink-400 hover:bg-pink-400/20"
                        disabled={!isAuthenticated}
                      >
                        Slide
                      </Button>
                      <Button
                        onClick={() => toast.success("Stinger transition applied! ⚡")}
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1 py-1 h-7 border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/20"
                        disabled={!isAuthenticated}
                      >
                        Stinger
                      </Button>
                      <Button
                        onClick={() => toast.success("Swipe transition applied! 👆")}
                        variant="outline"
                        size="sm"
                        className="text-[10px] px-1 py-1 h-7 border-green-400/50 text-green-400 hover:bg-green-400/20"
                        disabled={!isAuthenticated}
                      >
                        Swipe
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

                {/* Live Chat (1/3) */}
                <div className="lg:col-span-1">
              <Card className="glass h-full" data-testid="mini-chat">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className={`pr-2 ${
                    showQuickActions && showModeration ? "h-[180px]" : 
                    showQuickActions || showModeration ? "h-[280px]" : 
                    "h-[400px]"
                  }`}>
                    <div className="space-y-2">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="slide-in p-2 rounded glass text-xs" data-testid={`mini-chat-${msg.id}`}>
                          <div className="flex items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                <span className="font-semibold truncate text-[10px]" style={{ color: msg.color }}>
                                  {msg.username}
                                </span>
                                {/* Sub Tier Badge */}
                                <span className={`text-[7px] px-1.5 py-0.5 rounded border ${getSubTierBadgeClass(getSubTier(msg.badge_info))} font-bold`}>
                                  {getSubTier(msg.badge_info)}
                                </span>
                                {msg.badges && msg.badges.map((badge, i) => (
                                  <span key={i} className={`badge badge-${badge} text-[7px]`}>
                                    {getBadgeName(badge)}
                                  </span>
                                ))}
                              </div>
                              <div className="text-[10px] text-gray-200 break-words leading-tight">
                                {renderMessageWithEmotes(msg.message, msg.emotes)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {chatMessages.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          <p className="text-[10px]">No messages yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Quick Actions - Collapsible */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div 
                      className="flex items-center justify-between mb-2 cursor-pointer group"
                      onClick={() => setShowQuickActions(!showQuickActions)}
                    >
                      <Label className="text-[10px] text-gray-400 cursor-pointer">Quick Actions</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-gray-400 group-hover:text-white"
                      >
                        {showQuickActions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>
                    
                    {showQuickActions && (
                      <div className="grid grid-cols-4 gap-1">
                        {/* Run Ad with dropdown */}
                        <div className="relative group w-full">
                          <Button
                            onClick={() => setShowAdMenu(!showAdMenu)}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-red-400/50 text-red-400 hover:bg-red-400/20"
                            disabled={!isAuthenticated}
                            title="Run Ad"
                          >
                            <Radio className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Run Ad
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={createPoll}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-blue-400/50 text-blue-400 hover:bg-blue-400/20"
                            disabled={!isAuthenticated}
                            title="Create Poll"
                          >
                            <BarChart3 className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Create Poll
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={createPrediction}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-purple-400/50 text-purple-400 hover:bg-purple-400/20"
                            disabled={!isAuthenticated}
                            title="Prediction"
                          >
                            <Brain className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Prediction
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={shoutoutStreamer}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-pink-400/50 text-pink-400 hover:bg-pink-400/20"
                            disabled={!isAuthenticated}
                            title="Shoutout"
                          >
                            <Send className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Shoutout
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={createMarker}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/20"
                            data-testid="btn-create-marker"
                            disabled={!isAuthenticated}
                            title="Marker"
                          >
                            <Bookmark className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Marker
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={startRaid}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/20"
                            disabled={!isAuthenticated}
                            title="Start Raid"
                          >
                            <Users className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Start Raid
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={clearChat}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-orange-400/50 text-orange-400 hover:bg-orange-400/20"
                            disabled={!isAuthenticated}
                            title="Clear Chat"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Clear Chat
                          </div>
                        </div>

                        <div className="relative group w-full">
                          <Button
                            onClick={createTwitchClip}
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-[9px] border-green-400/50 text-green-400 hover:bg-green-400/20"
                            data-testid="btn-twitch-clip"
                            disabled={!isAuthenticated}
                            title="Create Clip"
                          >
                            <Scissors className="w-3 h-3" />
                          </Button>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            Create Clip
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Chat Moderation - Collapsible */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div 
                      className="flex items-center justify-between mb-2 cursor-pointer group"
                      onClick={() => setShowModeration(!showModeration)}
                    >
                      <Label className="text-[10px] text-gray-400 cursor-pointer">Moderation</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 text-gray-400 group-hover:text-white"
                      >
                        {showModeration ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>
                    
                    {showModeration && (
                      <div className="grid grid-cols-3 gap-1">
                      <Button
                        onClick={() => toggleSlowMode(true)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-1 text-[9px] border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/20"
                        disabled={!isAuthenticated}
                      >
                        ⏱️ Slow
                      </Button>
                      <Button
                        onClick={() => toggleFollowerOnly(true)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-1 text-[9px] border-blue-400/50 text-blue-400 hover:bg-blue-400/20"
                        disabled={!isAuthenticated}
                      >
                        👥 F-Only
                      </Button>
                      <Button
                        onClick={() => toggleSubscriberOnly(true)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-1 text-[9px] border-purple-400/50 text-purple-400 hover:bg-purple-400/20"
                        disabled={!isAuthenticated}
                      >
                        👑 S-Only
                      </Button>
                      <Button
                        onClick={() => toggleEmoteOnly(true)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-1 text-[9px] border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/20"
                        disabled={!isAuthenticated}
                      >
                        😀 Emote
                      </Button>
                      <Button
                        onClick={timeoutUser}
                        variant="outline"
                        size="sm"
                        className="h-7 px-1 text-[9px] border-orange-400/50 text-orange-400 hover:bg-orange-400/20"
                        disabled={!isAuthenticated}
                      >
                        ⏰ Time
                      </Button>
                      <Button
                        onClick={banUser}
                        variant="outline"
                        size="sm"
                        className="h-7 px-1 text-[9px] border-red-400/50 text-red-400 hover:bg-red-400/20"
                        disabled={!isAuthenticated}
                      >
                        🔨 Ban
                      </Button>
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>
                </div>
              </div>
            </div>
            
          </div>

          {/* STREAM INFO ROW (2 columns) */}
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Stream Info */}
            <div>
              <Card className="glass h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Stream Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stream Controls */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => controlStream(obsStats.streaming ? "stop" : "start")}
                        className={`flex-1 text-xs ${obsStats.streaming ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                        data-testid="btn-toggle-stream"
                        size="sm"
                      >
                        {obsStats.streaming ? (
                          <><Square className="w-3 h-3 mr-1" /> Stop</>
                        ) : (
                          <><Play className="w-3 h-3 mr-1" /> Start</>
                        )}
                      </Button>
                      <Button
                        onClick={() => controlRecording(obsStats.recording ? "stop" : "start")}
                        variant="outline"
                        className={`flex-1 text-xs ${obsStats.recording ? "border-red-400 text-red-400" : ""}`}
                        data-testid="btn-toggle-recording"
                        size="sm"
                      >
                        {obsStats.recording ? (
                          <><Square className="w-3 h-3 mr-1" /> Stop Rec</>
                        ) : (
                          <><Circle className="w-3 h-3 mr-1" /> Record</>
                        )}
                      </Button>
                    </div>
                    {obsStats.streaming && (
                      <div className="flex items-center justify-center gap-1 text-xs text-green-400">
                        <Radio className="w-3 h-3 pulse" />
                        LIVE
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Stream Title */}
                  <div className="space-y-1">
                    <Label htmlFor="stream-title-mid" className="text-xs">Title</Label>
                    {isAuthenticated ? (
                      <div className="flex gap-1">
                        <Input
                          id="stream-title-mid"
                          value={newTitle}
                          onChange={handleTitleChange}
                          onFocus={() => isEditingTitle.current = true}
                          placeholder="Stream title..."
                          className="glass text-xs h-8"
                        />
                        <Button
                          onClick={updateStreamTitle}
                          className="bg-gradient-to-r from-pink-500 to-purple-500 h-8 px-3 text-xs"
                        >
                          ✓
                        </Button>
                      </div>
                    ) : (
                      <div className="glass p-2 rounded border border-pink-400/30">
                        <p className="text-xs text-white truncate">{twitchStats.stream_title || "No title"}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Category */}
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    {isAuthenticated ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">{twitchStats.stream_category}</Badge>
                          <Button
                            onClick={() => setShowCategoryInput(!showCategoryInput)}
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                          >
                            {showCategoryInput ? "Cancel" : "Edit"}
                          </Button>
                        </div>
                        
                        {showCategoryInput && (
                          <div className="space-y-2 glass p-2 rounded border border-cyan-400/30">
                            <p className="text-[10px] text-gray-400">Select category:</p>
                            <div className="grid grid-cols-2 gap-1">
                              {popularCategories.map((cat) => (
                                <Button
                                  key={cat}
                                  onClick={() => updateStreamCategory(cat)}
                                  variant="outline"
                                  size="sm"
                                  className={`text-[10px] h-7 ${twitchStats.stream_category === cat ? 'border-cyan-400 bg-cyan-400/10' : ''}`}
                                >
                                  {cat}
                                </Button>
                              ))}
                            </div>
                            
                            <Separator className="my-1" />
                            
                            <div className="flex gap-1">
                              <Input
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="Custom category..."
                                className="glass text-[10px] h-7"
                              />
                              <Button
                                onClick={() => {
                                  if (newCategory) {
                                    updateStreamCategory(newCategory);
                                    setNewCategory("");
                                  }
                                }}
                                size="sm"
                                className="bg-cyan-500 hover:bg-cyan-600 h-7 px-2 text-[10px]"
                              >
                                Set
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">{twitchStats.stream_category}</Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Tags */}
                  <div className="space-y-1">
                    <Label className="text-xs">Tags</Label>
                    {isAuthenticated ? (
                      <div className="space-y-2">
                        {/* Current Tags */}
                        <div className="flex flex-wrap gap-1 min-h-[24px]">
                          {streamTags.length === 0 ? (
                            <span className="text-[10px] text-gray-400">No tags</span>
                          ) : (
                            streamTags.slice(0, 3).map((tag) => (
                              <Badge 
                                key={tag} 
                                className="bg-cyan-500/20 border-cyan-400 text-cyan-400 pr-1 text-[9px] h-5"
                              >
                                {tag}
                                <button
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 hover:text-red-400 transition-colors"
                                >
                                  ×
                                </button>
                              </Badge>
                            ))
                          )}
                          {streamTags.length > 3 && (
                            <Badge variant="secondary" className="text-[9px] h-5">
                              +{streamTags.length - 3}
                            </Badge>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => setShowTagInput(!showTagInput)}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                        >
                          {showTagInput ? "Cancel" : "Edit Tags"}
                        </Button>
                        
                        {showTagInput && (
                          <div className="space-y-2 glass p-2 rounded border border-cyan-400/30">
                            <p className="text-[10px] text-gray-400">Tags ({streamTags.length}/10):</p>
                            <div className="grid grid-cols-3 gap-1">
                              {popularTags.map((tag) => (
                                <Button
                                  key={tag}
                                  onClick={() => addTag(tag)}
                                  variant="outline"
                                  size="sm"
                                  disabled={streamTags.includes(tag) || streamTags.length >= 10}
                                  className={`text-[9px] h-6 ${streamTags.includes(tag) ? 'opacity-50' : ''}`}
                                >
                                  {tag}
                                </Button>
                              ))}
                            </div>
                            
                            <Separator className="my-1" />
                            
                            <div className="flex gap-1">
                              <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                placeholder="Custom tag..."
                                maxLength={25}
                                className="glass text-[10px] h-7"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && newTag.trim()) {
                                    addTag(newTag.trim());
                                  }
                                }}
                              />
                              <Button
                                onClick={() => {
                                  if (newTag.trim()) {
                                    addTag(newTag.trim());
                                  }
                                }}
                                size="sm"
                                disabled={!newTag.trim() || streamTags.length >= 10}
                                className="bg-cyan-500 hover:bg-cyan-600 h-7 px-2 text-[10px]"
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {streamTags.length === 0 ? (
                          <span className="text-[10px] text-gray-400">No tags</span>
                        ) : (
                          streamTags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                          ))
                        )}
                        {streamTags.length > 3 && (
                          <Badge variant="secondary" className="text-[9px]">+{streamTags.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <Separator />

                  {/* Stream Presets */}
                  <div className="space-y-1">
                    <Label className="text-xs">Quick Presets</Label>
                    {isAuthenticated ? (
                      <div className="grid grid-cols-3 gap-1">
                        <Button
                          onClick={() => applyPreset('grwm')}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-[10px] border-pink-400 text-pink-400 hover:bg-pink-400 hover:text-white"
                        >
                          💄 GRWM
                        </Button>
                        <Button
                          onClick={() => applyPreset('coworking')}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-[10px] border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                        >
                          💻 Work
                        </Button>
                        <Button
                          onClick={() => applyPreset('musicfeedback')}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-[10px] border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white"
                        >
                          🎵 Music
                        </Button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-400">Login to use presets</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queue Info */}
            <div>
              <Card className="glass h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Music className="w-4 h-4 text-purple-400" />
                    Feedback Queue Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Queue Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="flex flex-col items-center justify-center p-2 glass rounded border border-purple-400/30">
                      <span className="text-[10px] text-gray-400 text-center">Total</span>
                      <span className="text-lg font-bold text-purple-400">{queueStats.total_submissions}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 glass rounded border border-green-400/30">
                      <span className="text-[10px] text-gray-400 text-center">Played</span>
                      <span className="text-lg font-bold text-green-400">{queueStats.played}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 glass rounded border border-red-400/30">
                      <span className="text-[10px] text-gray-400 text-center">Not Played</span>
                      <span className="text-lg font-bold text-red-400">{queueStats.skipped}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 glass rounded border border-cyan-400/30">
                      <span className="text-[10px] text-gray-400 text-center">Pending</span>
                      <span className="text-lg font-bold text-cyan-400">{queueStats.pending}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Queue Previews - Side by Side */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Submission Queue Preview */}
                    <div className="space-y-2">
                      <Label className="text-xs">Submission Queue ({submissions.length})</Label>
                      <ScrollArea className="h-[200px]">
                        {submissions.length === 0 ? (
                          <div className="text-center py-4">
                            <Music className="w-6 h-6 mx-auto mb-1 text-gray-500 opacity-50" />
                            <p className="text-[10px] text-gray-400">No submissions yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1 pr-2">
                            {submissions.slice(0, 5).map((sub) => (
                              <div key={sub.id} className="p-2 glass rounded border border-purple-400/20 text-[10px] flex gap-2">
                                {/* Status Checkboxes */}
                                <div className="flex flex-col gap-1 items-center justify-center">
                                  <button
                                    onClick={() => markSubmission(sub.id, 'played')}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                      sub.status === 'played' 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'border-gray-500 hover:border-green-400'
                                    }`}
                                    title="Mark as Played"
                                  >
                                    {sub.status === 'played' && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => markSubmission(sub.id, 'skipped')}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                      sub.status === 'skipped' 
                                        ? 'bg-red-500 border-red-500' 
                                        : 'border-gray-500 hover:border-red-400'
                                    }`}
                                    title="Mark as Not Played"
                                  >
                                    {sub.status === 'skipped' && (
                                      <X className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                </div>
                                
                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white truncate">
                                    {getSongDisplayName(sub.song_link)}
                                  </div>
                                  <a 
                                    href={sub.song_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-cyan-400 hover:underline truncate block"
                                    title={sub.song_link}
                                  >
                                    {sub.song_link}
                                  </a>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-gray-400 truncate">
                                      by {sub.discord_display_name || sub.discord_username}
                                      {sub.twitch_username && ` (@${sub.twitch_username})`}
                                    </span>
                                    {/* Sub Tier Badge */}
                                    {(() => {
                                      const discordUser = sub.discord_username || sub.discord_display_name;
                                      const tier = getSubmissionSubTier(discordUser, sub.twitch_username);
                                      
                                      if (tier === 'NO_MATCH') {
                                        return (
                                          <span className="w-2 h-2 rounded-full bg-red-500 border border-red-400" title="No Twitch match found"></span>
                                        );
                                      }
                                      
                                      if (tier === 'PENDING') {
                                        return (
                                          <span className="text-[7px] px-1.5 py-0.5 rounded border bg-gray-600 border-gray-400 font-bold whitespace-nowrap">
                                            ...
                                          </span>
                                        );
                                      }
                                      
                                      return (
                                        <span className={`text-[7px] px-1.5 py-0.5 rounded border font-bold whitespace-nowrap ${getSubTierBadgeClass(tier)}`}>
                                          {tier}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                  <div className="text-gray-500 text-[9px] mt-0.5">
                                    {sub.status === 'played' && '✓ Played'}
                                    {sub.status === 'skipped' && '⊘ Not Played'}
                                    {sub.status === 'pending' && '⏳ Pending'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>

                    {/* Skip Queue Preview */}
                    <div className="space-y-2">
                      <Label className="text-xs">Skip Queue ({queueStats.skip_queue_count})</Label>
                      <ScrollArea className="h-[200px]">
                        {skipQueue.length === 0 ? (
                          <div className="text-center py-4">
                            <SkipForward className="w-6 h-6 mx-auto mb-1 text-gray-500 opacity-50" />
                            <p className="text-[10px] text-gray-400">No skips yet</p>
                          </div>
                        ) : (
                          <div className="space-y-1 pr-2">
                            {skipQueue.slice(0, 3).map((skip) => (
                              <div key={skip.id} className="p-2 glass rounded border border-red-400/20 text-[10px] flex gap-2">
                                {/* Status Checkboxes */}
                                <div className="flex flex-col gap-1 items-center justify-center">
                                  <button
                                    onClick={() => markSkipSubmission(skip.id, 'played')}
                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                      skip.status === 'played' 
                                        ? 'bg-green-500 border-green-500' 
                                        : 'border-gray-500 hover:border-green-400'
                                    }`}
                                    title="Mark as Played"
                                  >
                                    {skip.status === 'played' && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                  <button
                                    className="w-5 h-5 rounded border-2 bg-red-500 border-red-500 flex items-center justify-center"
                                    title="Not Played"
                                    disabled
                                  >
                                    <X className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                                
                                {/* Song Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white truncate">
                                    {getSongDisplayName(skip.song_link)}
                                  </div>
                                  <a 
                                    href={skip.song_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-cyan-400 hover:underline truncate block"
                                    title={skip.song_link}
                                  >
                                    {skip.song_link}
                                  </a>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-gray-400 truncate">
                                      by {skip.discord_display_name || skip.discord_username}
                                      {skip.twitch_username && ` (@${skip.twitch_username})`}
                                    </span>
                                    {/* Sub Tier Badge */}
                                    <span className={`text-[7px] px-1.5 py-0.5 rounded border font-bold whitespace-nowrap ${
                                      skip.twitch_username 
                                        ? getSubTierBadgeClass(getSubmissionSubTier(skip.twitch_username))
                                        : 'bg-indigo-600 border-indigo-400'
                                    }`}>
                                      {skip.twitch_username ? getSubmissionSubTier(skip.twitch_username) : 'Discord'}
                                    </span>
                                  </div>
                                  <div className="text-red-400 text-[9px] mt-0.5">⊘ Not Played</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </div>

                  <Separator />

                  {/* Now Playing */}
                  <div className="space-y-2">
                    <Label className="text-xs">Up Next in Queue</Label>
                    {submissions.length > 0 && submissions.filter(s => s.status === 'pending').length > 0 ? (
                      (() => {
                        const nextSong = submissions.filter(s => s.status === 'pending')[0];
                        return (
                          <div className="p-3 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-400/30">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate" title={nextSong.song_link}>
                                  {getSongDisplayName(nextSong.song_link)}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  by {nextSong.discord_display_name || nextSong.discord_username}
                                  {nextSong.twitch_username && ` (@${nextSong.twitch_username})`}
                                </p>
                                <a 
                                  href={nextSong.song_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-cyan-400 hover:underline truncate block mt-1"
                                >
                                  🔗 Open Link
                                </a>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge className="badge-vip text-[9px] px-1.5 py-0">⏳ Next</Badge>
                                <Button
                                  onClick={() => markSkipSubmission(nextSong.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-[9px] border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                                >
                                  <SkipForward className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        <Music className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <p className="text-[10px]">No songs in queue</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Stream Health - Full Width */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-cyan-400" />
                Stream Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* CPU & GPU Usage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-400" />
                      CPU
                    </span>
                    <span className="font-semibold">{obsStats.cpu_usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={obsStats.cpu_usage} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-pink-400" />
                      GPU
                    </span>
                    <span className="font-semibold">{obsStats.gpu_usage.toFixed(1)}%</span>
                  </div>
                  <Progress value={obsStats.gpu_usage} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sound Board Tab */}
        <TabsContent value="soundboard" className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-cyan-400 mb-2">🔊 Sound Board</h2>
            <p className="text-sm text-gray-400">Upload and play sounds for your stream</p>
          </div>

          {/* Upload Section */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-pink-400" />
                Upload Sounds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      uploadSound(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                  className="glass"
                  disabled={uploadingSound}
                />
                {uploadingSound && (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Uploading...</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Supported formats: MP3, WAV, OGG, M4A</p>
            </CardContent>
          </Card>

          {/* Category Tabs */}
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {soundCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'glass text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat.icon} {cat.name}
                    {cat.id !== 'all' && (
                      <span className="ml-2 opacity-70">
                        ({sounds.filter(s => (s.category || 'other') === cat.id).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sound Buttons Grid */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  {soundCategories.find(c => c.id === selectedCategory)?.icon} {soundCategories.find(c => c.id === selectedCategory)?.name} ({getFilteredSounds().length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getFilteredSounds().length === 0 ? (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                  {sounds.length === 0 ? (
                    <>
                      <p className="text-gray-400">No sounds uploaded yet</p>
                      <p className="text-sm text-gray-500 mt-2">Upload your first sound above!</p>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-400">No sounds in this category</p>
                      <p className="text-sm text-gray-500 mt-2">Drag sounds here or edit a sound to add it to this category</p>
                    </>
                  )}
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={getFilteredSounds().map(s => s.name)}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                      {getFilteredSounds().map((sound) => (
                        <SortableSound
                          key={sound.name}
                          sound={sound}
                          playSound={playSound}
                          openEditModal={openEditModal}
                          deleteSound={deleteSound}
                          playingSound={playingSound}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="glass border-cyan-400/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Stream Deck Integration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-300">
                <p className="font-semibold text-cyan-400">How to use with Stream Deck:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Open Stream Deck software</li>
                  <li>Add "System" → "Open Website" action</li>
                  <li>Set URL to: <code className="bg-black/40 px-2 py-0.5 rounded text-pink-400">http://localhost:8001/api/sounds/play/SOUNDNAME</code></li>
                  <li>Replace SOUNDNAME with your sound file name</li>
                  <li>Press button to play sound!</li>
                </ol>
                <p className="text-[10px] text-gray-500 mt-2">Sounds play through your browser, so make sure this page is open!</p>
              </div>
            </CardContent>
          </Card>

          {/* Edit Sound Modal */}
          {editingSound && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <Card className="glass w-full max-w-sm border-cyan-400/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      Edit Sound
                    </span>
                    <button
                      onClick={() => setEditingSound(null)}
                      className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                      <span className="text-xl text-gray-400">×</span>
                    </button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Display Name */}
                  <div className="space-y-1">
                    <Label htmlFor="edit-name" className="text-xs">Display Name</Label>
                    <Input
                      id="edit-name"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                      placeholder="Enter display name..."
                      className="glass h-8 text-sm"
                    />
                    <p className="text-[10px] text-gray-400">File: {editingSound.name}</p>
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {soundCategories.filter(c => c.id !== 'all').map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setEditForm({...editForm, category: cat.id})}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            editForm.category === cat.id
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'glass text-gray-400 hover:text-white'
                          }`}
                        >
                          {cat.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div className="space-y-1">
                    <Label className="text-xs">Button Color</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { name: 'purple-pink', from: 'from-purple-600', to: 'to-pink-600', label: 'Purple' },
                        { name: 'blue-cyan', from: 'from-blue-600', to: 'to-cyan-600', label: 'Blue' },
                        { name: 'green-emerald', from: 'from-green-600', to: 'to-emerald-600', label: 'Green' },
                        { name: 'red-orange', from: 'from-red-600', to: 'to-orange-600', label: 'Red' },
                        { name: 'yellow-amber', from: 'from-yellow-600', to: 'to-amber-600', label: 'Yellow' },
                        { name: 'pink-rose', from: 'from-pink-600', to: 'to-rose-600', label: 'Pink' },
                        { name: 'indigo-purple', from: 'from-indigo-600', to: 'to-purple-600', label: 'Indigo' },
                        { name: 'gray-slate', from: 'from-gray-600', to: 'to-slate-600', label: 'Gray' }
                      ].map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setEditForm({...editForm, color: color.name})}
                          className={`aspect-square rounded-lg bg-gradient-to-br ${color.from} ${color.to} transition-all ${
                            editForm.color === color.name ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="space-y-1">
                    <Label className="text-xs">Preview</Label>
                    <div className="flex justify-center">
                      <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${
                        {
                          'purple-pink': 'from-purple-600 to-pink-600',
                          'blue-cyan': 'from-blue-600 to-cyan-600',
                          'green-emerald': 'from-green-600 to-emerald-600',
                          'red-orange': 'from-red-600 to-orange-600',
                          'yellow-amber': 'from-yellow-600 to-amber-600',
                          'pink-rose': 'from-pink-600 to-rose-600',
                          'indigo-purple': 'from-indigo-600 to-purple-600',
                          'gray-slate': 'from-gray-600 to-slate-600'
                        }[editForm.color]
                      } flex flex-col items-center justify-center gap-0.5 shadow-lg`}>
                        <Music className="w-4 h-4 text-white" />
                        <span className="text-white font-bold text-[8px] text-center px-1 leading-tight break-words">
                          {editForm.displayName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setEditingSound(null)}
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => updateSound(editingSound.name, {
                        displayName: editForm.displayName,
                        color: editForm.color,
                        category: editForm.category
                      })}
                      className="flex-1 h-8 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                    >
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Feedback Queue Tab */}
        {/* Music Queue Tab */}
        <TabsContent value="music" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Now Playing */}
            <Card className="glass gradient-border">
              <div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5 text-pink-400" />
                    Now Playing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nowPlaying ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-400/30">
                        <p className="text-2xl font-bold gradient-text">{nowPlaying.title}</p>
                        <p className="text-lg text-gray-300 mt-1">{nowPlaying.artist}</p>
                        <p className="text-sm text-gray-400 mt-2">Submitted by: {nowPlaying.submitted_by}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className="badge-vip">⭐ {nowPlaying.votes} votes</Badge>
                        <Button
                          onClick={() => skipSong(nowPlaying.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-400 text-red-400"
                          data-testid="btn-skip-current"
                        >
                          <SkipForward className="w-4 h-4 mr-2" />
                          Skip
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No song playing</p>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>

            {/* Submit Song */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-cyan-400" />
                  Submit Track
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitMusic} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="artist">Artist Name</Label>
                    <Input
                      id="artist"
                      value={musicForm.artist}
                      onChange={(e) => setMusicForm({ ...musicForm, artist: e.target.value })}
                      placeholder="Enter artist name..."
                      className="glass"
                      data-testid="input-artist"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">Track Title</Label>
                    <Input
                      id="title"
                      value={musicForm.title}
                      onChange={(e) => setMusicForm({ ...musicForm, title: e.target.value })}
                      placeholder="Enter track title..."
                      className="glass"
                      data-testid="input-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL (YouTube, SoundCloud, etc.)</Label>
                    <Input
                      id="url"
                      value={musicForm.url}
                      onChange={(e) => setMusicForm({ ...musicForm, url: e.target.value })}
                      placeholder="https://..."
                      className="glass"
                      data-testid="input-url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="submitted_by">Your Name</Label>
                    <Input
                      id="submitted_by"
                      value={musicForm.submitted_by}
                      onChange={(e) => setMusicForm({ ...musicForm, submitted_by: e.target.value })}
                      placeholder="Enter your name..."
                      className="glass"
                      data-testid="input-submitted-by"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
                    data-testid="btn-submit-song"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    Submit to Queue
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Queue List */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Queue ({musicQueue.length} songs)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {musicQueue.length > 0 ? (
                  <div className="space-y-3">
                    {musicQueue.map((song, index) => (
                      <div
                        key={song.id}
                        className="p-4 rounded-lg glass border border-white/10 hover:border-pink-400/50 transition-all"
                        data-testid={`queue-item-${index}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                              <p className="font-semibold text-white">{song.title}</p>
                            </div>
                            <p className="text-sm text-gray-300">{song.artist}</p>
                            <p className="text-xs text-gray-500 mt-1">by {song.submitted_by}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{song.votes} ⭐</Badge>
                            <Button
                              onClick={() => playSong(song.id)}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              data-testid={`btn-play-${index}`}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Queue is empty. Submit some tracks!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat & Alerts Tab */}
        <TabsContent value="chat" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Live Chat */}
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  Live Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4 mb-4">
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="slide-in p-3 rounded-lg glass" data-testid={`chat-message-${msg.id}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold" style={{ color: msg.color }}>
                                {msg.username}
                              </span>
                              {/* Sub Tier Badge */}
                              <span className={`text-[9px] px-2 py-0.5 rounded border ${getSubTierBadgeClass(getSubTier(msg.badge_info))} font-bold`}>
                                {getSubTier(msg.badge_info)}
                              </span>
                              {msg.badges && msg.badges.map((badge, i) => (
                                <span key={i} className={`badge badge-${badge}`}>
                                  {getBadgeName(badge)}
                                </span>
                              ))}
                            </div>
                            <div className="text-sm text-gray-200">
                              {renderMessageWithEmotes(msg.message, msg.emotes)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                {/* Chat Moderation Controls */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-sm text-gray-400">Chat Moderation</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button
                      onClick={() => toggleSlowMode(true)}
                      variant="outline"
                      size="sm"
                      className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white"
                      disabled={!isAuthenticated}
                    >
                      ⏱️ Slow Mode
                    </Button>
                    <Button
                      onClick={() => toggleFollowerOnly(true)}
                      variant="outline"
                      size="sm"
                      className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
                      disabled={!isAuthenticated}
                    >
                      👥 Follower-Only
                    </Button>
                    <Button
                      onClick={() => toggleSubscriberOnly(true)}
                      variant="outline"
                      size="sm"
                      className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white"
                      disabled={!isAuthenticated}
                    >
                      👑 Sub-Only
                    </Button>
                    <Button
                      onClick={() => toggleEmoteOnly(true)}
                      variant="outline"
                      size="sm"
                      className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-white"
                      disabled={!isAuthenticated}
                    >
                      😀 Emote-Only
                    </Button>
                    <Button
                      onClick={timeoutUser}
                      variant="outline"
                      size="sm"
                      className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white"
                      disabled={!isAuthenticated}
                    >
                      ⏰ Timeout User
                    </Button>
                    <Button
                      onClick={banUser}
                      variant="outline"
                      size="sm"
                      className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                      disabled={!isAuthenticated}
                    >
                      🔨 Ban User
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alerts & AI */}
            <div className="space-y-6">
              {/* Recent Alerts */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Recent Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-3">
                      {alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-pink-500/20 border border-yellow-400/30"
                          data-testid={`alert-${alert.id}`}
                        >
                          <div className="flex items-center gap-2">
                            {alert.type === "follower" && <Heart className="w-4 h-4 text-pink-400" />}
                            {alert.type === "subscriber" && <Crown className="w-4 h-4 text-purple-400" />}
                            {alert.type === "donation" && <Sparkles className="w-4 h-4 text-yellow-400" />}
                            <div>
                              <p className="font-semibold text-white">{alert.username}</p>
                              <p className="text-sm text-gray-300">
                                {alert.message}
                                {alert.amount && ` $${alert.amount}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* AI Sentiment */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    AI Sentiment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sentiment && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">Chat Mood</span>
                          <Badge className="bg-green-500">{sentiment.overall}</Badge>
                        </div>
                        <Progress value={sentiment.score * 100} className="h-2" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Top Emotes</p>
                        <div className="flex gap-2 text-2xl">
                          {sentiment.top_emotes.map((emote, i) => (
                            <span key={i}>{emote}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Trending</p>
                        <div className="flex flex-wrap gap-2">
                          {sentiment.trending_topics.map((topic, i) => (
                            <Badge key={i} variant="outline">{topic}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="glass stat-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Clock className="w-8 h-8 text-purple-400" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-400">{analytics.stream_duration_minutes}m</p>
                        <p className="text-xs text-gray-400">Stream Duration</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass stat-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="w-8 h-8 text-green-400" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-400">{analytics.peak_viewers}</p>
                        <p className="text-xs text-gray-400">Peak Viewers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass stat-card">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Music className="w-8 h-8 text-pink-400" />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-pink-400">{analytics.total_songs_reviewed}</p>
                        <p className="text-xs text-gray-400">Songs Reviewed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-cyan-400" />
                      Stream Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Average Viewers</span>
                        <span className="font-semibold text-cyan-400">{analytics.avg_viewers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">New Followers</span>
                        <span className="font-semibold text-pink-400">+{analytics.new_followers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">New Subscribers</span>
                        <span className="font-semibold text-purple-400">+{analytics.new_subscribers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Chat Messages</span>
                        <span className="font-semibold text-green-400">{analytics.chat_messages}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Clips Created</span>
                        <span className="font-semibold text-yellow-400">{analytics.clips_created}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Songs in Queue</span>
                        <span className="font-semibold text-pink-400">{analytics.songs_in_queue}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Top Chatters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.top_chatters.map((chatter, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg glass"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 font-bold">
                            {index + 1}
                          </div>
                          <span className="font-semibold">{chatter}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;