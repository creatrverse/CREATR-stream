# How to Download Dashboard Code to Your Computer

There are several ways to get the code from Emergent to your computer. Choose the method that works best for you.

---

## Method 1: Using Emergent's Export Feature (Easiest)

### Step 1: Export from Emergent
1. In your Emergent workspace, look for an **"Export"** or **"Download"** button
2. This should package all your code into a ZIP file
3. Download the ZIP to your computer

### Step 2: Extract the Files
1. Find the downloaded ZIP file (usually in Downloads folder)
2. Right-click → Extract All (Windows) or Double-click (Mac)
3. Extract to a location like:
   - **Windows**: `C:\Users\YourName\kallie-dashboard`
   - **Mac**: `~/kallie-dashboard`
   - **Linux**: `~/kallie-dashboard`

### Step 3: Verify Files
Open the folder and check you have:
```
kallie-dashboard/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── LOCAL_SETUP_GUIDE.md
└── README.md
```

---

## Method 2: Using GitHub (Recommended for Updates)

### Step 1: Connect to GitHub
If you have Emergent connected to GitHub:

1. Go to your GitHub repository
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Extract the ZIP to your computer

**Or using Git:**
```bash
# Open Terminal/Command Prompt
git clone https://github.com/yourusername/kallie-dashboard.git
cd kallie-dashboard
```

### Benefits:
- Easy to get updates later
- Can push changes back to GitHub
- Version control

---

## Method 3: Manual File Download (If Export Not Available)

If Emergent doesn't have a direct export, you'll need to manually copy files.

### Important Files to Download:

#### Root Directory Files:
- `docker-compose.yml`
- `.env.example`
- `LOCAL_SETUP_GUIDE.md`
- `DOWNLOAD_INSTRUCTIONS.md`

#### Backend Directory (`/app/backend/`):
- `server.py`
- `twitch_service.py`
- `obs_service.py`
- `irc_chat_service.py`
- `oauth_service.py`
- `oauth_database.py`
- `requirements.txt`
- `.env`
- `Dockerfile`

#### Frontend Directory (`/app/frontend/`):
- `package.json`
- `yarn.lock`
- `tailwind.config.js`
- `postcss.config.js`
- `Dockerfile`
- `.env`
- `public/` (entire folder)
- `src/` (entire folder including):
  - `App.js`
  - `App.css`
  - `index.js`
  - `index.css`
  - `pages/Dashboard.jsx`
  - `components/LoginPrompt.jsx`
  - `context/AuthContext.jsx`
  - `components/ui/` (all files)
  - `hooks/` (all files)

### How to Download Manually:

**Using Emergent's File Explorer:**
1. Navigate to `/app` folder
2. Select files/folders
3. Look for "Download" option
4. Save to your computer maintaining folder structure

---

## Method 4: Using Command Line (Advanced)

If you have SSH/terminal access to Emergent:

### Step 1: Create Archive
```bash
cd /app
tar -czf kallie-dashboard.tar.gz backend/ frontend/ docker-compose.yml .env.example LOCAL_SETUP_GUIDE.md
```

### Step 2: Download Archive
Use your Emergent interface to download `kallie-dashboard.tar.gz`

### Step 3: Extract on Your Computer
```bash
# On your computer
tar -xzf kallie-dashboard.tar.gz
cd kallie-dashboard
```

---

## After Downloading (All Methods)

### Step 1: Create Folder Structure
Make sure you have this structure:

```
kallie-dashboard/
│
├── backend/
│   ├── server.py
│   ├── twitch_service.py
│   ├── obs_service.py
│   ├── irc_chat_service.py
│   ├── oauth_service.py
│   ├── oauth_database.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── package.json
│   ├── yarn.lock
│   ├── Dockerfile
│   ├── public/
│   └── src/
│       ├── App.js
│       ├── App.css
│       ├── pages/
│       ├── components/
│       └── context/
│
├── docker-compose.yml
├── .env.example
└── LOCAL_SETUP_GUIDE.md
```

### Step 2: Verify Key Files Exist

**Check backend files:**
```bash
# On Windows (PowerShell)
dir backend\server.py

# On Mac/Linux
ls backend/server.py
```

**Check frontend files:**
```bash
# On Windows (PowerShell)
dir frontend\package.json

# On Mac/Linux
ls frontend/package.json
```

**Check Docker files:**
```bash
# On Windows (PowerShell)
dir docker-compose.yml

# On Mac/Linux
ls docker-compose.yml
```

If all these exist, you're ready! ✅

---

## Common Issues

### Missing Files?

If files are missing, you need to re-download or manually create them:

1. Go back to Emergent
2. Navigate to `/app` folder
3. Download missing files individually
4. Place them in correct folders on your computer

### Wrong Folder Structure?

Make sure all files are in the right place:
- Backend files in `backend/` folder
- Frontend files in `frontend/` folder
- `docker-compose.yml` at the root (same level as backend/ and frontend/)

### Can't Find .env Files?

The `.env` files contain secrets and might not be included in exports.

You'll need to recreate them:

**Create `/backend/.env`:**
```env
MONGO_URL="mongodb://mongodb:27017"
DB_NAME="kallie_dashboard"
CORS_ORIGINS="*"
TWITCH_CLIENT_ID=1co0sg3nygo0o55ftyqmqqsfp83e77
TWITCH_CLIENT_SECRET=t9oeooy5aeuyr8bfw0st3ab4mf8co5
TWITCH_CHANNEL_NAME=kalliestockton
TWITCH_REDIRECT_URI=http://localhost:3000/api/auth/callback
FRONTEND_URL=http://localhost:3000
OBS_WEBSOCKET_HOST=host.docker.internal
OBS_WEBSOCKET_PORT=4455
OBS_WEBSOCKET_PASSWORD=GdIgynjOgY2WQaMr
SECRET_KEY=kallie-local-dashboard-secret-key-12345
DATABASE_URL=sqlite:///./oauth_tokens.db
```

**Create `/frontend/.env`:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## Next Steps

Once you have all the files downloaded:

1. ✅ Verify folder structure
2. ✅ Create `.env` files if missing
3. ✅ Install Docker Desktop
4. ✅ Follow LOCAL_SETUP_GUIDE.md
5. ✅ Run `docker-compose up`

---

## Quick Checklist

Before running Docker:

- [ ] All files downloaded
- [ ] Folder structure correct
- [ ] `.env` files created in backend/ and frontend/
- [ ] Docker Desktop installed
- [ ] OBS running with WebSocket enabled
- [ ] Twitch redirect URL updated

**Ready to go!** Open terminal in the `kallie-dashboard` folder and run:
```bash
docker-compose up
```
