# Docker Desktop Installation Guide

Complete step-by-step instructions for installing Docker Desktop on Windows, Mac, or Linux.

---

## Windows Installation

### System Requirements

**Minimum:**
- Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- OR Windows 11 64-bit
- 4GB RAM minimum (8GB recommended)
- BIOS-level hardware virtualization support enabled

### Step 1: Download Docker Desktop

1. Open your web browser
2. Go to: **https://www.docker.com/products/docker-desktop/**
3. Click the big blue **"Download for Windows"** button
4. The file `Docker Desktop Installer.exe` will download (about 500MB)
5. Wait for download to complete

### Step 2: Enable WSL 2 (Windows Subsystem for Linux)

Docker needs WSL 2 to run on Windows.

**Open PowerShell as Administrator:**
1. Click Windows Start button
2. Type "PowerShell"
3. Right-click "Windows PowerShell"
4. Click "Run as administrator"
5. Click "Yes" when asked for permission

**Run these commands one at a time:**

```powershell
# Enable WSL
wsl --install

# Set WSL 2 as default
wsl --set-default-version 2
```

**Restart your computer** when prompted.

### Step 3: Install Docker Desktop

1. Find `Docker Desktop Installer.exe` in your Downloads folder
2. Double-click to run it
3. **Installation screen appears:**
   - ✅ Check "Use WSL 2 instead of Hyper-V" (recommended)
   - ✅ Check "Add shortcut to desktop"
4. Click **"Ok"** to start installation
5. Installation takes 5-10 minutes
6. When done, click **"Close and restart"**

### Step 4: First Launch

1. **After restart**, Docker Desktop should auto-start
2. If not, find Docker Desktop icon on desktop or Start menu
3. Double-click to open
4. **Accept the Service Agreement**
5. **Skip the tutorial** (or complete it if you want)

### Step 5: Verify Installation

1. Open **PowerShell** or **Command Prompt**
2. Type this command:
```bash
docker --version
```

**You should see:**
```
Docker version 24.0.x, build xxxxxxx
```

3. Test Docker is working:
```bash
docker run hello-world
```

**You should see:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### ✅ Success! Docker is installed and running!

---

## Mac Installation

### System Requirements

**For Mac with Apple Silicon (M1/M2/M3):**
- macOS Big Sur 11 or newer
- 4GB RAM minimum

**For Mac with Intel chip:**
- macOS Monterey 12 or newer
- 4GB RAM minimum

### Step 1: Download Docker Desktop

1. Open Safari or any web browser
2. Go to: **https://www.docker.com/products/docker-desktop/**
3. Click **"Download for Mac"**
4. Choose your chip type:
   - **"Mac with Apple Silicon"** (M1/M2/M3)
   - **"Mac with Intel chip"**
   
   **Not sure which Mac you have?**
   - Click Apple menu () → "About This Mac"
   - Look at "Chip" or "Processor"
   - If it says "Apple M1/M2/M3" → Apple Silicon
   - If it says "Intel" → Intel chip

5. File `Docker.dmg` will download (about 500MB)
6. Wait for download to complete

### Step 2: Install Docker Desktop

1. Find `Docker.dmg` in your Downloads folder
2. Double-click to open it
3. A window appears with:
   - Docker.app icon
   - Applications folder icon
4. **Drag Docker.app to Applications folder**
5. Wait for copy to complete (1-2 minutes)

### Step 3: First Launch

1. Open **Applications** folder
2. Find **Docker** app
3. Double-click to open

**Security Warning appears:**
- "Docker is an app downloaded from the internet"
- Click **"Open"**

4. Enter your Mac password when prompted
5. **Service Agreement** appears → Click **"Accept"**
6. **Recommended settings** screen:
   - Leave defaults checked
   - Click **"Finish"**

### Step 4: Verify Installation

1. Open **Terminal**:
   - Press `Cmd + Space`
   - Type "Terminal"
   - Press Enter

2. Check Docker version:
```bash
docker --version
```

**You should see:**
```
Docker version 24.0.x, build xxxxxxx
```

3. Test Docker is working:
```bash
docker run hello-world
```

**You should see:**
```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### ✅ Success! Docker is installed and running!

---

## Linux Installation (Ubuntu/Debian)

### System Requirements

- Ubuntu 20.04 LTS or newer
- OR Debian 10 or newer
- 64-bit kernel and CPU
- 4GB RAM minimum

### Step 1: Uninstall Old Versions

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

### Step 2: Set Up Docker Repository

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### Step 3: Install Docker Engine

```bash
# Update package index
sudo apt-get update

# Install Docker Engine, containerd, and Docker Compose
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### Step 4: Start Docker Service

```bash
# Start Docker
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker
```

### Step 5: Add Your User to Docker Group

This lets you run Docker without `sudo`:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in for this to take effect
# Or run:
newgrp docker
```

### Step 6: Verify Installation

```bash
# Check Docker version
docker --version

# Test Docker
docker run hello-world
```

### ✅ Success! Docker is installed and running!

---

## Common Installation Issues

### Windows Issues

#### Issue: "WSL 2 installation is incomplete"

**Fix:**
1. Open PowerShell as Administrator
2. Run: `wsl --update`
3. Restart computer
4. Try Docker again

#### Issue: "Hardware assisted virtualization not enabled"

**Fix:**
1. Restart computer
2. Enter BIOS (press F2, F10, or Del during startup)
3. Find "Virtualization Technology" or "Intel VT-x" or "AMD-V"
4. Enable it
5. Save and exit BIOS
6. Install Docker again

#### Issue: Docker Desktop won't start

**Fix:**
1. Open Task Manager (Ctrl+Shift+Esc)
2. End all Docker processes
3. Restart Docker Desktop

### Mac Issues

#### Issue: "Cannot be opened because the developer cannot be verified"

**Fix:**
1. Right-click Docker app
2. Select "Open"
3. Click "Open" again in warning
4. Enter password

#### Issue: Docker Desktop stuck on "Starting..."

**Fix:**
1. Quit Docker Desktop completely
2. Open Terminal
3. Run: `rm ~/Library/Group\ Containers/group.com.docker/settings.json`
4. Restart Docker Desktop

### Linux Issues

#### Issue: "Permission denied" when running Docker

**Fix:**
```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in
# Or run:
newgrp docker
```

#### Issue: "Cannot connect to Docker daemon"

**Fix:**
```bash
# Start Docker service
sudo systemctl start docker

# Check status
sudo systemctl status docker
```

---

## After Installation Checklist

Once Docker is installed:

- [ ] Docker Desktop icon appears in system tray/menu bar
- [ ] `docker --version` command works
- [ ] `docker run hello-world` works
- [ ] No error messages when starting Docker

### Next Steps After Docker Installation:

1. ✅ Docker installed and verified
2. → Download dashboard code
3. → Create `.env` files
4. → Run `docker-compose up`
5. → Access dashboard at http://localhost:3000

---

## Docker Desktop Interface Overview

### What You'll See:

**System Tray Icon (Windows) / Menu Bar (Mac):**
- Docker whale icon
- Shows if Docker is running (normal icon) or starting (animated)
- Right-click for options

**Docker Dashboard:**
- **Containers/Apps:** Running services
- **Images:** Downloaded Docker images
- **Volumes:** Data storage
- **Settings:** Configuration options

### Useful Commands:

```bash
# Check Docker status
docker info

# List running containers
docker ps

# List all containers
docker ps -a

# List images
docker images

# Stop all containers
docker stop $(docker ps -aq)

# Remove all stopped containers
docker rm $(docker ps -aq)
```

---

## Resource Settings (Optional)

### Adjust Docker Resources:

**Windows/Mac:**
1. Open Docker Desktop
2. Click Settings (gear icon)
3. Go to "Resources"
4. Adjust:
   - **CPUs:** 2-4 cores recommended
   - **Memory:** 4-8 GB recommended
   - **Disk:** 20GB+ recommended
5. Click "Apply & Restart"

---

## Getting Help

### If Installation Fails:

1. **Check Docker documentation:**
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Mac: https://docs.docker.com/desktop/install/mac-install/
   - Linux: https://docs.docker.com/engine/install/ubuntu/

2. **Docker Community Forums:**
   - https://forums.docker.com/

3. **Common Solutions:**
   - Restart computer
   - Update Windows/macOS
   - Disable antivirus temporarily during install
   - Run installer as Administrator (Windows)

---

## You're Ready!

Once you see this when running `docker --version`:
```
Docker version 24.0.x, build xxxxxxx
```

**You're ready to run Kallie's Dashboard locally!**

Next: Follow the `LOCAL_SETUP_GUIDE.md` to start the dashboard with full OBS control.
