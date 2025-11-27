# Kallie's Dashboard - Twitch & OBS Setup Guide

## Part 1: Twitch Developer Credentials (DETAILED)

### Why do you need this?
Twitch requires developer credentials to access their API. This allows your dashboard to read chat, get viewer counts, and access stream information. It's completely safe and used by all streaming tools like Streamlabs, StreamElements, etc.

### Step 1: Log into Twitch Developer Console

1. Open your web browser
2. Go to **https://dev.twitch.tv/console/apps**
3. You'll need to log in with your Twitch account (the same one you stream with)
4. If prompted, you may need to enable Two-Factor Authentication (2FA) on your Twitch account first
   - Go to Twitch.tv → Settings → Security → Enable 2FA

### Step 2: Register Your Application

1. Once logged in, you'll see the "Applications" page
2. Look for a button that says **"Register Your Application"** (purple/pink button, top right area)
3. Click it

### Step 3: Fill Out the Application Form

You'll see a form with these fields:

**Name:**
- Enter: `Kallie Stream Dashboard` (or any name - this is just for you to identify it)
- This name is private - only you can see it

**OAuth Redirect URLs:**
- Click **"Add"** or the **"+"** button
- Enter EXACTLY: `http://localhost:3000`
- Click **"Add"** again
- Enter EXACTLY: `https://stream-dashboard-6.preview.emergentagent.com/auth/callback`
- These URLs tell Twitch where to send authentication data

**Category:**
- From the dropdown menu, select: **"Broadcasting Suite"**
- This categorizes your app type

**Client Type:**
- Select: **"Confidential"** (this should be default)

**Checkbox at bottom:**
- Check the box: "I have read and agree to the Twitch Developer Services Agreement"

4. Click the purple **"Create"** button at the bottom

### Step 4: Get Your Client ID

1. After clicking "Create", you'll be taken back to the Applications page
2. You'll now see your new app listed: "Kallie Stream Dashboard"
3. Click the **"Manage"** button next to your app name
4. You'll see a page with your app details

**Copy Your Client ID:**
- Look for the field labeled **"Client ID"**
- It will be a long string like: `abc123def456ghi789jkl012mno345pq`
- Click the **"Copy"** button or manually select and copy it
- Paste it somewhere safe (like Notepad) for now

### Step 5: Generate Your Client Secret

**IMPORTANT:** The Client Secret is like a password - you'll only see it ONCE!

1. On the same "Manage Application" page, scroll down slightly
2. Look for a section labeled **"Client Secret"**
3. Click the button that says **"New Secret"** or **"Generate New Secret"**
4. A popup will appear with your Client Secret
5. **IMMEDIATELY COPY THIS SECRET** - it looks like: `xyz789abc123def456ghi789jkl012`
6. Paste it into your Notepad with your Client ID
7. Click **"OK"** or close the popup

**WARNING:** Once you close this popup, you can NEVER see this secret again! If you lose it, you'll need to generate a new one (which is fine, but requires updating the dashboard).

### Step 6: Get Your Channel Name

This is easy - it's just your Twitch username!

1. Go to **https://twitch.tv**
2. Click on your profile picture (top right)
3. Your username is displayed there (e.g., "KallieStreams")
4. Copy it exactly as shown (case doesn't matter, but keep it consistent)

### Step 7: Format Everything for Me

Now organize everything like this:

```
TWITCH_CLIENT_ID=abc123def456ghi789jkl012mno345pq
TWITCH_CLIENT_SECRET=xyz789abc123def456ghi789jkl012
TWITCH_CHANNEL_NAME=YourTwitchUsername
```

Replace the example values with YOUR actual values.

### Troubleshooting

**"I don't see the Register Your Application button"**
- Make sure you're logged into Twitch
- Enable 2FA on your Twitch account (required for developer access)
- Try a different browser or clear your cache

**"I closed the popup and didn't copy my Client Secret!"**
- No problem! Go back to "Manage" your application
- Click "New Secret" again to generate a fresh one
- The old secret will be invalidated automatically

**"What if someone gets my credentials?"**
- If leaked, someone could access your public stream data (which is already public anyway)
- They CANNOT access your account, change settings, or stream as you
- You can always delete the app and create a new one from the developer console

**"Do I need to pay for this?"**
- No! Twitch Developer access is 100% free

### What Happens Next?

Once you share these credentials with me, I will:
1. Securely store them in your backend `.env` file
2. Install Twitch API libraries (`twitchAPI` for Python)
3. Connect to Twitch's real-time chat (IRC/EventSub)
4. Pull live viewer counts, follower notifications, and stream info
5. Enable clip creation and stream marker features

Your credentials stay on YOUR server - they never leave your environment!

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
