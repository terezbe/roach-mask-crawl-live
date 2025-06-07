
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server for RTMP stream proxy
const server = http.createServer((req, res) => {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Proxy RTMP streams (convert to HLS or direct stream)
  if (req.url.startsWith('/rtmp/')) {
    const streamId = req.url.split('/')[2];
    console.log(`RTMP stream request for: ${streamId}`);
    
    // Here you would implement RTMP to HTTP conversion
    // For now, we'll return a simple response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'rtmp_stream_available', streamId }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ndi' });

console.log('NDI Bridge Server starting...');

// Store active connections and their configurations
const connections = new Map();

wss.on('connection', (ws, req) => {
  const connectionId = Math.random().toString(36).substr(2, 9);
  console.log(`New WebSocket connection: ${connectionId}`);
  
  connections.set(connectionId, {
    ws,
    streamType: null,
    streamSource: null,
    isActive: false
  });
  
  // Send available sources on connection
  ws.send(JSON.stringify({
    type: 'sources_available',
    sources: [
      { name: 'TouchDesigner Output', type: 'ndi', url: 'ndi://localhost/TouchDesigner' },
      { name: 'TD Mask Stream', type: 'ndi', url: 'ndi://localhost/TD_Mask' },
      { name: 'RTMP Stream 1', type: 'rtmp', url: 'rtmp://localhost:1935/live/stream1' },
      { name: 'RTMP Stream 2', type: 'rtmp', url: 'rtmp://localhost:1935/live/stream2' }
    ]
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const connection = connections.get(connectionId);
      
      switch (message.type) {
        case 'request_stream':
          console.log(`Stream request: ${message.source}`);
          connection.streamSource = message.source;
          connection.streamType = message.streamType || 'ndi';
          connection.isActive = true;
          
          // Start streaming based on type
          if (connection.streamType === 'ndi') {
            startNDIStream(connectionId, message.source);
          } else if (connection.streamType === 'rtmp') {
            startRTMPStream(connectionId, message.source);
          }
          break;
          
        case 'stop_stream':
          console.log(`Stopping stream for connection: ${connectionId}`);
          connection.isActive = false;
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (error) {
      console.error('Message parsing error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`Connection closed: ${connectionId}`);
    connections.delete(connectionId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    connections.delete(connectionId);
  });
});

// NDI Stream Handler (mock implementation - replace with actual NDI SDK)
function startNDIStream(connectionId, source) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  console.log(`Starting NDI stream: ${source}`);
  
  // Mock NDI data - replace this with actual NDI SDK integration
  const mockStreamInterval = setInterval(() => {
    if (!connection.isActive || !connections.has(connectionId)) {
      clearInterval(mockStreamInterval);
      return;
    }
    
    // Generate mock mask data (white circle that moves around)
    const width = 640;
    const height = 480;
    const centerX = (Math.sin(Date.now() * 0.001) * 0.3 + 0.5) * width;
    const centerY = (Math.cos(Date.now() * 0.0007) * 0.3 + 0.5) * height;
    const radius = 80;
    
    const canvas = createMockMask(width, height, centerX, centerY, radius);
    
    connection.ws.send(JSON.stringify({
      type: 'frame',
      timestamp: Date.now(),
      width: width,
      height: height,
      imageData: canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
    }));
  }, 1000 / 30); // 30 FPS
}

// RTMP Stream Handler
function startRTMPStream(connectionId, source) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  console.log(`Starting RTMP stream: ${source}`);
  
  // Mock RTMP data - replace with actual RTMP client
  const mockStreamInterval = setInterval(() => {
    if (!connection.isActive || !connections.has(connectionId)) {
      clearInterval(mockStreamInterval);
      return;
    }
    
    // Generate mock RTMP mask data
    const width = 1920;
    const height = 1080;
    const centerX = (Math.sin(Date.now() * 0.002) * 0.4 + 0.5) * width;
    const centerY = (Math.cos(Date.now() * 0.0015) * 0.4 + 0.5) * height;
    const radius = 150;
    
    const canvas = createMockMask(width, height, centerX, centerY, radius);
    
    connection.ws.send(JSON.stringify({
      type: 'frame',
      timestamp: Date.now(),
      width: width,
      height: height,
      imageData: canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
    }));
  }, 1000 / 60); // 60 FPS for RTMP
}

// Create mock mask for testing
function createMockMask(width, height, centerX, centerY, radius) {
  // This is a mock implementation - in production you'd get actual video frames
  const canvas = require('canvas').createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // White circle
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas;
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`NDI Bridge Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ndi`);
  console.log(`RTMP proxy endpoint: http://localhost:${PORT}/rtmp/`);
});
