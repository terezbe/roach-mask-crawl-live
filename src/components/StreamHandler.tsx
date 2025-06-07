
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, VideoOff, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface StreamHandlerProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

interface NDISource {
  name: string;
  url: string;
}

const StreamHandler: React.FC<StreamHandlerProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<NDISource[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Scan for available NDI sources
  const scanForNDISources = async () => {
    setIsScanning(true);
    console.log('Scanning for NDI sources...');
    
    try {
      // In a real implementation, this would connect to your NDI-WebRTC bridge
      // For now, we'll simulate discovering sources and then try to connect to real ones
      
      // Common NDI source patterns - you can modify these based on your setup
      const potentialSources: NDISource[] = [
        { name: 'TouchDesigner Output', url: 'ws://localhost:8080/ndi/touchdesigner' },
        { name: 'TD Mask Stream', url: 'ws://localhost:8080/ndi/mask' },
        { name: 'Local NDI Source', url: 'ws://localhost:7000/ndi' },
        // Add your specific NDI source name here
        { name: 'Your Stream Name', url: 'ws://localhost:8080/ndi/your-stream' }
      ];
      
      // Test connectivity to each potential source
      const activeSources: NDISource[] = [];
      
      for (const source of potentialSources) {
        try {
          const testWs = new WebSocket(source.url);
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              testWs.close();
              reject(new Error('Timeout'));
            }, 2000);
            
            testWs.onopen = () => {
              clearTimeout(timeout);
              activeSources.push(source);
              testWs.close();
              resolve(null);
            };
            
            testWs.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            };
          });
        } catch (error) {
          console.log(`Source ${source.name} not available:`, error);
        }
      }
      
      setAvailableSources(activeSources);
      console.log('Found NDI sources:', activeSources);
      
    } catch (error) {
      console.error('Error scanning for NDI sources:', error);
    }
    
    setIsScanning(false);
  };

  // Connect to selected NDI source
  const connectToNDISource = async () => {
    if (!selectedSource) {
      console.error('No NDI source selected');
      return;
    }
    
    setConnectionStatus('connecting');
    console.log('Connecting to NDI source:', selectedSource);
    
    try {
      const source = availableSources.find(s => s.name === selectedSource);
      if (!source) {
        throw new Error('Selected source not found');
      }
      
      // Create WebSocket connection to NDI bridge
      const ws = new WebSocket(source.url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Connected to NDI source');
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Request video stream
        ws.send(JSON.stringify({ 
          type: 'request_stream',
          format: 'webrtc' // or 'mjpeg' depending on your bridge
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'frame' && data.imageData) {
            // Handle incoming frame data
            processFrameData(data.imageData);
          } else if (data.type === 'webrtc_offer') {
            // Handle WebRTC offer for video stream
            handleWebRTCOffer(data.offer);
          }
        } catch (error) {
          console.error('Error processing NDI message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('NDI WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      ws.onclose = () => {
        console.log('NDI connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };
      
    } catch (error) {
      console.error('Failed to connect to NDI source:', error);
      setConnectionStatus('error');
    }
  };

  // Process incoming frame data
  const processFrameData = (imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Convert base64 image data to canvas
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Extract mask data
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onMaskUpdate(maskData);
    };
    img.src = `data:image/jpeg;base64,${imageData}`;
  };

  // Handle WebRTC offer (for real-time video streaming)
  const handleWebRTCOffer = async (offer: RTCSessionDescriptionInit) => {
    try {
      // Set up WebRTC peer connection for video stream
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.ontrack = (event) => {
        const video = videoRef.current;
        if (video && event.streams[0]) {
          video.srcObject = event.streams[0];
          video.play();
        }
      };
      
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer back to NDI bridge
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'webrtc_answer',
          answer: answer
        }));
      }
    } catch (error) {
      console.error('WebRTC setup error:', error);
    }
  };

  const disconnectFromNDI = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    onMaskUpdate(null);
  };

  // Process video frames for mask extraction
  const processVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !isConnected) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onMaskUpdate(imageData);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected && videoRef.current) {
      interval = setInterval(processVideoFrame, 1000 / 30); // 30 FPS
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  // Auto-scan on component mount
  useEffect(() => {
    scanForNDISources();
  }, []);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          NDI Stream Handler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <Label>Status</Label>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>

        {/* Scan for Sources */}
        <Button
          onClick={scanForNDISources}
          variant="outline"
          className="w-full"
          disabled={isScanning || isConnected}
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Scan for NDI Sources
            </>
          )}
        </Button>

        {/* Source Selection */}
        <div className="space-y-2">
          <Label>Available NDI Sources</Label>
          <Select
            value={selectedSource}
            onValueChange={setSelectedSource}
            disabled={isConnected}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select NDI source..." />
            </SelectTrigger>
            <SelectContent>
              {availableSources.map((source) => (
                <SelectItem key={source.name} value={source.name}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnectFromNDI : connectToNDISource}
          variant={isConnected ? "destructive" : "default"}
          className="w-full"
          disabled={connectionStatus === 'connecting' || (!selectedSource && !isConnected)}
        >
          {connectionStatus === 'connecting' ? (
            'Connecting...'
          ) : isConnected ? (
            <>
              <VideoOff className="w-4 h-4 mr-2" />
              Disconnect
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-2" />
              Connect to NDI
            </>
          )}
        </Button>

        {/* Preview Elements */}
        <div style={{ display: showPreview ? 'block' : 'none' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }}
          />
          <canvas
            ref={canvasRef}
            style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', marginTop: '8px' }}
          />
        </div>

        {/* Status Messages */}
        {connectionStatus === 'error' && (
          <div className="text-sm text-destructive">
            Failed to connect to NDI source. Make sure TouchDesigner is running and the NDI bridge is active.
          </div>
        )}
        
        {availableSources.length === 0 && !isScanning && (
          <div className="text-xs text-muted-foreground">
            No NDI sources found. Make sure TouchDesigner is running and broadcasting NDI streams.
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Found {availableSources.length} NDI source(s). 
          Make sure your NDI-to-WebSocket bridge is running on the correct port.
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamHandler;
