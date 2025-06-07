
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

#### 2. Set Up Bridge Server (Required for Live Streams)

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

The bridge server will run on `ws://localhost:8080/ndi`

#### 3. Configure TouchDesigner

**Option A: NDI Stream (Recommended)**

1. **Add NDI Out TOP**:
   - Set NDI Name to "TouchDesigner" or "TD_Mask"
   - Connect your mask/video output to NDI Out
   - Make sure "Active" is enabled

2. **Verify NDI Stream**:
   - Use NDI Studio Monitor to verify your stream is broadcasting
   - Note the exact NDI source name

**Option B: RTMP Stream (Alternative)**

1. **Add Video Stream Out TOP**:
   - Set Protocol to "RTMP"
   - Set URL to `rtmp://localhost:1935/live/stream1`
   - Set Stream Key if needed
   - Connect your mask/video output

2. **Install RTMP Server** (if you don't have one):
   ```sh
   # Using nginx-rtmp (recommended)
   # Or use OBS Studio with RTMP output
   ```

**Option C: WebSocket Direct (Simplest)**

Add this script to a WebSocket DAT in TouchDesigner:

```python
# TouchDesigner WebSocket DAT Callbacks Script
# Put this in the "Callbacks" parameter of a WebSocket DAT

def onConnect(dat):
    print("WebSocket connected to simulation")

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
    except:
        pass

def sendCurrentFrame(dat):
    # Get your mask TOP (replace 'null1' with your TOP name)
    maskTop = op('null1')  # Your mask/video source TOP
    
    if maskTop and maskTop.width > 0:
        # Convert TOP to base64 image
        import base64
        
        # Get pixel data (this is a simplified example)
        # You'll need to implement proper TOP to image conversion
        
        frameData = {
            'type': 'frame',
            'timestamp': absTime.frame,
            'width': maskTop.width,
            'height': maskTop.height,
            'imageData': getBase64FromTOP(maskTop)  # Implement this function
        }
        
        dat.sendText(json.dumps(frameData))

def getBase64FromTOP(top):
    # Implement TOP to base64 conversion
    # This depends on your TouchDesigner version and setup
    # Example for TouchDesigner 2022+:
    
    try:
        # Save TOP to temp file and convert to base64
        import tempfile
        import os
        
        temp_path = tempfile.mktemp(suffix='.jpg')
        top.save(temp_path, quality=0.8)
        
        with open(temp_path, 'rb') as f:
            data = f.read()
            b64_data = base64.b64encode(data).decode('utf-8')
        
        os.unlink(temp_path)
        return b64_data
    except:
        return ""

# WebSocket DAT Parameters:
# - Active: On
# - Mode: Client
# - Server Address: localhost
# - Port: 8080
# - Endpoint: /ndi
# - Auto Reconnect: On
```

#### 4. Configure the Simulation

1. Open the simulation at `http://localhost:8080`
2. In the Stream Handler panel:
   - Make sure Bridge Server URL is `ws://localhost:8080/ndi`
   - Click "Scan for Sources"
   - Select your TouchDesigner stream from the dropdown
   - Or add a custom RTMP URL
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
- **Bridge Server URL**: WebSocket endpoint (default: ws://localhost:8080/ndi)
- **NDI Sources**: Auto-discovered from bridge server
- **Custom RTMP**: Add custom RTMP stream URLs
- **Connection Status**: Real-time connection monitoring

### Persistent Settings
All configuration changes are automatically saved to localStorage and restored on page reload:
- Simulation parameters
- Auto-start preference
- UI visibility settings
- Custom RTMP URLs

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

### Bridge Server Features
- **NDI Support**: Connects to NDI sources on the network
- **RTMP Support**: Receives RTMP streams and converts to WebSocket
- **Mock Data**: Provides test patterns when no real stream is available
- **Multi-client**: Supports multiple browser connections
- **CORS Enabled**: Works with local development

### Technologies Used
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Canvas API** - 2D graphics rendering
- **WebSocket** - Real-time stream communication
- **Node.js** - Bridge server runtime

## 🎯 Troubleshooting

### Common Issues

**"No sources found" or connection fails**
- Ensure bridge server is running: `node ndi-bridge-server.js`
- Check bridge server URL in UI: `ws://localhost:8080/ndi`
- Verify TouchDesigner is running and broadcasting
- Test WebSocket connection manually

**Bridge server won't start**
- Install dependencies: `npm install ws canvas`
- Check port 8080 is available
- Try a different port and update the bridge URL

**TouchDesigner not sending frames**
- Verify NDI Out TOP is active
- Check NDI source name matches
- Use NDI Studio Monitor to verify stream
- For WebSocket DAT, ensure Active = On

**Poor Performance**
- Reduce cockroach count (< 150)
- Lower browser zoom level
- Close other browser tabs
- Enable hardware acceleration

**Cockroaches not avoiding mask**
- Toggle "Show Mask Overlay" to verify mask data
- Increase "Avoidance Strength"
- Check mask has sufficient white/black contrast
- Verify stream resolution and format

### Debug Mode
- Enable "Show Mask Overlay" to visualize incoming stream
- Check browser console for WebSocket connection status
- Use bridge server console output for stream debugging
- Test with mock data first (bridge server provides test patterns)

## 📱 Deployment Options

### Local Network Access
```sh
# Allow network access
npm run dev -- --host 0.0.0.0

# Bridge server for network
# Update bridge server to bind to 0.0.0.0:8080

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

## 🔧 Advanced Configuration

### Custom Stream Sources
Add your own stream sources by modifying the bridge server:

```javascript
// In ndi-bridge-server.js, update the sources array:
const customSources = [
  { name: 'Your Custom NDI', type: 'ndi', url: 'ndi://your-source' },
  { name: 'Your RTMP Stream', type: 'rtmp', url: 'rtmp://your-server/live/stream' }
];
```

### Integration with Other Software
- **OBS Studio**: Use as RTMP source or NDI source
- **Resolume**: Output NDI stream to simulation
- **Max/MSP**: Similar WebSocket integration possible
- **Processing/openFrameworks**: Custom bridge implementations

## 📞 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [TouchDesigner NDI Guide](https://docs.derivative.ca/NDI_Out_TOP)
- [WebSocket DAT Documentation](https://docs.derivative.ca/WebSocket_DAT)

## 📄 License

This project is open source and available under the MIT License.
