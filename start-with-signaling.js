
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting WebRTC Signaling Server and Development Server...\n');

// Start signaling server
const signalingServer = spawn('node', ['signaling-server.js'], {
  stdio: 'pipe'
});

signalingServer.stdout.on('data', (data) => {
  console.log(`[Signaling] ${data.toString().trim()}`);
});

signalingServer.stderr.on('data', (data) => {
  console.error(`[Signaling Error] ${data.toString().trim()}`);
});

// Start development server
const devServer = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  shell: true
});

devServer.stdout.on('data', (data) => {
  console.log(`[Dev Server] ${data.toString().trim()}`);
});

devServer.stderr.on('data', (data) => {
  console.error(`[Dev Server Error] ${data.toString().trim()}`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  signalingServer.kill();
  devServer.kill();
  process.exit(0);
});

console.log('Both servers starting...');
console.log('WebRTC Signaling Server: ws://localhost:8081/webrtc-signaling');
console.log('Web Application: http://localhost:5173 (or similar)');
console.log('\nPress Ctrl+C to stop both servers\n');
