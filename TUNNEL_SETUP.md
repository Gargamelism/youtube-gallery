# SSH Tunnel Setup for YouTube Gallery Development

This guide explains how to use SSH tunneling to access your remote Docker environment as if it were running locally. This is necessary for Google OAuth which requires `localhost` redirect URIs.

## Why SSH Tunneling?

- ✅ No public internet exposure (secure)
- ✅ Works with Google OAuth localhost restrictions
- ✅ Encrypted traffic via SSH
- ✅ Simple to set up and use

## Prerequisites

1. SSH access to your remote server (10.0.0.11)
2. SSH key-based authentication configured (password-less login)
3. Python 3.6+ on your local machine

## Initial Setup

### 1. Configure SSH Key (One-time)

If you haven't set up SSH key authentication:

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519

# Copy key to remote server
ssh-copy-id your_username@10.0.0.11

# Test connection (should not ask for password)
ssh your_username@10.0.0.11
```

### 2. Configure Tunnel Settings

The tunnel script is already configured with default values. You can:

**Option A: Edit the script directly** (lines 24-27 in [tunnel.py](tunnel.py)):
```python
REMOTE_USER = os.getenv("TUNNEL_USER", "your_username")
REMOTE_HOST = os.getenv("TUNNEL_HOST", "10.0.0.11")
FRONTEND_PORT = int(os.getenv("TUNNEL_FRONTEND_PORT", "3000"))
BACKEND_PORT = int(os.getenv("TUNNEL_BACKEND_PORT", "8000"))
```

**Option B: Use environment variables** (temporary):
```bash
export TUNNEL_USER=your_username
python tunnel.py start
```

## Usage

### Start the Tunnel

```bash
python tunnel.py start
```

You should see:
```
✓ SSH tunnel started successfully!

You can now access:
  Frontend: http://localhost:3000
  Backend:  http://localhost:8000
```

### Check Tunnel Status

```bash
python tunnel.py status
```

### Stop the Tunnel

```bash
python tunnel.py stop
```

### Restart the Tunnel

```bash
python tunnel.py restart
```

## After Starting the Tunnel

1. **Access your application:**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:8000](http://localhost:8000)

2. **Configure Google OAuth Console:**
   - Add this redirect URI: `http://localhost:8000/api/auth/youtube/callback`

## Auto-start on Login (Optional)

### macOS - LaunchAgent

Create a LaunchAgent to start the tunnel automatically on login:

```bash
# Create the plist file
cat > ~/Library/LaunchAgents/com.youtubegallery.tunnel.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.youtubegallery.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Volumes/data_2/dev/youtube-gallery/tunnel.py</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/youtube-gallery-tunnel.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/youtube-gallery-tunnel.error.log</string>
</dict>
</plist>
EOF

# Load the LaunchAgent
launchctl load ~/Library/LaunchAgents/com.youtubegallery.tunnel.plist

# To unload (disable auto-start):
# launchctl unload ~/Library/LaunchAgents/com.youtubegallery.tunnel.plist
```

**Note:** Update the path `/Volumes/data_2/dev/youtube-gallery/tunnel.py` if your project is in a different location.

### Alternative: Shell Alias

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
alias tunnel-start="python /Volumes/data_2/dev/youtube-gallery/tunnel.py start"
alias tunnel-stop="python /Volumes/data_2/dev/youtube-gallery/tunnel.py stop"
alias tunnel-status="python /Volumes/data_2/dev/youtube-gallery/tunnel.py status"
```

Then just run:
```bash
tunnel-start
tunnel-status
tunnel-stop
```

## Troubleshooting

### "SSH connection failed"
- Ensure you can SSH to the remote server: `ssh your_username@10.0.0.11`
- Check that SSH key authentication is working (no password prompt)

### "Port is already in use"
- Another application is using port 3000 or 8000
- Stop the conflicting application or change the port in the script
- Check what's using the port: `lsof -i :3000` or `lsof -i :8000`

### "Tunnel process started but not found"
- The SSH tunnel failed to establish
- Check SSH logs: `tail -f /var/log/system.log | grep ssh`
- Try running manually: `ssh -L 3000:localhost:3000 -L 8000:localhost:8000 -N your_username@10.0.0.11`

### Tunnel disconnects frequently
- The script includes keep-alive settings (60 second intervals)
- Check your network stability
- Consider adding to `~/.ssh/config`:
  ```
  Host 10.0.0.11
      ServerAliveInterval 60
      ServerAliveCountMax 3
      TCPKeepAlive yes
  ```

## Development Workflow

1. **Start your day:**
   ```bash
   python tunnel.py start
   ```

2. **Start Docker services on remote server:**
   ```bash
   ssh your_username@10.0.0.11
   cd /path/to/youtube-gallery
   docker-compose up
   ```

3. **Access locally:**
   - Open browser to http://localhost:3000
   - All requests go through the encrypted SSH tunnel

4. **End of day:**
   ```bash
   python tunnel.py stop
   ```

## Security Notes

- ✅ Traffic is encrypted via SSH
- ✅ No public exposure to the internet
- ✅ Only accessible from your local machine
- ✅ SSH key authentication (more secure than passwords)
- ⚠️ Anyone with access to your local machine can access the tunneled services

## Next Steps

After setting up the tunnel:

1. **Configure Google OAuth Console**
   - Add redirect URI: `http://localhost:8000/api/auth/youtube/callback`

2. **Update your frontend environment** (if needed)
   - The frontend should already use the correct backend URL

3. **Test the OAuth flow**
   - Navigate to your app at http://localhost:3000
   - Try authenticating with YouTube
   - The OAuth callback should work seamlessly

## Support

For issues or questions:
- Check the troubleshooting section above
- Review SSH connection with `ssh -v your_username@10.0.0.11`
- Check tunnel status with `python tunnel.py status`