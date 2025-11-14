# How to Create .env Files - Step-by-Step Guide

You need to create TWO `.env` files:
1. One in the `backend/` folder
2. One in the `frontend/` folder

---

## On Windows

### Creating backend/.env

**Step 1: Open Notepad**
1. Press Windows key
2. Type "Notepad"
3. Press Enter

**Step 2: Copy This Content**
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

**Step 3: Paste Into Notepad**
- Click in Notepad
- Press Ctrl+V to paste

**Step 4: Save As .env File**
1. Click **File** → **Save As...**
2. Navigate to your `kallie-dashboard\backend\` folder
3. **File name:** Type exactly: `.env` (including the dot!)
4. **Save as type:** Select **"All Files (*.*)"** (IMPORTANT!)
5. **Encoding:** Select **"UTF-8"**
6. Click **"Save"**

**⚠️ Common Mistake:** If you don't select "All Files", Windows will save it as `.env.txt` which won't work!

**Verify It Worked:**
1. Open File Explorer
2. Go to `kallie-dashboard\backend\`
3. Click **View** menu → Check ✅ **"File name extensions"**
4. You should see a file named `.env` (NOT `.env.txt`)

---

### Creating frontend/.env

**Repeat the same process:**

**Step 1: Open New Notepad**

**Step 2: Copy This Content**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

**Step 3: Paste Into Notepad**

**Step 4: Save As .env File**
1. File → Save As
2. Navigate to `kallie-dashboard\frontend\` folder
3. File name: `.env`
4. Save as type: **"All Files (*.*)"**
5. Encoding: UTF-8
6. Save

---

## On Mac

### Creating backend/.env

**Step 1: Open TextEdit**
1. Press `Cmd + Space`
2. Type "TextEdit"
3. Press Enter

**Step 2: Make Plain Text**
- Click **Format** menu
- Select **"Make Plain Text"** (or press `Cmd + Shift + T`)

**Step 3: Copy This Content**
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

**Step 4: Paste Into TextEdit**
- Press `Cmd + V`

**Step 5: Save As .env File**
1. Press `Cmd + S` or File → Save
2. Navigate to `kallie-dashboard/backend/` folder
3. **Save As:** Type `.env` (including the dot!)
4. **Uncheck** "If no extension is provided, use .txt"
5. **Format:** Plain Text
6. Click **"Save"**
7. If warning appears, click **"Use ."** (to keep the dot at the beginning)

**Verify with Terminal:**
```bash
cd ~/kallie-dashboard/backend
ls -la
```
You should see `.env` in the list.

---

### Creating frontend/.env

**Repeat for frontend:**

1. Open new TextEdit → Make Plain Text
2. Paste this:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```
3. Save to `kallie-dashboard/frontend/.env`

---

## Using Command Line (Windows/Mac/Linux)

If you're comfortable with terminal/command prompt:

### Windows (PowerShell)

```powershell
# Create backend .env
cd C:\kallie-dashboard\backend
@"
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
"@ | Out-File -FilePath .env -Encoding utf8

# Create frontend .env
cd ..\frontend
@"
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
"@ | Out-File -FilePath .env -Encoding utf8
```

### Mac/Linux (Terminal)

```bash
# Create backend .env
cd ~/kallie-dashboard/backend
cat > .env << 'EOF'
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
EOF

# Create frontend .env
cd ../frontend
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
EOF
```

---

## Verification

After creating both files, verify they exist:

### Windows:
```powershell
dir backend\.env
dir frontend\.env
```

### Mac/Linux:
```bash
ls -la backend/.env
ls -la frontend/.env
```

You should see both files listed.

---

## Common Issues

### Windows: "File name extensions are hidden"

**Fix:**
1. Open File Explorer
2. Click **View** tab
3. Check ✅ **"File name extensions"**
4. Now you can see if file is `.env` or `.env.txt`
5. If it's `.env.txt`, rename it to just `.env`

### Windows: "You must type a file name"

**Fix:**
- Make sure "All Files (*.*)" is selected in "Save as type"
- Then you can save with just `.env` as the name

### Mac: Can't see .env files

**Fix:**
Hidden files (starting with dot) are hidden by default.

**In Finder:**
- Press `Cmd + Shift + .` (dot) to show hidden files

**In Terminal:**
```bash
ls -la
```
The `-a` flag shows all files including hidden ones.

### File has wrong content

**Fix:**
- Delete the file
- Create it again
- Make sure you copy ALL the content (no missing lines)
- Make sure no extra spaces at the beginning

---

## Your Final Folder Structure

After creating both `.env` files:

```
kallie-dashboard/
├── backend/
│   ├── .env          ← YOU CREATED THIS
│   ├── server.py
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── .env          ← YOU CREATED THIS
│   ├── package.json
│   ├── src/
│   └── ...
└── docker-compose.yml
```

---

## What These Files Do

### backend/.env
Contains sensitive configuration:
- Twitch API credentials
- OBS password
- Database settings
- Security keys

### frontend/.env
Contains frontend configuration:
- Backend API URL
- Feature flags

**⚠️ Never commit .env files to GitHub!** They contain secrets and passwords.

---

## Next Steps

Once both `.env` files are created:

1. ✅ `.env` files created
2. → Install Docker Desktop
3. → Open terminal in `kallie-dashboard` folder
4. → Run: `docker-compose up`
5. → Access: http://localhost:3000

---

## Still Having Trouble?

If you can't create the files, you can:
1. Copy the `.env.example` file
2. Rename it to `.env`
3. Edit the values inside

Or ask me for help with specific errors!
