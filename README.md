
# Cockroach Avoidance Simulation with TouchDesigner WebRTC Integration

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live video stream sent directly from TouchDesigner using WebRTC peer-to-peer connection. Built for local development with proper WebRTC DAT integration.

## 🚀 Quick Setup

### 1. Start the Web Application

```bash
# Clone and install
git clone <YOUR_GIT_URL>
cd cockroach-avoidance-simulation
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### 2. Configure TouchDesigner WebRTC DAT Integration

**Step 1: Create WebRTC Network in TouchDesigner**

1. **Add WebRTC DAT:**
   - Drag `WebRTC DAT` from the Palette into your network
   - Name it `webrtc1` (or update the callback script accordingly)

2. **Configure WebRTC DAT Parameters:**
   ```
   Connection Page:
   - Active: On
   - Custom Bit Rate Limits: On (optional)
   - Maximum Bit Rate: 10000 kbps
   
   ICE Page:
   - STUN Server URL: stun:stun.l.google.com:19302
   - TURN Username: (leave blank for STUN-only)
   - TURN Password: (leave blank for STUN-only)
   ```

3. **Create Callback DAT:**
   - Add a new `DAT` to your network
   - Set its type to `Python`
   - Copy the callback script from `src/docs/TouchDesignerWebRTCCallback.py`
   - Paste it into the Python DAT
   - Reference this DAT in WebRTC DAT's `Callbacks` parameter

**Step 2: Setup Video Stream Out TOP**

1. **Add Video Stream Out TOP:**
   - Drag `Video Stream Out TOP` from the Palette
   - Connect your camera/video source to its input

2. **Configure Video Stream Out TOP Parameters:**
   ```
   Video Stream Out Page:
   - Active: On
   - Mode: WebRTC
   - FPS: 30
   - Video Codec: H264
   - Quality: High
   - Bitrate Mode: CBR
   - Average Bitrate: 5-10 Mb/s
   
   WebRTC Page:
   - WebRTC: Point to your WebRTC DAT (webrtc1)
   - WebRTC Connection: (will populate after connection)
   - WebRTC Video Track: (will populate after connection)
   ```

**Step 3: Network Setup Examples**

**Basic Camera Setup:**
```
[Video Device In TOP] → [Video Stream Out TOP]
         ↓
[WebRTC DAT] ← [Callback Python DAT]
```

**Processed Video Setup:**
```
[Video Device In TOP] → [HSV TOP] → [Threshold TOP] → [Video Stream Out TOP]
         ↓                                               ↓
[WebRTC DAT] ← [Callback Python DAT]
```

### 3. Start WebRTC Signaling Server

The current implementation requires a WebSocket signaling server. You can:

1. **Use TouchDesigner's built-in signaling** (recommended)
2. **Create a simple Node.js signaling server:**

```javascript
// signaling-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080, path: '/webrtc-signaling' });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (message) => {
    // Broadcast to all connected clients (TouchDesigner + Web App)
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});
```

### 4. Connect Web Application

1. Open the simulation at `http://localhost:8080`
2. In the "TouchDesigner WebRTC Stream" panel:
   - Ensure signaling server is running
   - Click "Connect to TouchDesigner WebRTC DAT"
3. The web app will send a WebRTC offer to TouchDesigner
4. TouchDesigner's callback DAT will handle the signaling
5. Video stream will appear and cockroaches will respond to white areas

## 🎛️ TouchDesigner WebRTC DAT Configuration

### WebRTC DAT Parameters:

**Connection Page:**
- **Active**: `On` - Enable the WebRTC peer
- **Reset**: Button to reset all connections
- **Custom Bit Rate Limits**: `On` for bandwidth control
- **Maximum Bit Rate**: `10000 kbps` (adjust based on quality needs)

**ICE Page (Network Traversal):**
- **STUN Server URL**: `stun:stun.l.google.com:19302`
- **TURN Username**: (optional, for NAT traversal)
- **TURN Password**: (optional, for NAT traversal)

### Video Stream Out TOP WebRTC Configuration:

**Video Stream Out Page:**
- **Active**: `On`
- **Mode**: `WebRTC`
- **FPS**: `30-60` (adjust for performance)
- **Video Codec**: `H264`
- **Quality**: `High` for best visual quality
- **Bitrate Mode**: `CBR` (Constant Bit Rate)
- **Average Bitrate**: `5-10 Mb/s`

**WebRTC Page:**
- **WebRTC**: Reference to your WebRTC DAT
- **WebRTC Connection**: Auto-populated after peer connection
- **WebRTC Video Track**: Auto-populated video output track

### Callback DAT Functions:

The callback script handles:
- **onOffer()**: Process WebRTC offers from web application
- **onAnswer()**: Handle WebRTC answers
- **onIceCandidate()**: Exchange ICE candidates for network traversal
- **WebSocket Integration**: Bidirectional signaling with web app

## 🔧 Troubleshooting

### WebRTC Connection Issues:
- **"Signaling connection failed"**: Check WebSocket server is running on port 8080
- **"WebRTC connection failed"**: Verify ICE servers (STUN/TURN) configuration
- **"No video track"**: Ensure Video Stream Out TOP WebRTC page is configured
- **"Peer connection timeout"**: Check firewall settings and NAT configuration

### TouchDesigner Setup Issues:
- **"WebRTC DAT not active"**: Set Active=On in WebRTC DAT parameters
- **"Callback errors"**: Check Python DAT syntax and WebSocket connection
- **"Video Stream Out not streaming"**: Verify input connection and Active=On
- **"No WebRTC connection dropdown"**: Ensure WebRTC DAT is referenced correctly

### Performance Issues:
- **"High CPU usage"**: Lower Video Stream Out TOP quality or FPS
- **"Choppy video"**: Reduce bitrate or increase keyframe interval
- **"Connection drops"**: Check network stability and ICE server configuration

### Network Requirements:

**Local Development:**
- WebSocket signaling server on localhost:8080
- TouchDesigner and browser on same machine
- Windows Firewall allowed for TouchDesigner

**Advanced Network Setup:**
- STUN servers for NAT traversal
- TURN servers for restrictive networks
- Proper ICE server configuration

## 🎯 Hardware Requirements

### TouchDesigner Requirements:
- **GPU**: Nvidia GPU (required for Video Stream Out TOP)
- **OS**: Windows (Video Stream Out TOP limitation)
- **RAM**: 8GB+ recommended
- **Network**: Gigabit recommended for high quality

### Web Browser Requirements:
- **WebRTC Support**: Chrome, Firefox, Safari, Edge
- **Hardware Acceleration**: Enabled for smooth video
- **Network**: Stable connection for real-time interaction

## 📱 Features

- **Real-time WebRTC streaming**: Ultra-low latency via TouchDesigner WebRTC DAT
- **Proper peer-to-peer connection**: Direct WebRTC without media servers
- **Hardware acceleration**: Nvidia GPU encoding in TouchDesigner
- **Flexible video sources**: Camera, NDI, files, processed video
- **Live mask processing**: Instant cockroach response to video changes
- **Visual debugging**: Toggle video overlay, connection status
- **Responsive design**: Works on desktop and mobile browsers

## 📄 Example TouchDesigner Networks

### Basic Camera Stream:
```
[Video Device In] → [Video Stream Out] → [WebRTC Output]
                         ↓
[WebRTC DAT] ← [Callback DAT] ← [WebSocket Server]
```

### Processed Mask Stream:
```
[Camera] → [HSV] → [Threshold] → [Video Stream Out]
                                      ↓
[WebRTC DAT] ← [Callback DAT] ← [Web Application]
```

### Multiple Source Setup:
```
[Camera 1] ↘
[Camera 2] → [Switch] → [Composite] → [Video Stream Out]
[NDI In]   ↗                              ↓
                                   [WebRTC DAT]
```

## 📄 License

MIT License - Feel free to use for any purpose.
