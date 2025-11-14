# How to Download Your Dashboard ZIP File

Your complete dashboard code has been packaged into: **kallie-dashboard.zip** (285KB)

Location: `/app/kallie-dashboard.zip`

---

## Download Methods

### Method 1: Emergent File Browser (Easiest)

1. In your Emergent workspace, navigate to the **Files** tab or file browser
2. Go to `/app` folder
3. Find **kallie-dashboard.zip**
4. Right-click (or click the action menu) → **"Download"**
5. Save to your computer (Downloads folder)

---

### Method 2: Direct Download Link

If Emergent provides a direct download feature:

1. Look for a "Download" or "Export" button in the Emergent interface
2. Select `/app/kallie-dashboard.zip`
3. Click download

---

### Method 3: Command Line (if available)

If you have terminal/SSH access to download from Emergent:

```bash
# The file is already created at:
/app/kallie-dashboard.zip

# Size: 285KB
```

---

## What's Inside the ZIP

```
kallie-dashboard.zip
│
├── backend/                          # Backend Python code
│   ├── server.py                    # Main FastAPI application
│   ├── twitch_service.py           # Twitch API integration
│   ├── obs_service.py              # OBS WebSocket integration
│   ├── irc_chat_service.py         # IRC chat client
│   ├── oauth_service.py            # OAuth authentication
│   ├── oauth_database.py           # Token storage
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Docker configuration
│
├── frontend/                         # Frontend React code
│   ├── src/
│   │   ├── App.js                  # Main app component
│   │   ├── App.css                 # Y2K styling
│   │   ├── pages/Dashboard.jsx     # Main dashboard
│   │   ├── components/             # UI components
│   │   └── context/AuthContext.jsx # Auth management
│   ├── package.json                # Node dependencies
│   ├── tailwind.config.js          # Tailwind config
│   └── Dockerfile                  # Docker configuration
│
├── docker-compose.yml                # Docker orchestration
├── .env.example                      # Environment template
│
└── Documentation/
    ├── LOCAL_SETUP_GUIDE.md         # How to run locally
    ├── DOWNLOAD_INSTRUCTIONS.md     # Download guide
    ├── DOCKER_INSTALLATION_GUIDE.md # Docker install help
    ├── OAUTH_SETUP_INSTRUCTIONS.md  # OAuth setup
    └── More guides...
```

---

## After Downloading

### Step 1: Extract the ZIP

**Windows:**
1. Find `kallie-dashboard.zip` in Downloads
2. Right-click → **"Extract All..."**
3. Choose location: `C:\kallie-dashboard`
4. Click **"Extract"**

**Mac:**
1. Find `kallie-dashboard.zip` in Downloads
2. Double-click to extract
3. Move folder to desired location: `~/kallie-dashboard`

**Linux:**
```bash
unzip kallie-dashboard.zip -d ~/kallie-dashboard
```

### Step 2: Verify Contents

Open the extracted folder and check you have:
- ✅ `backend/` folder
- ✅ `frontend/` folder
- ✅ `docker-compose.yml` file
- ✅ Documentation `.md` files

### Step 3: Set Up Environment

**Create backend/.env:**
```bash
cd kallie-dashboard/backend
```

Create a file named `.env` with:
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

**Create frontend/.env:**
```bash
cd ../frontend
```

Create a file named `.env` with:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## Next Steps

1. ✅ Download and extract ZIP
2. ✅ Create `.env` files
3. → Install Docker Desktop (see `DOCKER_INSTALLATION_GUIDE.md`)
4. → Update Twitch redirect URI (see `OAUTH_SETUP_INSTRUCTIONS.md`)
5. → Run dashboard (see `LOCAL_SETUP_GUIDE.md`)

---

## Quick Start After Setup

Once you have Docker installed and `.env` files created:

```bash
# Open terminal in kallie-dashboard folder
cd kallie-dashboard

# Start everything
docker-compose up

# Access dashboard
# Open browser: http://localhost:3000
```

---

## File Sizes

- **ZIP file**: 285KB (compressed)
- **Extracted**: ~5MB (without node_modules)
- **With dependencies**: ~500MB (after docker-compose downloads everything)

---

## What's NOT Included

For security, these are NOT in the ZIP:
- `node_modules/` (will be installed by Docker)
- `__pycache__/` (Python cache, regenerated)
- `.env` files with secrets (you create these)
- `oauth_tokens.db` (created when you login)
- Log files

---

## Troubleshooting Download

### Can't Find the ZIP?

**Check:**
1. Emergent file browser at `/app/kallie-dashboard.zip`
2. Your Downloads folder
3. Browser's download history

### ZIP is Corrupted?

**Solution:**
Re-create the ZIP by running this in Emergent terminal:
```bash
cd /app
rm kallie-dashboard.zip
zip -r kallie-dashboard.zip backend/ frontend/ docker-compose.yml .env.example *.md -x "*/node_modules/*" -x "*/__pycache__/*"
```

### Need to Re-download?

The ZIP file will stay at `/app/kallie-dashboard.zip` until you delete it. You can download it multiple times.

---

## Support

If you can't download the ZIP:
1. Check Emergent's documentation for file downloads
2. Try different browser
3. Ask Emergent support for download help
4. Alternative: Use git/GitHub to clone instead

---

**Once downloaded, follow `LOCAL_SETUP_GUIDE.md` to run the dashboard with full OBS control!**
