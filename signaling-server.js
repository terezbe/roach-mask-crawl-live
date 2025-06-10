
const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server on the signaling path
const wss = new WebSocket.Server({ 
  server,
  path: '/webrtc-signaling'
});

console.log('WebRTC Signaling Server starting...');

// Store connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  clients.set(clientId, ws);
  
  console.log(`Client connected: ${clientId} from ${req.socket.remoteAddress}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Message from ${clientId}:`, data.type);
      
      // Broadcast message to all other connected clients
      clients.forEach((client, id) => {
        if (id !== clientId && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Start server
const PORT = 8081;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on ws://localhost:${PORT}/webrtc-signaling`);
  console.log('TouchDesigner should connect to this URL');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down signaling server...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
