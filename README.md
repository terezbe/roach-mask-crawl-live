# Cockroach Avoidance Simulation

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live NDI/RTMP stream sent from TouchDesigner. Built for local development and deployment.

## Project info

**URL**: https://lovable.dev/projects/09bcd27f-1405-4853-9033-dabd249071d8

## 🚀 Quick Local Setup

### Prerequisites

1. **Node.js & npm** - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
2. **TouchDesigner** - For NDI/RTMP stream generation
3. **NDI Tools** (optional) - For NDI stream monitoring and testing

### Step-by-Step Local Setup

#### 1. Clone and Install Frontend

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd cockroach-avoidance-simulation

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

#### 2. Set Up Bridge Server (Required for NDI/RTMP Streams)

The project includes a Node.js bridge server that converts NDI/RTMP streams to WebSocket for browser consumption.

```sh
# Install bridge server dependencies
npm install ws canvas nodemon

# Or use the provided package file
cp package-bridge.json package.json
npm install

# Start the bridge server
node ndi-bridge-server.js

# Or for development with auto-restart
npx nodemon ndi-bridge-server.js
```

The bridge server will run on `ws://localhost:8081/ndi`

#### 3. Configure TouchDesigner

**🔧 IMPORTANT WebSocket Configuration:**

Based on your TouchDesigner setup, use these **EXACT** settings:

**WebSocket DAT Configuration:**
- **Active**: `On`
- **Network Address**: `localhost` (NOT `localhost/ndi`)
- **Network Port**: `8081` (Changed from 8080 to avoid conflict with frontend)
- **Connection Timeout**: `5000`

**NDI Out TOP Configuration:**
- **Active**: `On`
- **Source Name**: `TouchDesigner` (or any name you prefer)
- **FPS**: `60`
- **Output Pixel Format**: `8-bit`

**Option A: Direct WebSocket (Recommended - Simplest)**

Add this script to a WebSocket DAT in TouchDesigner:

```python
# TouchDesigner WebSocket DAT Callbacks Script
# Put this in the "Callbacks" parameter of a WebSocket DAT

def onConnect(dat):
    print("WebSocket connected to simulation")
    # Send initial connection message
    dat.sendText('{"type": "connected", "source": "TouchDesigner"}')

def onDisconnect(dat):
    print("WebSocket disconnected from simulation")

def onReceiveText(dat, text):
    # Handle messages from the simulation
    import json
    try:
        msg = json.loads(text)
        if msg.get('type') == 'request_frame':
            # Send current frame data
            sendCurrentFrame(dat)
    except Exception as e:
        print(f"Error parsing message: {e}")

def sendCurrentFrame(dat):
    # Get your mask TOP (replace 'mask_top' with your TOP name)
    maskTop = op('mask_top')  # CHANGE THIS to your mask TOP name
    
    if maskTop and maskTop.width > 0:
        try:
            # Convert TOP to base64 image
            import base64
            import tempfile
            import os
            
            # Save TOP to temp file and convert to base64
            temp_path = tempfile.mktemp(suffix='.jpg')
            maskTop.save(temp_path, quality=0.8)
            
            with open(temp_path, 'rb') as f:
                data = f.read()
                b64_data = base64.b64encode(data).decode('utf-8')
            
            os.unlink(temp_path)
            
            frameData = {
                'type': 'frame',
                'timestamp': absTime.frame,
                'width': maskTop.width,
                'height': maskTop.height,
                'imageData': b64_data
            }
            
            dat.sendText(json.dumps(frameData))
            
        except Exception as e:
            print(f"Error sending frame: {e}")

# Optional: Auto-send frames at regular intervals
def onPulse(dat):
    # Uncomment the line below to auto-send frames every pulse
    # sendCurrentFrame(dat)
    pass

# WebSocket DAT Parameters (set these in the TouchDesigner interface):
# - Active: On
# - Network Address: localhost
# - Network Port: 8081
# - Auto Reconnect: On
```

**⚠️ Common TouchDesigner Issues & Solutions:**

1. **"Connection timeout" errors:**
   - Make sure the simulation is running first (`npm run dev` on port 8080)
   - Make sure the bridge server is running (`node ndi-bridge-server.js` on port 8081)
   - Check that port 8081 is not blocked by firewall
   - Verify WebSocket DAT settings: Active=On, Network Address=localhost, Port=8081

2. **"Frame data not sending" errors:**
   - Change `op('mask_top')` to your actual TOP operator name
   - Make sure your mask TOP has content (check if width > 0)
   - Verify the TOP is actively updating

3. **"WebSocket won't connect" errors:**
   - Try restarting TouchDesigner
   - Check Windows firewall settings for port 8081
   - Make sure no other applications are using port 8081

**Option B: NDI Stream (Advanced)**

1. **Add NDI Out TOP**:
   - Set NDI Name to "TouchDesigner" or "TD_Mask"
   - Connect your mask/video output to NDI Out
   - Make sure "Active" is enabled

2. **Verify NDI Stream**:
   - Use NDI Studio Monitor to verify your stream is broadcasting
   - Note the exact NDI source name

**Option C: RTMP Stream (Alternative)**

1. **Add Video Stream Out TOP**:
   - Set Protocol to "RTMP"
   - Set URL to `rtmp://localhost:1935/live/stream1`
   - Connect your mask/video output

#### 4. Configure the Simulation

1. Open the simulation at `http://localhost:8080`
2. **For Direct TouchDesigner WebSocket:**
   - Select "TouchDesigner Direct (WebSocket)" from the sources dropdown
   - Make sure TouchDesigner WebSocket URL is `ws://localhost:8081`
   - Click "Connect to Stream"

3. **For NDI/RTMP via Bridge:**
   - Make sure Bridge Server URL is `ws://localhost:8081/ndi`
   - Click "Scan for Sources"
   - Select your TouchDesigner stream from the dropdown
   - Click "Connect to Stream"

#### 5. Test the Setup

1. **Without Stream**: The simulation runs with test data
2. **With Stream**: 
   - Toggle "Show Mask Overlay" to see the incoming mask
   - Cockroaches should avoid white areas in your stream
   - Adjust "Avoidance Strength" to fine-tune behavior

## 🔧 Configuration Options

### Simulation Parameters
- **Cockroach Count**: 10-300 (default: 100)
- **Avoidance Strength**: 0.1-5.0 (default: 2.5)
- **Random Wander**: 0.0-1.0 (default: 0.3)
- **Max Speed**: 0.5-5.0 (default: 2.0)
- **Show Mask Overlay**: Toggle for debugging
- **Auto-start**: Automatically start simulation on load
- **Hide UI**: Run in full-screen mode with minimal controls

### Stream Settings
- **TouchDesigner WebSocket URL**: Direct WebSocket endpoint (default: ws://localhost:8081)
- **Bridge Server URL**: WebSocket endpoint for NDI/RTMP (default: ws://localhost:8081/ndi)
- **NDI Sources**: Auto-discovered from bridge server
- **Custom RTMP**: Add custom RTMP stream URLs
- **Connection Status**: Real-time connection monitoring

### Persistent Settings
All configuration changes are automatically saved to localStorage and restored on page reload:
- Simulation parameters
- Auto-start preference
- UI visibility settings
- Custom RTMP URLs

### Full-Screen Mode
When "Hide UI" is enabled:
- Simulation runs full-screen with white background
- Cockroaches appear black for better contrast
- Show UI toggle appears only when hovering top-right corner
- Perfect for installations or presentations

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── CockroachSimulation.tsx    # Main simulation container
│   ├── SimulationCanvas.tsx       # Canvas rendering & physics
│   ├── ConfigPanel.tsx            # Control panel UI
│   └── StreamHandler.tsx          # NDI/RTMP stream management
├── types/
│   └── simulation.ts              # TypeScript definitions
└── pages/
    └── Index.tsx                  # Main page

# Bridge Server
ndi-bridge-server.js               # WebSocket bridge for streams
package-bridge.json                # Bridge server dependencies
```

## 🎯 Troubleshooting

### Connection Issues

**"Bridge server connection timeout"**
- Ensure bridge server is running: `node ndi-bridge-server.js`
- Check if port 8081 is available: `netstat -an | findstr :8081`
- Try different port and update both bridge server and URLs
- Check Windows firewall settings

**"TouchDesigner WebSocket connection failed"**
- Verify WebSocket DAT configuration:
  - Active: On
  - Network Address: localhost (NOT localhost/ndi)
  - Network Port: 8081 (number only, not in URL)
- Restart TouchDesigner after changing settings
- Check if simulation is running first
- Try connecting to `ws://localhost:8081` in browser dev tools

**"No frame data received"**
- Update the script: change `op('mask_top')` to your actual TOP name
- Check if your TOP has content: width and height > 0
- Verify TOP is actively updating (check in TouchDesigner)
- Add print statements in the TouchDesigner script for debugging

### Performance Issues
- Reduce cockroach count (< 150)
- Lower browser zoom level
- Close other browser tabs
- Enable hardware acceleration

### Avoidance Not Working
- Toggle "Show Mask Overlay" to verify mask data
- Increase "Avoidance Strength"
- Check mask has sufficient white/black contrast
- Verify stream resolution and format

### Debug Mode
- Enable "Show Mask Overlay" to visualize incoming stream
- Check browser console for WebSocket connection status
- Use bridge server console output for stream debugging
- Test with mock data first (bridge server provides test patterns)

### Common Port Conflicts
If port 8081 is in use:

1. **Change Bridge Server Port:**
   ```javascript
   // In ndi-bridge-server.js, change:
   const PORT = process.env.PORT || 8082; // Use 8082 instead
   ```

2. **Update TouchDesigner:**
   - WebSocket DAT Network Port: 8082

3. **Update Simulation URLs:**
   - TouchDesigner WebSocket URL: `ws://localhost:8082`
   - Bridge Server URL: `ws://localhost:8082/ndi`

## 📱 Deployment Options

### Local Network Access
```sh
# Allow network access
npm run dev -- --host 0.0.0.0

# Bridge server for network (modify ndi-bridge-server.js)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on all interfaces:${PORT}`);
});

# Access from other devices
http://YOUR_IP_ADDRESS:8080
```

### Production Build
```sh
# Build for production
npm run build

# Serve production build
npm run preview

# Deploy bridge server
node ndi-bridge-server.js
```

### Auto-start Configuration
- Enable "Auto-start" to begin simulation automatically
- Enable "Hide UI" for installation/kiosk mode
- Settings persist across browser sessions
- Use URL parameters for quick setup: `?autostart=true&hideui=true`

## 📞 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [TouchDesigner NDI Guide](https://docs.derivative.ca/NDI_Out_TOP)
- [WebSocket DAT Documentation](https://docs.derivative.ca/WebSocket_DAT)

## 📄 License

This project is open source and available under the MIT License.
