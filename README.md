
# Cockroach Avoidance Simulation with TouchDesigner Video Stream Out TOP

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live video stream sent directly from TouchDesigner using the Video Stream Out TOP. Built for local development with WebRTC or RTSP streaming support.

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

### 2. Configure TouchDesigner Video Stream Out TOP

**Method 1: WebRTC (Recommended for Real-time)**

1. **Add Video Stream Out TOP:**
   - Drag `Video Stream Out TOP` from the Palette into your network
   - Connect your camera/mask TOP to the Video Stream Out TOP input

2. **Configure Video Stream Out TOP Parameters:**
   - `Active`: `On`
   - `Mode`: `WebRTC`
   - `FPS`: `30` (adjust as needed)
   - `Video Codec`: `H264` (recommended)
   - `Quality`: `High` or `Medium`

3. **Add and Configure WebRTC DAT:**
   - Add `WebRTC DAT` to your network
   - In Video Stream Out TOP, set `WebRTC` parameter to point to your WebRTC DAT
   - Configure WebRTC DAT for peer-to-peer connection

4. **Set Video/Audio Tracks:**
   - In Video Stream Out TOP WebRTC page:
   - Set `WebRTC Video Track` to appropriate track
   - Optionally set `WebRTC Audio Track` if needed

**Method 2: RTSP (Alternative)**

1. **Add Video Stream Out TOP:**
   - Connect your camera/mask TOP to the input
   - `Active`: `On`
   - `Mode`: `RTSP`
   - `Network Port`: `554`
   - `Stream Name`: `tdvidstream`

2. **RTSP URL will be:**
   ```
   rtsp://localhost:554/tdvidstream
   ```

3. **Note:** Browsers don't support RTSP directly, so you'll need a media server like FFmpeg or GStreamer to convert RTSP to WebRTC.

### 3. TouchDesigner Network Setup Examples

**Basic Camera Setup:**
```
[Video Device In TOP] → [Video Stream Out TOP]
      (Camera)              (WebRTC Mode)
```

**Processed Video Setup:**
```
[Video Device In TOP] → [HSV TOP] → [Threshold TOP] → [Video Stream Out TOP]
      (Camera)          (Color)     (Make B&W Mask)      (WebRTC Mode)
```

**NDI Input Setup:**
```
[NDI In TOP] → [Color Replace TOP] → [Video Stream Out TOP]
  (NDI Source)    (Create Mask)         (WebRTC Mode)
```

**File Playback Setup:**
```
[Movie File In TOP] → [Composite TOP] → [Video Stream Out TOP]
    (Video File)        (Effects)          (WebRTC Mode)
```

### 4. Web Application Connection

1. Open the simulation at `http://localhost:8080`
2. In the "TouchDesigner Video Stream" panel:
   - Select **WebRTC** as connection method (recommended)
   - Click "Connect to TouchDesigner"
3. Your video should appear and cockroaches will avoid white areas in real-time

## 🎛️ TouchDesigner Video Stream Out TOP Parameters

### Essential Parameters:

**Video Stream Out Page:**
- **Active**: `On` - Enable the streaming
- **Mode**: `WebRTC` or `RTSP` 
- **Network Port**: `554` (for RTSP) or auto (for WebRTC)
- **Stream Name**: `tdvidstream` (for RTSP)
- **FPS**: `30` - Frame rate for streaming
- **Video Codec**: `H264` - Best compatibility
- **Quality**: `High` or `Medium` - Balance quality vs performance
- **Bitrate Mode**: `CBR` - Constant bitrate for streaming
- **Average Bitrate**: `5-10 Mb/s` - Adjust based on quality needs

**WebRTC Page (when using WebRTC mode):**
- **WebRTC**: Point to your WebRTC DAT
- **WebRTC Connection**: Select peer connection
- **WebRTC Video Track**: Select video output track
- **WebRTC Audio Track**: Optional audio track

### Performance Settings:

**For Low Latency:**
- **FPS**: `60`
- **Quality**: `Medium`
- **Keyframe Interval**: `30`
- **Max B-Frames**: `0`
- **Bitrate Mode**: `CBR`

**For High Quality:**
- **FPS**: `30`
- **Quality**: `High`
- **Average Bitrate**: `10+ Mb/s`
- **Profile**: `High`

**For Low Bandwidth:**
- **FPS**: `15`
- **Quality**: `Low`
- **Average Bitrate**: `2-5 Mb/s`
- **Resolution**: Lower in Common page

## 🔧 Troubleshooting

### WebRTC Connection Issues:
- **"WebRTC offer created"**: Configure TouchDesigner WebRTC DAT to accept connection
- **"Connection failed"**: Check that Video Stream Out TOP is Active=On and Mode=WebRTC
- **"No video track"**: Verify WebRTC Video Track is set in Video Stream Out TOP
- **"Peer connection failed"**: Check firewall settings and ICE servers

### Video Quality Issues:
- **"Choppy video"**: Reduce FPS or increase bitrate
- **"Poor quality"**: Increase Quality setting or Average Bitrate
- **"High CPU usage"**: Lower quality settings or resolution
- **"Lag/delay"**: Reduce buffer settings, check Keyframe Interval

### TouchDesigner Setup Issues:
- **"No input video"**: Check that TOP is connected to Video Stream Out input
- **"Video Stream Out not active"**: Set Active=On in parameters
- **"WebRTC DAT not configured"**: Add WebRTC DAT and configure peer connections
- **"Wrong codec"**: Try H264 codec for best browser compatibility

### Network Issues:
- **"Port in use"**: Change Network Port in TouchDesigner
- **"Firewall blocking"**: Allow TouchDesigner through Windows Firewall
- **"Can't connect locally"**: Use `localhost` or `127.0.0.1` for local connections

## 📱 Features

- **Real-time WebRTC streaming**: Ultra-low latency video streaming
- **Hardware accelerated**: Uses Nvidia GPU encoding in TouchDesigner
- **Multiple input sources**: Camera, NDI, files, processed video
- **Live mask processing**: Instant response to video changes
- **Responsive design**: Works on desktop and mobile browsers
- **Visual debugging**: Toggle video overlay to see incoming stream
- **Persistent settings**: Configuration saves automatically
- **Full-screen mode**: Perfect for installations

## 🎯 TouchDesigner WebRTC Setup Details

### WebRTC DAT Configuration:

1. **Add WebRTC DAT** to your network
2. **Configure ICE Servers:**
   - Add STUN server: `stun:stun.l.google.com:19302`
   - Add TURN servers if behind NAT/firewall

3. **Set up Peer Connection:**
   - Configure signaling method (WebSocket, HTTP, etc.)
   - Handle offer/answer exchange with web application

4. **Connect to Video Stream Out:**
   - Set Video Stream Out's WebRTC parameter to WebRTC DAT
   - Configure video/audio tracks as needed

### Network Requirements:

**Local Network:**
- TouchDesigner and browser on same machine: Direct WebRTC connection
- Different machines on LAN: Configure ICE servers properly
- Firewall: Allow WebRTC traffic (UDP ports)

**Internet/Remote Access:**
- STUN servers for NAT traversal
- TURN servers for restrictive networks
- Proper ICE server configuration

## 🔐 Security and Performance

### Security Notes:
- **Local development**: No authentication required
- **Production use**: Implement proper signaling server security
- **Network exposure**: Be careful with open ports and access

### Performance Tips:
- **Nvidia GPU required**: Video Stream Out TOP uses hardware encoding
- **Resolution limits**: Lower resolution = better performance
- **Multiple streams**: Geforce cards limited to 2 simultaneous streams
- **Network bandwidth**: Monitor bitrate vs quality trade-offs

## 🌐 Browser Compatibility

- **Chrome/Chromium**: Full WebRTC support (recommended)
- **Firefox**: Full WebRTC support
- **Safari**: WebRTC support with some limitations
- **Edge**: Full WebRTC support
- **Mobile browsers**: Basic support, performance varies

## 📋 Recommended Video Settings

### For Real-time Interaction:
- **Mode**: WebRTC
- **FPS**: 30-60
- **Codec**: H264
- **Quality**: Medium-High
- **Bitrate**: 5-10 Mb/s
- **Resolution**: 1280x720

### For High Quality Display:
- **Mode**: WebRTC
- **FPS**: 30
- **Codec**: H264
- **Quality**: High
- **Bitrate**: 10-15 Mb/s
- **Resolution**: 1920x1080

### For Low Bandwidth:
- **Mode**: WebRTC
- **FPS**: 15-30
- **Codec**: H264
- **Quality**: Low-Medium
- **Bitrate**: 2-5 Mb/s
- **Resolution**: 640x480

## 📄 Hardware Requirements

### TouchDesigner Side:
- **GPU**: Nvidia GPU (required for Video Stream Out TOP)
- **OS**: Windows (Video Stream Out TOP requirement)
- **RAM**: 8GB+ recommended
- **Network**: Gigabit Ethernet recommended for high quality

### Web Browser Side:
- **Modern browser with WebRTC support**
- **Hardware acceleration enabled**
- **Stable network connection**

## 📄 License

MIT License - Feel free to use for any purpose.
