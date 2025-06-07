
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
  
  // Simple health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'running', timestamp: Date.now() }));
    return;
  }
  
  res.writeHead(404);
  res.end('Bridge server running - use WebSocket connection on /ndi');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server, path: '/ndi' });

console.log('NDI Bridge Server starting...');
console.log('Note: This is a mock implementation for testing. For production NDI, integrate NDI SDK.');

// Store active connections and their stream intervals
const connections = new Map();
const streamIntervals = new Map();

// Available NDI sources (in production, these would be discovered via NDI SDK)
const availableSources = [
  { name: 'TouchDesigner Output', type: 'ndi', url: 'ndi://localhost/TouchDesigner' },
  { name: 'TD Mask Stream', type: 'ndi', url: 'ndi://localhost/TD_Mask' },
  { name: 'Test Pattern 1', type: 'ndi', url: 'ndi://localhost/TestPattern1' },
  { name: 'Test Pattern 2', type: 'ndi', url: 'ndi://localhost/TestPattern2' },
  { name: 'RTMP Stream 1', type: 'rtmp', url: 'rtmp://localhost:1935/live/stream1' },
  { name: 'RTMP Stream 2', type: 'rtmp', url: 'rtmp://localhost:1935/live/stream2' }
];

wss.on('connection', (ws, req) => {
  const connectionId = Math.random().toString(36).substr(2, 9);
  console.log(`New WebSocket connection: ${connectionId}`);
  
  connections.set(connectionId, {
    ws,
    streamType: null,
    streamSource: null,
    isActive: false,
    lastFrame: Date.now()
  });
  
  // Send available sources on connection
  ws.send(JSON.stringify({
    type: 'sources_available',
    sources: availableSources,
    timestamp: Date.now()
  }));
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const connection = connections.get(connectionId);
      
      console.log(`Message from ${connectionId}:`, message.type);
      
      switch (message.type) {
        case 'request_stream':
          console.log(`Starting stream for ${connectionId}: ${message.source}`);
          connection.streamSource = message.source;
          connection.streamType = message.streamType || 'ndi';
          connection.isActive = true;
          
          // Stop any existing stream for this connection
          stopStreamForConnection(connectionId);
          
          // Start new stream
          if (connection.streamType === 'ndi') {
            startNDIStream(connectionId, message.source);
          } else if (connection.streamType === 'rtmp') {
            startRTMPStream(connectionId, message.source);
          }
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'stream_started',
            source: message.source,
            streamType: connection.streamType,
            timestamp: Date.now()
          }));
          break;
          
        case 'stop_stream':
          console.log(`Stopping stream for connection: ${connectionId}`);
          stopStreamForConnection(connectionId);
          connection.isActive = false;
          
          ws.send(JSON.stringify({
            type: 'stream_stopped',
            timestamp: Date.now()
          }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now(),
            connectionId: connectionId
          }));
          break;
          
        case 'request_sources':
          ws.send(JSON.stringify({
            type: 'sources_available',
            sources: availableSources,
            timestamp: Date.now()
          }));
          break;
      }
    } catch (error) {
      console.error('Message parsing error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to parse message',
        timestamp: Date.now()
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`Connection closed: ${connectionId}`);
    stopStreamForConnection(connectionId);
    connections.delete(connectionId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${connectionId}:`, error);
    stopStreamForConnection(connectionId);
    connections.delete(connectionId);
  });
});

// Stop stream for a specific connection
function stopStreamForConnection(connectionId) {
  if (streamIntervals.has(connectionId)) {
    clearInterval(streamIntervals.get(connectionId));
    streamIntervals.delete(connectionId);
    console.log(`Stopped stream interval for ${connectionId}`);
  }
}

// NDI Stream Handler (mock implementation with better frame generation)
function startNDIStream(connectionId, source) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  console.log(`Starting NDI stream: ${source} for connection ${connectionId}`);
  
  let frameCounter = 0;
  
  // Create stream interval for this connection
  const streamInterval = setInterval(() => {
    if (!connection.isActive || !connections.has(connectionId)) {
      stopStreamForConnection(connectionId);
      return;
    }
    
    try {
      // Generate different patterns based on source name
      let canvas;
      const timestamp = Date.now();
      
      if (source.includes('TouchDesigner') || source.includes('TD_Mask')) {
        // TouchDesigner-style pattern - moving white circle
        const width = 640;
        const height = 480;
        const centerX = (Math.sin(timestamp * 0.001) * 0.3 + 0.5) * width;
        const centerY = (Math.cos(timestamp * 0.0007) * 0.3 + 0.5) * height;
        const radius = 60 + Math.sin(timestamp * 0.002) * 20;
        canvas = createMockMask(width, height, centerX, centerY, radius, 'circle');
      } else {
        // Test pattern - different shapes
        const width = 320;
        const height = 240;
        const centerX = (Math.sin(timestamp * 0.002) * 0.4 + 0.5) * width;
        const centerY = (Math.cos(timestamp * 0.0015) * 0.4 + 0.5) * height;
        const size = 40;
        canvas = createMockMask(width, height, centerX, centerY, size, 'square');
      }
      
      connection.lastFrame = timestamp;
      frameCounter++;
      
      const frameData = {
        type: 'frame',
        timestamp: timestamp,
        frameNumber: frameCounter,
        width: canvas.width,
        height: canvas.height,
        source: source,
        imageData: canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
      };
      
      connection.ws.send(JSON.stringify(frameData));
      
      // Log every 60 frames (2 seconds at 30fps)
      if (frameCounter % 60 === 0) {
        console.log(`NDI ${connectionId}: Sent frame ${frameCounter} for ${source}`);
      }
      
    } catch (error) {
      console.error(`Error generating NDI frame for ${connectionId}:`, error);
      stopStreamForConnection(connectionId);
    }
    
  }, 1000 / 30); // 30 FPS
  
  streamIntervals.set(connectionId, streamInterval);
}

// RTMP Stream Handler
function startRTMPStream(connectionId, source) {
  const connection = connections.get(connectionId);
  if (!connection) return;
  
  console.log(`Starting RTMP stream: ${source} for connection ${connectionId}`);
  
  let frameCounter = 0;
  
  const streamInterval = setInterval(() => {
    if (!connection.isActive || !connections.has(connectionId)) {
      stopStreamForConnection(connectionId);
      return;
    }
    
    try {
      // Generate RTMP-style pattern - larger resolution, different movement
      const width = 1280;
      const height = 720;
      const timestamp = Date.now();
      const centerX = (Math.sin(timestamp * 0.0008) * 0.4 + 0.5) * width;
      const centerY = (Math.cos(timestamp * 0.0012) * 0.4 + 0.5) * height;
      const radius = 100 + Math.sin(timestamp * 0.003) * 30;
      
      const canvas = createMockMask(width, height, centerX, centerY, radius, 'circle');
      
      connection.lastFrame = timestamp;
      frameCounter++;
      
      const frameData = {
        type: 'frame',
        timestamp: timestamp,
        frameNumber: frameCounter,
        width: canvas.width,
        height: canvas.height,
        source: source,
        imageData: canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
      };
      
      connection.ws.send(JSON.stringify(frameData));
      
      if (frameCounter % 180 === 0) { // Log every 3 seconds at 60fps
        console.log(`RTMP ${connectionId}: Sent frame ${frameCounter} for ${source}`);
      }
      
    } catch (error) {
      console.error(`Error generating RTMP frame for ${connectionId}:`, error);
      stopStreamForConnection(connectionId);
    }
    
  }, 1000 / 60); // 60 FPS for RTMP
  
  streamIntervals.set(connectionId, streamInterval);
}

// Create mock mask with different patterns
function createMockMask(width, height, centerX, centerY, size, pattern = 'circle') {
  let canvas;
  
  try {
    canvas = require('canvas').createCanvas(width, height);
  } catch (error) {
    console.error('Canvas module not available, using fallback');
    // Fallback for when canvas module isn't available
    return {
      width: width,
      height: height,
      toDataURL: () => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wAg=='
    };
  }
  
  const ctx = canvas.getContext('2d');
  
  // Black background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // White shape
  ctx.fillStyle = '#FFFFFF';
  
  switch (pattern) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'square':
      ctx.fillRect(centerX - size/2, centerY - size/2, size, size);
      break;
      
    case 'cross':
      // Vertical bar
      ctx.fillRect(centerX - size/8, centerY - size/2, size/4, size);
      // Horizontal bar
      ctx.fillRect(centerX - size/2, centerY - size/8, size, size/4);
      break;
  }
  
  return canvas;
}

// Cleanup on server shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down NDI Bridge Server...');
  
  // Stop all streams
  streamIntervals.forEach((interval, connectionId) => {
    clearInterval(interval);
    console.log(`Stopped stream for ${connectionId}`);
  });
  
  // Close all connections
  connections.forEach((connection, connectionId) => {
    connection.ws.close();
    console.log(`Closed connection ${connectionId}`);
  });
  
  process.exit(0);
});

const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`NDI Bridge Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ndi`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('Ready to accept connections...');
});
