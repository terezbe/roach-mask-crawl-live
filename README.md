
# Cockroach Avoidance Simulation

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live stream sent from TouchDesigner. Built for local development and easy TouchDesigner integration.

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

### 2. Configure TouchDesigner

**Add WebSocket DAT to your TouchDesigner project:**

1. **WebSocket DAT Settings:**
   - Active: `On`
   - Network Address: `localhost`
   - Network Port: `8080`
   - Auto Reconnect: `On`

2. **Copy the callback script:**
   - Copy the code from `touchdesigner-websocket-script.py`
   - Paste it into the "Callbacks" parameter of your WebSocket DAT
   - Change `op('mask_top')` to your actual mask TOP operator name

3. **Connect your mask:**
   - Create or connect your mask/video TOP to the script
   - The script will automatically send frames to the simulation

### 3. Connect and Test

1. Open the simulation at `http://localhost:8080`
2. Enter your TouchDesigner WebSocket URL (default: `ws://localhost:8080`)
3. Click "Connect to TouchDesigner"
4. Your mask should appear in the preview and cockroaches should avoid white areas

## 🎛️ Configuration

### Simulation Parameters
- **Cockroach Count**: 10-300 (default: 100)
- **Avoidance Strength**: 0.1-5.0 (default: 2.5)
- **Random Wander**: 0.0-1.0 (default: 0.3)
- **Max Speed**: 0.5-5.0 (default: 2.0)
- **Show Mask Overlay**: Toggle for debugging
- **Auto-start**: Automatically start simulation on load

### TouchDesigner Integration
- **Direct WebSocket**: Simple, reliable connection
- **Real-time streaming**: 30-60 FPS depending on your project
- **Automatic reconnection**: Handles connection drops gracefully

## 🛠️ TouchDesigner Script Details

The provided Python script handles:
- **Connection management**: Automatic handshake with the web app
- **Frame sending**: Converts your TOP to base64 and sends via WebSocket
- **Error handling**: Graceful handling of connection issues
- **Performance**: Efficient frame encoding and transmission

### Key Functions:
- `onConnect()`: Establishes connection with the web app
- `sendCurrentFrame()`: Captures and sends your mask TOP
- `onPulse()`: Optional auto-sending at project FPS

## 🔧 Troubleshooting

### Connection Issues
- **"Connection failed"**: Check that the web app is running on `localhost:8080`
- **"WebSocket DAT not responding"**: Verify Active=On and correct port settings
- **"No frames received"**: Check that your TOP name in the script matches your actual TOP

### Performance Issues
- **Slow frame rate**: Reduce image quality in the `maskTop.save()` call
- **High CPU usage**: Reduce sending frequency by modifying the `onPulse()` function
- **Connection drops**: Enable Auto Reconnect in WebSocket DAT settings

### Common Fixes
1. **Restart TouchDesigner** after changing WebSocket DAT settings
2. **Check port conflicts** - make sure nothing else uses port 8080
3. **Verify TOP name** in the script matches your actual operator

## 📱 Features

- **Real-time mask processing**: Live integration with TouchDesigner
- **Responsive design**: Works on desktop and mobile
- **Visual debugging**: Toggle mask overlay to see incoming stream
- **Persistent settings**: Configuration saves automatically
- **Full-screen mode**: Perfect for installations

## 🎯 Example TouchDesigner Setup

```
[Your Content] → [Effects/Processing] → [Mask TOP] → [WebSocket DAT with script]
                                            ↓
                                    [Cockroach Simulation]
```

## 📄 License

MIT License - Feel free to use for any purpose.
