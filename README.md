
# Cockroach Avoidance Simulation

A real-time 2D simulation where cartoon cockroaches avoid white pixels from a live NDI mask stream sent from TouchDesigner. Built for local development and deployment.

## Project info

**URL**: https://lovable.dev/projects/09bcd27f-1405-4853-9033-dabd249071d8

## 🚀 Quick Local Setup

### Prerequisites

1. **Node.js & npm** - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
2. **TouchDesigner** - For NDI stream generation
3. **NDI Tools** (optional) - For NDI stream monitoring and testing

### Step-by-Step Local Setup

#### 1. Clone and Install

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

#### 2. Set Up NDI Bridge (Required for Live Streams)

Since browsers cannot directly receive NDI streams, you need a bridge service:

**Option A: Simple WebSocket Bridge (Recommended)**

Create a simple NDI-to-WebSocket bridge:

1. Install NDI SDK from [NewTek NDI](https://ndi.tv/sdk/)
2. Create a bridge script (example in Node.js):

```javascript
// ndi-bridge.js
const WebSocket = require('ws');
const { spawn } = require('child_process');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected to NDI bridge');
  
  // Start NDI receiver process
  const ndiReceiver = spawn('ndi-receiver', ['--output-format', 'mjpeg']);
  
  ndiReceiver.stdout.on('data', (data) => {
    // Forward NDI frame data to browser
    ws.send(JSON.stringify({
      type: 'frame',
      imageData: data.toString('base64')
    }));
  });
  
  ws.on('close', () => {
    ndiReceiver.kill();
  });
});
```

**Option B: Use OBS Studio + Browser Source**

1. Install [OBS Studio](https://obsproject.com/)
2. Add NDI Source in OBS
3. Use Browser Source pointing to `http://localhost:8080`

#### 3. Configure TouchDesigner

In your TouchDesigner project:

1. **Add NDI Out TOP**:
   - Set NDI Name to something recognizable (e.g., "TD Mask Stream")
   - Connect your mask/video output to NDI Out

2. **Verify NDI Stream**:
   - Use NDI Studio Monitor to verify your stream is broadcasting
   - Note the exact NDI source name

#### 4. Configure the Simulation

1. Open the simulation at `http://localhost:8080`
2. In the NDI Stream Handler panel:
   - Click "Scan for NDI Sources"
   - Select your TouchDesigner NDI stream from the dropdown
   - Click "Connect to NDI"

#### 5. Test the Setup

1. **Without NDI Stream**: The simulation runs with test mask data
2. **With NDI Stream**: 
   - Toggle "Show Mask Overlay" to see the incoming mask
   - Cockroaches should avoid white areas in your TouchDesigner output
   - Adjust "Avoidance Strength" to fine-tune behavior

## 🔧 Configuration Options

### Simulation Parameters
- **Cockroach Count**: 10-300 (default: 100)
- **Avoidance Strength**: 0.1-5.0 (default: 2.5)
- **Random Wander**: 0.0-1.0 (default: 0.3)
- **Max Speed**: 0.5-5.0 (default: 2.0)
- **Show Mask Overlay**: Toggle for debugging

### NDI Stream Settings
- **Stream URL**: WebSocket endpoint for NDI bridge
- **Source Selection**: Choose from available NDI sources
- **Connection Status**: Real-time connection monitoring

## 🛠️ Development

### Project Structure
```
src/
├── components/
│   ├── CockroachSimulation.tsx    # Main simulation container
│   ├── SimulationCanvas.tsx       # Canvas rendering & physics
│   ├── ConfigPanel.tsx            # Control panel UI
│   └── StreamHandler.tsx          # NDI stream management
├── types/
│   └── simulation.ts              # TypeScript definitions
└── pages/
    └── Index.tsx                  # Main page
```

### Technologies Used
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Canvas API** - 2D graphics rendering
- **WebSocket** - NDI stream communication

### Performance Optimization
- **60 FPS Target**: Optimized rendering loop
- **Efficient Physics**: Simple steering behaviors
- **Memory Management**: Reused objects, minimal allocations
- **Responsive Canvas**: Scales with container size

## 🎯 Troubleshooting

### Common Issues

**"No NDI sources found"**
- Ensure TouchDesigner is running and broadcasting NDI
- Check that NDI bridge is running on correct port
- Verify NDI source name matches configuration

**"Failed to connect to NDI source"**
- Check WebSocket bridge is running (`localhost:8080`)
- Verify firewall allows local connections
- Test with NDI Studio Monitor first

**Poor Performance**
- Reduce cockroach count (< 150 for older hardware)
- Lower browser zoom level
- Close other browser tabs
- Check GPU acceleration is enabled

**Cockroaches not avoiding mask**
- Toggle "Show Mask Overlay" to verify mask data
- Increase "Avoidance Strength"
- Check mask has sufficient white/black contrast
- Verify TouchDesigner output resolution

### Debug Mode
Enable "Show Mask Overlay" to visualize:
- Incoming NDI stream
- Mask processing
- White pixel detection areas

## 📱 Deployment Options

### Local Network Access
```sh
# Allow network access
npm run dev -- --host 0.0.0.0

# Access from other devices
http://YOUR_IP_ADDRESS:8080
```

### Production Build
```sh
# Build for production
npm run build

# Serve production build
npm run preview
```

### Deploy to Web
- Click "Publish" in Lovable editor
- Or deploy `dist/` folder to any static hosting service

## 🤝 Contributing

### Local Development
1. Make changes in your preferred editor
2. Test locally with `npm run dev`
3. Push changes to sync with Lovable

### Adding Features
- New parameters: Update `SimulationConfig` type
- Physics changes: Modify `SimulationCanvas.tsx`
- UI improvements: Update respective component files

## 📞 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [TouchDesigner NDI Guide](https://docs.derivative.ca/NDI_Out_TOP)

## 📄 License

This project is open source and available under the MIT License.
