# 🔐 Twitch OAuth Scopes Setup Guide

This guide will help you add the required OAuth scopes to your Twitch application so all dashboard features work correctly.

---

## 📋 Required Scopes

Your dashboard now requires these Twitch OAuth scopes:

### **Current Scopes** (already working):
- `channel:read:subscriptions` - Read subscriber information
- `clips:edit` - Create clips
- `channel:manage:broadcast` - Update stream title, category, tags
- `user:read:email` - Read user email

### **New Scopes** (just added for new features):
- `moderator:manage:chat_settings` - Toggle slow mode, follower-only, sub-only, emote-only modes
- `moderator:manage:banned_users` - Timeout and ban users
- `channel:manage:ads` - Run commercial breaks
- `channel:manage:polls` - Create polls
- `channel:manage:predictions` - Create predictions
- `moderator:manage:shoutouts` - Send shoutouts to other streamers
- `channel:manage:raids` - Start raids
- `moderator:manage:chat_messages` - Clear chat messages
- `channel:read:stream_key` - Read stream key (for advanced features)

---

## ✅ What I've Already Done

I've **automatically updated** your backend code (`/app/backend/oauth_service.py`) to request all these scopes when users log in. The next time you log in with Twitch, you'll be asked to grant these new permissions.

---

## 🚀 Steps to Enable New Features

### **Option 1: Simple Re-Login (Recommended)**

1. **Log out** from your dashboard (click the Logout button in top-right)
2. **Log back in** with Twitch
3. Twitch will show a new permission screen asking you to authorize the additional scopes
4. Click **"Authorize"**
5. ✅ Done! All features will now work

### **Option 2: If Re-Login Doesn't Work**

If Twitch doesn't show the new permission screen, you may need to revoke and re-authorize:

1. Go to your **Twitch Settings**: https://www.twitch.tv/settings/connections
2. Find your application in the list (it might be called "Kallie's Dashboard" or similar)
3. Click **"Disconnect"** or **"Revoke Access"**
4. Go back to your dashboard
5. Click **"Login with Twitch"**
6. Authorize all the requested permissions
7. ✅ Done!

---

## 🔧 For Developers: Twitch Developer Console (Optional)

You don't need to change anything in the Twitch Developer Console. The scopes are requested at login time, not configured in the app settings. However, if you want to verify your app settings:

1. Go to **Twitch Developer Console**: https://dev.twitch.tv/console/apps
2. Click on your application
3. Under **OAuth Redirect URLs**, ensure you have:
   - `https://your-domain.preview.emergentagent.com/auth/callback`
   - `http://localhost:3000/auth/callback` (for local testing)

**Note**: You don't need to configure scopes in the Developer Console - they are requested dynamically during the OAuth flow.

---

## 🧪 Testing Your Permissions

After re-logging in, test these features to confirm everything works:

### **Quick Actions (Control Page)**
- ✅ Run Ad (30s, 60s, 90s, 180s)
- ✅ Create Poll
- ✅ Create Prediction
- ✅ Shoutout streamer
- ✅ Start Raid
- ✅ Clear Chat

### **Chat Moderation (Live Chat & Chat Page)**
- ✅ Slow Mode toggle
- ✅ Follower-Only Mode
- ✅ Subscriber-Only Mode
- ✅ Emote-Only Mode
- ✅ Timeout User
- ✅ Ban User

### **Stream Presets (Stream Info Card)**
- ✅ GRWM preset
- ✅ Co-Working preset
- ✅ Music Feedback preset

---

## ❌ Troubleshooting

### **Issue**: Buttons show "Missing scope" error

**Solution**: 
1. Log out completely
2. Clear browser cache/cookies (optional)
3. Log back in
4. Make sure you click "Authorize" on ALL permissions Twitch asks for

### **Issue**: Twitch doesn't ask for new permissions

**Solution**:
1. Manually revoke your app from Twitch Settings: https://www.twitch.tv/settings/connections
2. Then log in again from your dashboard

### **Issue**: Some features work but others don't

**Solution**: Check which scope is missing in the error message (it will show in the toast notification). Follow the re-login steps above to grant all permissions.

---

## 📱 Important Notes

- **You must be streaming live** to use some features (Run Ad, Start Raid, etc.)
- **Moderator features** require you to be a moderator of your own channel (you are by default as the broadcaster)
- **Some features** (like Running Ads) have Twitch requirements (e.g., must be a Twitch Partner or Affiliate)

---

## ✅ Summary

**What you need to do:**
1. Log out from your dashboard
2. Log back in with Twitch
3. Authorize the new permissions
4. Test the new features!

That's it! 🎉

---

## 🆘 Need Help?

If you continue to have issues after following these steps, check:
- Browser console for errors (F12 → Console tab)
- Backend logs: The error messages will tell you exactly which scope is missing
- Twitch status page: https://status.twitch.tv/ (to ensure Twitch API is working)
