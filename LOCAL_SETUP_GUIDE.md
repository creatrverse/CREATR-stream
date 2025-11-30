# Kallie's Dashboard - Local Setup Guide

Run the dashboard on your computer to connect directly to OBS!

---

## Prerequisites

### 1. Install Docker Desktop
**Download and install:**
- **Windows/Mac**: https://www.docker.com/products/docker-desktop/
- **Linux**: https://docs.docker.com/engine/install/

**After installation:**
- Open Docker Desktop
- Make sure it's running (you'll see the Docker icon in your system tray)

### 2. OBS Studio Setup
Make sure OBS WebSocket is enabled:
1. Open OBS Studio
2. Go to **Tools** → **WebSocket Server Settings**
3. ✅ Enable WebSocket server
4. ✅ Enable Authentication
5. Note your password (you'll need it)
6. Port should be **4455**

---

## Step-by-Step Installation

### Step 1: Download the Dashboard Code

**Option A: Using Git (Recommended)**
```bash
git clone <your-repo-url>
cd kallie-dashboard
```

**Option B: Download ZIP**
1. Download the code from your repository
2. Extract it to a folder (e.g., `C:\kallie-dashboard` or `~/kallie-dashboard`)
3. Open Terminal/Command Prompt in that folder

### Step 2: Create Environment File

1. Copy the example file:
```bash
cp .env.example .env
```

2. Open `.env` file and fill in your credentials:
```env
# Your Twitch credentials (same as before)
TWITCH_CLIENT_ID=1co0sg3nygo0o55ftyqmqqsfp83e77
TWITCH_CLIENT_SECRET=t9oeooy5aeuyr8bfw0st3ab4mf8co5
TWITCH_CHANNEL_NAME=kalliestockton

# Your OBS WebSocket password
OBS_WEBSOCKET_PASSWORD=GdIgynjOgY2WQaMr

# Generate a random secret key (or use this one)
SECRET_KEY=kallie-local-dashboard-secret-key-12345
```

### Step 3: Update Twitch Redirect URI

**Important!** Add local redirect to your Twitch app:

1. Go to https://dev.twitch.tv/console/apps
2. Click **"Manage"** on your application
3. **Add** new redirect URL: `http://localhost:3000/api/auth/callback`
4. Keep the existing cloud URL too!
5. Click **"Save"**

Now you'll have both:
- `https://livestream-control.preview.emergentagent.com/api/auth/callback` (cloud)
- `http://localhost:3000/api/auth/callback` (local)

### Step 4: Start the Dashboard

In your terminal/command prompt, run:

```bash
docker-compose up
```

**First time setup takes 5-10 minutes** (downloads images and installs dependencies)

You'll see logs from:
- MongoDB starting
- Backend installing Python packages
- Frontend installing Node packages
- All services running

**When you see:**
```
frontend  | Compiled successfully!
backend   | INFO:     Application startup complete.
```
**You're ready!**

---

## Step 5: Access the Dashboard

1. **Open browser**: http://localhost:3000
2. **Click "Login with Twitch"**
3. **Authorize the app**
4. **Redirected back** - you're logged in!

---

## Step 6: Verify OBS Connection

With OBS running and dashboard open:

1. Check the **Stream Health** panel
2. You should see:
   - Real FPS (not 0)
   - Real CPU usage
   - Your actual OBS scenes listed
3. Try **switching scenes** from the dashboard
4. Try **toggling sources** on/off

**If OBS controls work = SUCCESS!** 🎉

---

## Using the Dashboard

### To Start (Daily Use)
```bash
# Open terminal in dashboard folder
docker-compose up

# Or run in background:
docker-compose up -d
```

### To Stop
```bash
# Press Ctrl+C in terminal (if running in foreground)

# Or if running in background:
docker-compose down
```

### To View Logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### To Rebuild (After Code Changes)
```bash
docker-compose down
docker-compose up --build
```

---

## What You Get Locally

### ✅ Full OBS Control
- Start/Stop streaming from dashboard
- Switch scenes
- Toggle sources on/off
- Start/Stop recording
- Real CPU/GPU/FPS stats
- Save replay buffer

### ✅ All Twitch Features
- Real viewer counts
- Real subscriber count
- IRC chat
- Create clips
- Stream markers
- Update titles

### ✅ Music Queue
- Submit songs
- Queue management
- Now playing display

---

## Troubleshooting

### OBS Not Connecting

**Check:**
1. Is OBS running?
2. Is WebSocket enabled in OBS?
3. Is password correct in `.env`?
4. Is port 4455 open?

**Try:**
```bash
# Restart services
docker-compose restart backend
```

### Port Already in Use

If ports 3000 or 8001 are taken:

Edit `docker-compose.yml`:
```yaml
# Change to different ports
ports:
  - "3001:3000"  # Frontend
  - "8002:8001"  # Backend
```

Then update `REACT_APP_BACKEND_URL=http://localhost:8002`

### Can't Access Dashboard

Make sure Docker Desktop is running and services are up:
```bash
docker-compose ps
```

All services should show "Up" status.

---

## Accessing from Other Devices (Optional)

To access dashboard from phone/tablet on same network:

1. Find your computer's local IP:
   - **Windows**: `ipconfig` (look for IPv4)
   - **Mac/Linux**: `ifconfig` or `ip addr`

2. Access from other device:
   - `http://YOUR_IP:3000` (e.g., `http://192.168.1.100:3000`)

3. Update backend URL in browser console:
   ```javascript
   localStorage.setItem('BACKEND_URL', 'http://YOUR_IP:8001');
   ```

---

## Cloud vs Local

### Use Cloud Dashboard For:
- Accessing from anywhere
- Sharing with team/mods
- Mobile monitoring
- When away from streaming PC

### Use Local Dashboard For:
- Full OBS control
- Real stream stats
- Scene automation
- During actual streaming sessions

**You can use both!** Keep the cloud version for monitoring, use local for OBS control.

---

## Support

If you run into issues:

1. Check Docker Desktop is running
2. Check OBS is open with WebSocket enabled
3. View logs: `docker-compose logs`
4. Restart: `docker-compose restart`
5. Rebuild: `docker-compose up --build`

**Once running, your dashboard will connect to OBS on localhost and you'll have full control!**

🎉 **Happy Streaming!**
