# Running the Dashboard - Extremely Detailed Guide

Step-by-step instructions for running `docker-compose up` for the first time.

---

## Before You Start

### Make Sure Docker Desktop is Running

**Windows:**
1. Look at your system tray (bottom-right corner of screen)
2. Find the Docker whale icon 🐋
3. If you DON'T see it:
   - Click Windows Start button
   - Type "Docker Desktop"
   - Click to open it
4. Wait until the whale icon is solid (not animated)
5. The icon should be white/normal, not spinning

**Mac:**
1. Look at your menu bar (top of screen)
2. Find the Docker whale icon 🐋
3. If you DON'T see it:
   - Press Cmd+Space
   - Type "Docker Desktop"
   - Press Enter
4. Wait until you see "Docker Desktop is running"

**Verify Docker is Ready:**
- Right-click the Docker icon
- You should see "Docker Desktop is running"
- NOT "Docker Desktop is starting..."

---

## Step 1: Open Terminal/Command Prompt

### On Windows

**Method 1: Using PowerShell (Recommended)**
1. Click the **Windows Start** button (bottom-left)
2. Type: `PowerShell`
3. You'll see "Windows PowerShell" appear
4. Click on it (or press Enter)
5. A blue window opens - this is PowerShell

**Method 2: Using Command Prompt**
1. Click Windows Start
2. Type: `cmd`
3. Click "Command Prompt"
4. A black window opens

**What you'll see:**
```
PS C:\Users\YourName>
```
Or:
```
C:\Users\YourName>
```

### On Mac

**Method 1: Using Spotlight**
1. Press `Cmd + Space` (hold Command, press Space)
2. Type: `Terminal`
3. Press Enter
4. Terminal window opens

**Method 2: From Applications**
1. Open Finder
2. Go to Applications → Utilities
3. Double-click "Terminal"

**What you'll see:**
```
YourName@MacBook ~ %
```

---

## Step 2: Navigate to Your Dashboard Folder

You need to tell the terminal WHERE your dashboard folder is.

### Find Your Folder Location

**Windows Common Locations:**
- Desktop: `C:\Users\YourName\Desktop\kallie-dashboard`
- Documents: `C:\Users\YourName\Documents\kallie-dashboard`
- Downloads: `C:\Users\YourName\Downloads\kallie-dashboard`
- C drive root: `C:\kallie-dashboard`

**Mac Common Locations:**
- Desktop: `~/Desktop/kallie-dashboard`
- Documents: `~/Documents/kallie-dashboard`
- Downloads: `~/Downloads/kallie-dashboard`
- Home: `~/kallie-dashboard`

### Navigate to the Folder

**Windows PowerShell:**

If folder is on Desktop:
```powershell
cd Desktop\kallie-dashboard
```

If folder is in Documents:
```powershell
cd Documents\kallie-dashboard
```

If folder is in Downloads:
```powershell
cd Downloads\kallie-dashboard
```

If folder is on C drive:
```powershell
cd C:\kallie-dashboard
```

**Windows Command Prompt:**

Same as above, but if on different drive (like D:), first type:
```cmd
D:
cd D:\kallie-dashboard
```

**Mac Terminal:**

If folder is on Desktop:
```bash
cd ~/Desktop/kallie-dashboard
```

If folder is in Documents:
```bash
cd ~/Documents/kallie-dashboard
```

If folder is in Downloads:
```bash
cd ~/Downloads/kallie-dashboard
```

**After typing `cd` command, press ENTER!**

### Verify You're in the Right Place

Type this command and press Enter:

**Windows:**
```powershell
dir
```

**Mac/Linux:**
```bash
ls
```

**You should see:**
```
backend
frontend
docker-compose.yml
.env.example
... (other files)
```

If you see `backend` and `frontend` folders, you're in the right place! ✅

If you see "cannot find the path" or files are missing:
- You're in the wrong folder
- Try the `cd` command again with correct path

---

## Step 3: Run Docker Compose

Now we start everything!

### The Command

Type this EXACTLY (then press Enter):

```bash
docker-compose up
```

**That's it! Just those 3 words with a space and a dash.**

Press **Enter** after typing.

---

## Step 4: What Happens Next (First Time)

### Phase 1: Downloading Images (2-3 minutes)

You'll see:
```
Pulling mongodb...
Pulling backend...
Pulling frontend...
```

**What's happening:**
- Docker downloads MongoDB database image (~500MB)
- Docker downloads Python image for backend
- Docker downloads Node.js image for frontend

**This is normal and only happens the FIRST TIME.**

### Phase 2: Building Containers (5-7 minutes)

You'll see lots of text scrolling:
```
Building backend...
Step 1/8 : FROM python:3.11-slim
Step 2/8 : WORKDIR /app/backend
...
```

**What's happening:**
- Installing Python packages (FastAPI, twitchAPI, etc.)
- Installing Node packages (React, Tailwind, etc.)
- Setting up the environment

**This is normal. Just wait.**

You might see:
- `npm WARN` messages - **IGNORE THESE**
- Yellow text warnings - **NORMAL**
- Packages being downloaded - **GOOD**

### Phase 3: Starting Services (1 minute)

You'll see:
```
Creating kallie-dashboard-mongo ... done
Creating kallie-dashboard-backend ... done
Creating kallie-dashboard-frontend ... done
```

**What's happening:**
- MongoDB database starting
- Backend (Python) starting
- Frontend (React) starting

### Phase 4: Services Running

**Watch for these SUCCESS messages:**

**MongoDB ready:**
```
mongodb | Waiting for connections
```

**Backend ready:**
```
backend | INFO: Application startup complete.
backend | INFO: Uvicorn running on http://0.0.0.0:8001
```

**Frontend ready (MOST IMPORTANT):**
```
frontend | Compiled successfully!
frontend | webpack compiled successfully
```

**When you see "Compiled successfully!" - YOU'RE READY!** 🎉

---

## Step 5: Open the Dashboard

### Open Your Web Browser

1. Open Chrome, Firefox, Safari, or Edge
2. In the address bar, type EXACTLY:
   ```
   http://localhost:3000
   ```
3. Press Enter

**You should see:**
- The login screen with "Kallie's Dashboard"
- Pink/purple Y2K styled interface
- "Login with Twitch" button

---

## Step 6: Login

1. Click **"Login with Twitch"** button
2. You'll be redirected to Twitch
3. Click **"Authorize"**
4. You'll be redirected back to the dashboard
5. **You're in!** You should see:
   - Your username in top-right
   - Stats showing
   - Dashboard loaded

---

## Step 7: Verify OBS Connection

### Make Sure OBS is Running First!

1. Open **OBS Studio** on your computer
2. Make sure WebSocket is enabled (Tools → WebSocket Server Settings)

### Check Dashboard

Look at the **"Stream Health"** panel:
- **FPS:** Should show real numbers (like 60, not 0)
- **CPU Usage:** Should show percentage
- **Current Scene:** Should show your actual OBS scene name

### Test Control

Try clicking a scene button in the dashboard:
- Watch OBS
- Does it switch scenes?
- **If YES:** OBS is connected! ✅
- **If NO:** See troubleshooting below

---

## What the Terminal Shows While Running

### Normal Output

You'll see continuous messages like:
```
backend | INFO: 127.0.0.1:45678 - "GET /api/twitch/stats HTTP/1.1" 200 OK
frontend | [HMR] Waiting for update signal from WDS...
mongodb | {"t":{"$date":"..."},"s":"I", ...}
```

**This is NORMAL!** These are logs showing the dashboard is working.

### Leave This Window Open

**DON'T CLOSE THE TERMINAL WINDOW!**

- Terminal must stay open while dashboard runs
- If you close it, dashboard stops
- You can minimize it

---

## How to Stop the Dashboard

When you're done streaming:

### Option 1: Stop in Terminal
1. Click on the terminal window
2. Press **Ctrl + C** (hold Control, press C)
3. You'll see:
   ```
   Stopping kallie-dashboard-backend ... done
   Stopping kallie-dashboard-frontend ... done
   Stopping kallie-dashboard-mongo ... done
   ```
4. Done! Everything stopped.

### Option 2: Stop via Docker Desktop
1. Open Docker Desktop application
2. Go to "Containers" tab
3. Find "kallie-dashboard"
4. Click the Stop button

---

## Next Time You Want to Use It

### Quick Start (After First Setup)

1. **Make sure Docker Desktop is running** (check for whale icon)
2. **Open terminal**
3. **Navigate to folder:**
   ```bash
   cd kallie-dashboard
   ```
   (or wherever you put it)
4. **Start it:**
   ```bash
   docker-compose up
   ```
5. **Wait for "Compiled successfully!"**
6. **Open:** http://localhost:3000

**Much faster the second time!** (~1-2 minutes instead of 10)

---

## Running in Background (Advanced)

If you don't want to see all the logs:

### Start in Background:
```bash
docker-compose up -d
```

The `-d` means "detached" (background mode)

**You'll see:**
```
Starting kallie-dashboard-mongo ... done
Starting kallie-dashboard-backend ... done
Starting kallie-dashboard-frontend ... done
```

Then terminal is free to use for other things!

### Check if it's Running:
```bash
docker-compose ps
```

Should show all services as "Up"

### View Logs (if needed):
```bash
docker-compose logs -f
```

Press Ctrl+C to stop viewing logs (services keep running)

### Stop Background Services:
```bash
docker-compose down
```

---

## Common Issues & Solutions

### "docker-compose: command not found"

**Problem:** Docker not installed or not in PATH

**Solution:**
1. Make sure Docker Desktop is installed
2. Restart terminal
3. Try `docker compose up` (without hyphen) - newer Docker versions

### "Cannot connect to Docker daemon"

**Problem:** Docker Desktop not running

**Solution:**
1. Open Docker Desktop application
2. Wait for it to fully start (whale icon should be solid)
3. Try again

### "Port 3000 is already in use"

**Problem:** Something else using port 3000

**Solution:**
1. Close other apps (especially other React apps)
2. Or edit `docker-compose.yml` to use different port:
   ```yaml
   ports:
     - "3001:3000"  # Use 3001 instead
   ```
3. Then access at http://localhost:3001

### "Frontend doesn't show up"

**Problem:** Frontend still building or error

**Solution:**
1. Wait longer (first time can take 10 minutes)
2. Look for "Compiled successfully!" in terminal
3. Check for red errors in terminal
4. Try refreshing browser: Ctrl+F5

### "OBS not connecting"

**Problem:** OBS not running or password wrong

**Solution:**
1. Open OBS
2. Check Tools → WebSocket Server Settings
3. Verify password matches `backend/.env`
4. Restart backend:
   ```bash
   docker-compose restart backend
   ```

### Logs scrolling too fast

**Solution:**
1. Stop with Ctrl+C
2. Run in background:
   ```bash
   docker-compose up -d
   ```
3. View specific service logs:
   ```bash
   docker-compose logs backend -f
   ```

---

## Visual Guide Summary

### Terminal Should Look Like:

**Starting:**
```
PS C:\Users\You\kallie-dashboard> docker-compose up
Creating network "kallie-dashboard_default" with the default driver
Creating kallie-dashboard-mongo ... done
Creating kallie-dashboard-backend ... done
Creating kallie-dashboard-frontend ... done
Attaching to mongo, backend, frontend
[lots of logs]
frontend | Compiled successfully!
```

**Running:**
```
backend | INFO: Application startup complete
frontend | webpack compiled successfully
[continuous logs scrolling]
```

**Stopping:**
```
^C (you press Ctrl+C)
Stopping kallie-dashboard-frontend ... done
Stopping kallie-dashboard-backend ... done
Stopping kallie-dashboard-mongo ... done
```

---

## Checklist Before First Run

- [ ] Docker Desktop installed and running
- [ ] Terminal/PowerShell open
- [ ] Navigated to `kallie-dashboard` folder (can see backend/ and frontend/)
- [ ] `.env` files created in backend/ and frontend/
- [ ] OBS running with WebSocket enabled
- [ ] Ready to type: `docker-compose up`

**If all checked, YOU'RE READY!** Type `docker-compose up` and press Enter!

---

## Success Indicators

**You'll know it worked when:**

1. ✅ Terminal shows "Compiled successfully!"
2. ✅ http://localhost:3000 loads in browser
3. ✅ You can log in with Twitch
4. ✅ Dashboard shows your stats
5. ✅ OBS controls work (scenes switch)

**That's it! Full OBS control from your dashboard!** 🎉
