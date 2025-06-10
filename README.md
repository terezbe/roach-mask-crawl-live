
# Cockroach Avoidance Simulation with TouchDesigner WebRTC

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live WebRTC video stream sent from TouchDesigner. Built for local development and professional TouchDesigner integration using WebRTC technology.

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

### 2. Configure TouchDesigner WebRTC Setup

**Create WebRTC Components in TouchDesigner:**

1. **Add signalingServer COMP from Palette:**
   - Active: `On`
   - Port: `443` (for secure) or `3001` (for non-secure)
   - Secure (TLS): `On` (recommended) or `Off` (development only)
   - Private Key File Path: Path to your `.key` file (if using TLS)
   - Certificate File Path: Path to your `.crt` file (if using TLS)

2. **Add signalingClient COMP from Palette:**
   - Active: `On`
   - Host: `localhost` (or IP of machine running signaling server)
   - Port: `443` (or `3001` for non-secure)
   - Forward to Subscribers: `On`

3. **Add webRTCPanel COMP from Palette:**
   - Active: `On`
   - Panel: Reference to your panel COMP (e.g., a TOP or UI panel)
   - Signaling Client: Reference to the signalingClient COMP created above

### 3. TLS Certificate Setup (Recommended for Production)

For secure WebRTC connections, you need TLS certificates:

**Generate Development Certificates:**
```bash
# Create self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Convert to formats TouchDesigner accepts
openssl rsa -in key.pem -out server.key
openssl x509 -in cert.pem -out server.crt
```

**Configure in TouchDesigner:**
- Set `Private Key File Path` to your `server.key` file
- Set `Certificate File Path` to your `server.crt` file

### 4. Connect and Test

1. Open the simulation at `http://localhost:8080`
2. Toggle "Secure Connection (TLS)" based on your TouchDesigner setup
3. Enter your signaling server URL:
   - Secure: `wss://localhost:443`
   - Non-secure: `ws://localhost:3001`
4. Click "Connect to Signaling Server"
5. Select your TouchDesigner client from the dropdown
6. Click "Start WebRTC Session"
7. Your panel should stream via WebRTC and cockroaches should avoid white areas

## 🎛️ Configuration

### Simulation Parameters
- **Cockroach Count**: 10-300 (default: 100)
- **Avoidance Strength**: 0.1-5.0 (default: 2.5)
- **Random Wander**: 0.0-1.0 (default: 0.3)
- **Max Speed**: 0.5-5.0 (default: 2.0)
- **Show Mask Overlay**: Toggle for debugging WebRTC stream
- **Auto-start**: Automatically start simulation on load

### TouchDesigner WebRTC Integration
- **Real-time WebRTC streaming**: Low-latency video streaming
- **Automatic signaling**: Handles WebRTC negotiation automatically
- **Multiple client support**: Connect multiple web clients to one TouchDesigner instance
- **Secure connections**: TLS encryption for production environments

## 🛠️ TouchDesigner WebRTC Details

### Component Overview
- **signalingServer COMP**: Manages WebRTC signaling and client connections
- **signalingClient COMP**: Connects to signaling server and handles messaging
- **webRTCPanel COMP**: Streams panel content via WebRTC to connected clients

### WebRTC Signaling Flow
1. **Client Registration**: Web app registers with signaling server
2. **Client Discovery**: Server broadcasts available clients
3. **WebRTC Negotiation**: Standard WebRTC offer/answer/ICE exchange
4. **Media Streaming**: Direct peer-to-peer video streaming
5. **Frame Processing**: Real-time mask extraction for simulation

### Advanced Configuration

**STUN/TURN Servers:**
TouchDesigner WebRTC components support external STUN/TURN servers for NAT traversal:
- Default STUN: `stun:stun.l.google.com:19302`
- For production, consider using dedicated STUN/TURN servers like Coturn

**Security Considerations:**
- Always use TLS (`wss://`) in production environments
- Generate proper certificates for your domain
- Consider firewall and NAT configurations for external access

## 🔧 Troubleshooting

### Connection Issues
- **"Connection failed"**: Check that TouchDesigner signalingServer is active
- **"Certificate errors"**: Verify TLS certificate paths in TouchDesigner
- **"No clients available"**: Ensure signalingClient COMP is active and connected
- **"WebRTC connection fails"**: Check firewall settings and NAT configuration

### WebRTC Issues
- **"No video stream"**: Verify webRTCPanel has a valid panel reference
- **"Poor video quality"**: Consider reducing panel resolution in TouchDesigner
- **"High CPU usage"**: WebRTC encoding is CPU-intensive, monitor performance
- **"Connection drops"**: Check network stability and consider TURN servers

### Development vs Production
- **Development**: Use `ws://` with self-signed certificates
- **Production**: Use `wss://` with proper domain certificates
- **Local testing**: Accept browser security warnings for self-signed certificates

### Common Fixes
1. **Restart TouchDesigner** after changing WebRTC component settings
2. **Check port conflicts** - ensure ports 443/3001 are available
3. **Verify component references** - signalingClient must reference signalingServer
4. **Clear browser cache** if experiencing persistent connection issues

## 📱 Features

- **Real-time WebRTC streaming**: Low-latency video from TouchDesigner
- **Interactive cockroach simulation**: Responds to live video masks
- **Responsive design**: Works on desktop and mobile browsers
- **Visual debugging**: Toggle stream overlay to see incoming video
- **Persistent settings**: Configuration saves automatically
- **Full-screen mode**: Perfect for installations and presentations
- **Multi-client support**: Multiple browsers can connect simultaneously

## 🎯 Example TouchDesigner WebRTC Flow

```
[Your Content] → [Panel COMP] → [webRTCPanel COMP] → [signalingClient COMP]
                                        ↓
                                [signalingServer COMP]
                                        ↓
                              [WebRTC Peer Connection]
                                        ↓
                              [Web Browser Simulation]
```

## 📋 WebRTC Message Types

The system uses standard WebRTC signaling messages:

- **clientRegistration**: Register web client with signaling server
- **clientList**: Broadcast available TouchDesigner clients
- **offer**: WebRTC offer with SDP
- **answer**: WebRTC answer with SDP  
- **ice**: ICE candidate for connection establishment

## 🔐 Security Notes

- WebRTC provides mandatory encryption for all media streams
- Use secure WebSocket connections (`wss://`) for signaling
- Generate proper TLS certificates for production deployments
- Consider network security when exposing TouchDesigner externally
- Review [WebRTC Security Considerations](https://datatracker.ietf.org/doc/html/rfc8826) for production use

## 🌐 Browser Compatibility

- **Chrome/Chromium**: Full WebRTC support
- **Firefox**: Full WebRTC support
- **Safari**: WebRTC support (may require additional configuration)
- **Edge**: Full WebRTC support
- **Mobile browsers**: Generally supported with some limitations

## 📄 License

MIT License - Feel free to use for any purpose.
