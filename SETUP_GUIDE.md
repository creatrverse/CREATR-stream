# Kallie's Dashboard - Twitch & OBS Setup Guide

## Part 1: Twitch Developer Credentials

### Step 1: Create Twitch Application
1. Go to **https://dev.twitch.tv/console/apps**
2. Click **"Register Your Application"**
3. Fill in the details:
   - **Name**: `Kallie's Stream Dashboard` (or any name you prefer)
   - **OAuth Redirect URLs**: `http://localhost:3000/auth/callback`
   - **Category**: Choose `Broadcasting Suite`
4. Click **"Create"**

### Step 2: Get Your Credentials
1. After creation, click **"Manage"** on your new app
2. You'll see your **Client ID** - copy this
3. Click **"New Secret"** to generate a **Client Secret** - copy this immediately (you won't see it again!)
4. Copy your **Twitch Channel Name** (your username)

### What I need from you:
```
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
TWITCH_CHANNEL_NAME=your_channel_name_here
```

---

## Part 2: OBS WebSocket Setup

### Step 1: Enable OBS WebSocket
1. Open **OBS Studio**
2. Go to **Tools** → **WebSocket Server Settings**
3. Check **"Enable WebSocket server"**
4. Check **"Enable Authentication"**
5. Click **"Show Connect Info"** 
6. Copy the **Server Password** (or set a new one)
7. Note the **Server Port** (usually 4455)
8. Click **"Apply"** and **"OK"**

### What I need from you:
```
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=your_obs_password_here
```

**Important:** Your OBS must be running for the dashboard to connect!

---

## Part 3: Once You Have Everything

Share these credentials with me in this format:
```
TWITCH_CLIENT_ID=abc123...
TWITCH_CLIENT_SECRET=xyz789...
TWITCH_CHANNEL_NAME=YourChannelName
OBS_WEBSOCKET_URL=ws://localhost:4455
OBS_WEBSOCKET_PASSWORD=your_password
```

Then I'll:
1. Install the required libraries (twitch API, OBS WebSocket client)
2. Implement real Twitch chat feed
3. Connect to your OBS for live control
4. Show real viewer counts, followers, and stream stats
5. Enable actual scene switching and source control

---

## Features You'll Get

### Twitch Integration:
✅ Real-time chat messages
✅ Live follower/subscriber counts
✅ Actual viewer count
✅ Stream title and category
✅ Real alerts (new followers, subs, raids)
✅ Create actual Twitch clips
✅ Stream markers

### OBS Integration:
✅ Start/Stop your actual stream
✅ Start/Stop recording
✅ Switch between your real scenes
✅ Toggle sources on/off
✅ Real CPU/GPU/FPS/Bitrate stats
✅ Save replay buffer clips

---

## Security Note
Never share these credentials publicly. I'll store them securely in your `.env` file which is not exposed to the internet.
