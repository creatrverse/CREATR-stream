import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
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
  Trash2
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
  const [scenes, setScenes] = useState([]);
  const [sources, setSources] = useState({});

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
  
  // Sound Board State
  const [sounds, setSounds] = useState([]);
  const [uploadingSound, setUploadingSound] = useState(false);

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
      setScenes(response.data.scenes);
    } catch (error) {
      console.error("Error fetching scenes:", error);
    }
  };

  // Fetch sources
  const fetchSources = async () => {
    try {
      const response = await axios.get(`${API}/obs/sources`);
      setSources(response.data.sources);
    } catch (error) {
      console.error("Error fetching sources:", error);
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
      setChatMessages(prev => [...response.data, ...prev].slice(0, 50));
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
      setSubmissions(response.data.submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };
  
  // Fetch skip queue
  const fetchSkipQueue = async () => {
    try {
      const response = await axios.get(`${API}/queue/skips`);
      setSkipQueue(response.data.submissions);
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
      const audio = new Audio(`${API}/sounds/play/${soundName}`);
      audio.play();
      toast.success(`Playing ${soundName}! 🔊`);
    } catch (error) {
      toast.error("Failed to play sound");
      console.error("Error playing sound:", error);
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
          <TabsTrigger value="streamdeck" data-testid="tab-streamdeck">🎮 Stream Deck</TabsTrigger>
          <TabsTrigger value="soundboard" data-testid="tab-soundboard">🔊 Sound Board</TabsTrigger>
          <TabsTrigger value="queue" data-testid="tab-queue">🎵 Feedback Queue</TabsTrigger>
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

          {/* TOP ROW: Stream Deck | Live Preview | Live Chat */}
          <div className="grid lg:grid-cols-12 gap-4">
            {/* Stream Deck (Left - 2 columns) */}
            <div className="lg:col-span-2">
              <Card className="glass h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-purple-400" />
                    Stream Deck
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Scene Switcher */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Scenes</Label>
                    <div className="space-y-1">
                      {scenes.slice(0, 4).map((scene) => (
                        <Button
                          key={scene}
                          onClick={() => switchScene(scene)}
                          variant={obsStats.current_scene === scene ? "default" : "outline"}
                          size="sm"
                          className={`w-full text-xs ${obsStats.current_scene === scene ? "bg-gradient-to-r from-pink-500 to-purple-500" : ""}`}
                          data-testid={`btn-scene-${scene.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {scene}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Sources Toggle */}
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-400">Sources</Label>
                    <div className="space-y-1">
                      {Object.entries(sources).slice(0, 3).map(([name, visible]) => (
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview (Center - 8 columns) */}
            <div className="lg:col-span-8">
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
                  <div className="relative w-full aspect-video bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-lg overflow-hidden border border-pink-400/30">
                    {/* Twitch Embed Player */}
                    {twitchPlayerUrl && (
                      <iframe
                        src={twitchPlayerUrl}
                        className="w-full h-full"
                        frameBorder="0"
                        allowFullScreen={true}
                        scrolling="no"
                        title="Twitch Stream"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Chat (Right - 2 columns) */}
            <div className="lg:col-span-2">
              <Card className="glass h-full" data-testid="mini-chat">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageCircle className="w-4 h-4 text-cyan-400" />
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-2">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className="slide-in p-2 rounded glass text-xs" data-testid={`mini-chat-${msg.id}`}>
                          <div className="flex items-start gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                <span className="font-semibold truncate text-[10px]" style={{ color: msg.color }}>
                                  {msg.username}
                                </span>
                                {msg.badges.map((badge, i) => (
                                  <span key={i} className={`badge badge-${badge} text-[7px]`}>
                                    {badge === "moderator" ? "MOD" : badge === "subscriber" ? "SUB" : "VIP"}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] text-gray-200 break-words leading-tight">{msg.message}</p>
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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* MIDDLE ROW: OBS Control | Stream Info | Quick Actions */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* OBS Control (Left - 1/3 width) */}
            <div>
              <Card className="glass h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Monitor className="w-4 h-4 text-purple-400" />
                    OBS Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stream Controls */}
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => controlStream(obsStats.streaming ? "stop" : "start")}
                        className={`w-full text-xs ${obsStats.streaming ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
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
                        className={`w-full text-xs ${obsStats.recording ? "border-red-400 text-red-400" : ""}`}
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

                  {/* Current Scene */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-400">Scene</Label>
                    <p className="text-xs text-purple-400 font-semibold truncate">{obsStats.current_scene}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stream Info (Center - 1/3 width) */}
            <div>
              <Card className="glass h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Stream Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
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
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions (Right - 1/3 width) */}
            <div>
              <Card className="glass h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    onClick={createTwitchClip}
                    variant="outline"
                    size="sm"
                    className="w-full border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white text-xs"
                    data-testid="btn-twitch-clip"
                  >
                    <Scissors className="w-3 h-3 mr-1" />
                    Clip
                  </Button>
                  <Button
                    onClick={createMarker}
                    variant="outline"
                    size="sm"
                    className="w-full border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-white text-xs"
                    data-testid="btn-create-marker"
                  >
                    <Bookmark className="w-3 h-3 mr-1" />
                    Marker
                  </Button>
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

        {/* Stream Deck Tab - Touch Optimized */}
        <TabsContent value="streamdeck" className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-purple-400 mb-2">Virtual Stream Deck</h2>
            <p className="text-sm text-gray-400">Touch-optimized controls for streaming</p>
          </div>

          {/* Stream Controls Section */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Stream Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Start/Stop Stream */}
                <button
                  onClick={() => controlStream(obsStats.streaming ? "stop" : "start")}
                  className={`aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 ${
                    obsStats.streaming 
                      ? "bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800" 
                      : "bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800"
                  } shadow-lg`}
                >
                  {obsStats.streaming ? (
                    <Square className="w-12 h-12 text-white" />
                  ) : (
                    <Play className="w-12 h-12 text-white" />
                  )}
                  <span className="text-white font-bold text-lg">
                    {obsStats.streaming ? "Stop Stream" : "Start Stream"}
                  </span>
                </button>

                {/* Record */}
                <button
                  onClick={() => controlRecording(obsStats.recording ? "stop" : "start")}
                  className={`aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 ${
                    obsStats.recording
                      ? "bg-gradient-to-br from-red-500 to-pink-700 hover:from-red-600 hover:to-pink-800"
                      : "bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800"
                  } shadow-lg`}
                >
                  <Circle className="w-12 h-12 text-white" />
                  <span className="text-white font-bold text-lg">
                    {obsStats.recording ? "Stop Rec" : "Record"}
                  </span>
                </button>

                {/* Twitch Clip */}
                <button
                  onClick={createTwitchClip}
                  className="aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                >
                  <Scissors className="w-12 h-12 text-white" />
                  <span className="text-white font-bold text-lg">Create Clip</span>
                </button>

                {/* Marker */}
                <button
                  onClick={createMarker}
                  className="aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg"
                >
                  <Bookmark className="w-12 h-12 text-white" />
                  <span className="text-white font-bold text-lg">Marker</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Scene Switcher */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="w-5 h-5 text-purple-400" />
                Scenes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {scenes.map((scene) => (
                  <button
                    key={scene}
                    onClick={() => switchScene(scene)}
                    className={`aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                      obsStats.current_scene === scene
                        ? "bg-gradient-to-br from-pink-500 to-purple-600"
                        : "bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700"
                    }`}
                  >
                    <Video className="w-10 h-10 text-white" />
                    <span className="text-white font-bold text-center text-sm leading-tight">
                      {scene}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Source Toggle */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(sources).map(([name, visible]) => (
                  <button
                    key={name}
                    onClick={() => toggleSource(name, !visible)}
                    className={`aspect-square rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                      visible
                        ? "bg-gradient-to-br from-green-500 to-emerald-600"
                        : "bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700"
                    }`}
                  >
                    {visible ? (
                      <Eye className="w-10 h-10 text-white" />
                    ) : (
                      <EyeOff className="w-10 h-10 text-white opacity-50" />
                    )}
                    <span className="text-white font-bold text-center text-sm leading-tight">
                      {name}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Live Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass p-6 rounded-xl text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-3xl font-bold text-white">{twitchStats.viewers}</p>
                  <p className="text-sm text-gray-400">Viewers</p>
                </div>
                <div className="glass p-6 rounded-xl text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-pink-400" />
                  <p className="text-3xl font-bold text-white">{twitchStats.followers}</p>
                  <p className="text-sm text-gray-400">Followers</p>
                </div>
                <div className="glass p-6 rounded-xl text-center">
                  <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-3xl font-bold text-white">{twitchStats.subscribers}</p>
                  <p className="text-sm text-gray-400">Subs</p>
                </div>
                <div className="glass p-6 rounded-xl text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-3xl font-bold text-white">{obsStats.fps}</p>
                  <p className="text-sm text-gray-400">FPS</p>
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

          {/* Sound Buttons Grid */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Your Sounds ({sounds.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sounds.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                  <p className="text-gray-400">No sounds uploaded yet</p>
                  <p className="text-sm text-gray-500 mt-2">Upload your first sound above!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {sounds.map((sound) => (
                    <div key={sound.name} className="relative group">
                      <button
                        onClick={() => playSound(sound.name)}
                        className="w-full aspect-square rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
                      >
                        <Music className="w-8 h-8 text-white" />
                        <span className="text-white font-bold text-xs text-center leading-tight break-words">
                          {sound.name.replace(/\.[^/.]+$/, '')}
                        </span>
                      </button>
                      <button
                        onClick={() => deleteSound(sound.name)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete sound"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
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
        </TabsContent>

        {/* Feedback Queue Tab */}
        <TabsContent value="queue" className="space-y-6">
          <QueueManager
            submissions={submissions}
            skipQueue={skipQueue}
            queueStats={queueStats}
            usernameMappings={usernameMappings}
            mappingForm={mappingForm}
            setMappingForm={setMappingForm}
            markSubmission={markSubmission}
            markSkipSubmission={markSkipSubmission}
            addUsernameMapping={addUsernameMapping}
            removeUsernameMapping={removeUsernameMapping}
          />
        </TabsContent>

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
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="slide-in p-3 rounded-lg glass" data-testid={`chat-message-${msg.id}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold" style={{ color: msg.color }}>
                                {msg.username}
                              </span>
                              {msg.badges.map((badge, i) => (
                                <span key={i} className={`badge badge-${badge}`}>
                                  {badge === "moderator" ? "MOD" : badge === "subscriber" ? "SUB" : "VIP"}
                                </span>
                              ))}
                            </div>
                            <p className="text-sm text-gray-200">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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