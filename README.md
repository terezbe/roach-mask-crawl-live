
# Cockroach Avoidance Simulation with TouchDesigner Direct Video Streaming

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live video stream sent directly from TouchDesigner. Built for local development using TouchDesigner's Video Stream Out TOP for direct video streaming.

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

### 2. Configure TouchDesigner Direct Video Streaming

**Method 1: Using Video Stream Out TOP (Recommended)**

1. **Add Video Stream Out TOP from Palette:**
   - Drag `Video Stream Out TOP` from the Palette into your network
   - Connect your camera/mask TOP to the Video Stream Out TOP input
   - Configure parameters:
     - `Active`: `On`
     - `Port`: `8081`
     - `Protocol`: `WebSocket`
     - `Format`: `WebM` (recommended)
     - `Codec`: `VP8` or `H264`
     - `Quality`: `80-90` for good balance

2. **Connect Your Video Source:**
   - Connect your camera TOP (e.g., Video Device In TOP)
   - Or connect your mask/processed video TOP
   - The Video Stream Out will stream whatever is connected to its input

**Method 2: Using WebRTC Direct Connection (Alternative)**

1. **Add Video Stream Out TOP:**
   - Same as Method 1, but set `Protocol` to `WebRTC`
   - Configure ICE servers if needed for network traversal

2. **Configure WebRTC Settings:**
   - `STUN Server`: `stun:stun.l.google.com:19302` (default)
   - `TURN Server`: Configure if behind NAT/firewall
   - `Bitrate`: Adjust based on network capacity

### 3. TouchDesigner Network Setup Example

```
[Video Device In TOP] → [Your Processing TOPs] → [Video Stream Out TOP]
      (Camera)              (Filters/Effects)         (Streaming)

OR

[Movie File In TOP] → [Composite/Effects] → [Video Stream Out TOP]
    (Video File)        (Your Processing)      (Streaming)

OR

[NDI In TOP] → [Color/Mask Processing] → [Video Stream Out TOP]
  (NDI Source)     (Make White/Black Mask)    (Streaming)
```

### 4. Web Application Connection

1. Open the simulation at `http://localhost:8080`
2. In the "TouchDesigner Video Stream" panel:
   - **WebSocket Method**: Enter `ws://localhost:8081/video`
   - **WebRTC Method**: Click "Try Direct WebRTC Connection"
3. Click "Connect to Video Stream"
4. Your video should appear and cockroaches will avoid white areas

## 🎛️ Configuration

### Simulation Parameters
- **Cockroach Count**: 10-300 (default: 100)
- **Avoidance Strength**: 0.1-5.0 (default: 2.5)
- **Random Wander**: 0.0-1.0 (default: 0.3)
- **Max Speed**: 0.5-5.0 (default: 2.0)
- **Show Mask Overlay**: Toggle to see incoming video stream
- **Auto-start**: Automatically start simulation on load

### TouchDesigner Video Streaming
- **Real-time video streaming**: Low-latency direct video streaming
- **Multiple format support**: WebM, MP4, H264, VP8 codecs
- **Flexible input sources**: Camera, NDI, files, processed video
- **Quality control**: Adjustable bitrate and compression settings

## 🛠️ TouchDesigner Video Stream Details

### Video Stream Out TOP Parameters

**Basic Settings:**
- **Active**: Turn on/off the streaming
- **Port**: Network port for streaming (default: 8081)
- **Protocol**: `WebSocket` for simple streaming, `WebRTC` for P2P

**Video Settings:**
- **Format**: `WebM`, `MP4`, `AVI` (WebM recommended for web)
- **Codec**: `VP8`, `VP9`, `H264` (VP8 recommended for compatibility)
- **Quality**: 0-100 (80-90 recommended for good quality/performance)
- **Bitrate**: Auto or manual bitrate control
- **FPS**: Frame rate (match your project FPS)

**Advanced Settings:**
- **Keyframe Interval**: For streaming efficiency
- **Buffer Size**: Network buffer management
- **Compression Level**: CPU vs quality trade-off

### Network Configuration

**Local Network Setup:**
- TouchDesigner and web browser on same machine: `localhost:8081`
- TouchDesigner on different machine: `IP_ADDRESS:8081`
- Firewall: Allow port 8081 for TouchDesigner

**For External Access:**
- Configure router port forwarding for port 8081
- Use external IP address in web application
- Consider security implications of exposing video stream

## 🔧 Troubleshooting

### Connection Issues
- **"Connection failed"**: Check that Video Stream Out TOP is Active=On
- **"No video stream"**: Verify video source is connected to Video Stream Out input
- **"Port already in use"**: Change port number in TouchDesigner and web app
- **"WebSocket connection refused"**: Check firewall and port accessibility

### Video Quality Issues
- **"Choppy video"**: Reduce quality/bitrate or increase buffer size
- **"Poor video quality"**: Increase quality setting or bitrate
- **"High CPU usage"**: Lower quality, use hardware encoding if available
- **"Lag/delay"**: Reduce buffer size, check network performance

### TouchDesigner Setup Issues
- **"No input video"**: Check that your video source TOP is connected
- **"Video Stream Out not working"**: Verify TOP is Active and has valid input
- **"Wrong video format"**: Try different codec (VP8 usually works best)

### Web Application Issues
- **"No mask detection"**: Verify video contains white areas for avoidance
- **"Cockroaches not responding"**: Check mask overlay to see if video is processed
- **"Browser compatibility"**: Use Chrome/Firefox for best WebRTC support

## 📱 Features

- **Direct video streaming**: No complex signaling, simple WebSocket/WebRTC
- **Real-time mask processing**: Instant response to video changes
- **Multiple input sources**: Camera, NDI, files, live processing
- **Responsive design**: Works on desktop and mobile browsers
- **Visual debugging**: Toggle video overlay to see incoming stream
- **Persistent settings**: Configuration saves automatically
- **Full-screen mode**: Perfect for installations and presentations

## 🎯 Example TouchDesigner Setups

### Setup 1: Live Camera Processing
```
[Video Device In] → [HSV Filter] → [Threshold] → [Video Stream Out]
```
- Use camera input
- Apply color filtering to create white/black mask
- Stream processed mask for cockroach avoidance

### Setup 2: NDI Source Processing
```
[NDI In] → [Color Replace] → [Blur] → [Video Stream Out]
```
- Receive NDI stream from another source
- Process colors to create avoidance mask
- Stream to web simulation

### Setup 3: Pre-recorded Content
```
[Movie File In] → [Composite] → [Effects] → [Video Stream Out]
```
- Use video file as source
- Add effects and processing
- Stream processed content

### Setup 4: Live Mix Processing
```
[Video Device In] ↘
                   [Composite] → [Video Stream Out]
[Movie File In]   ↗
```
- Mix live camera with pre-recorded content
- Create dynamic avoidance patterns
- Stream composite result

## 🔐 Security Notes

- **Local network only**: Default setup works on local network
- **Firewall considerations**: Open port 8081 for external access
- **No authentication**: Basic setup has no access control
- **Production use**: Add authentication and encryption for public deployment

## 🌐 Browser Compatibility

- **Chrome/Chromium**: Full WebSocket and WebRTC support
- **Firefox**: Full support for video streaming
- **Safari**: WebSocket support, limited WebRTC features
- **Edge**: Full support for modern video streaming
- **Mobile browsers**: Basic support, performance may vary

## 📋 Video Format Recommendations

### For Best Compatibility:
- **Format**: WebM
- **Codec**: VP8
- **Quality**: 85
- **FPS**: 30
- **Resolution**: 1280x720 or lower for performance

### For High Quality:
- **Format**: MP4
- **Codec**: H264
- **Quality**: 90
- **FPS**: 60
- **Resolution**: 1920x1080

### For Low Bandwidth:
- **Format**: WebM
- **Codec**: VP8
- **Quality**: 60
- **FPS**: 15
- **Resolution**: 640x480

## 📄 License

MIT License - Feel free to use for any purpose.
