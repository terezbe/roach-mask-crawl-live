
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Wifi, WifiOff } from 'lucide-react';

interface StreamHandlerProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

const StreamHandler: React.FC<StreamHandlerProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [streamUrl, setStreamUrl] = useState('ws://localhost:7000/ndi');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Simulate NDI stream connection (placeholder for actual implementation)
  const connectToStream = async () => {
    setConnectionStatus('connecting');
    
    try {
      // In a real implementation, this would connect to NDI via WebSocket/WebRTC
      // For now, we'll simulate with a placeholder
      
      // Create a simulated mask data for testing
      setTimeout(() => {
        setConnectionStatus('connected');
        setIsConnected(true);
        
        // Generate test mask data
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create a simple test pattern
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Add some white areas to test avoidance
          ctx.fillStyle = 'white';
          ctx.fillRect(100, 100, 200, 100);
          ctx.fillRect(400, 200, 150, 150);
          ctx.beginPath();
          ctx.arc(200, 300, 80, 0, Math.PI * 2);
          ctx.fill();
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          onMaskUpdate(imageData);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to connect to NDI stream:', error);
      setConnectionStatus('error');
    }
  };

  const disconnectFromStream = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    onMaskUpdate(null);
  };

  // Process video frame for mask extraction
  const processVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !isConnected) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw video frame to canvas
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    
    // Extract image data for mask processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onMaskUpdate(imageData);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isConnected) {
      // Process frames at 30 FPS when connected
      interval = setInterval(processVideoFrame, 1000 / 30);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

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

        {/* Stream URL Input */}
        <div className="space-y-2">
          <Label>Stream URL</Label>
          <Input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="ws://localhost:7000/ndi"
            disabled={isConnected}
          />
        </div>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnectFromStream : connectToStream}
          variant={isConnected ? "destructive" : "default"}
          className="w-full"
          disabled={connectionStatus === 'connecting'}
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

        {/* Preview Elements (hidden) */}
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

        {/* Connection Info */}
        {connectionStatus === 'error' && (
          <div className="text-sm text-destructive">
            Failed to connect to NDI stream. Make sure TouchDesigner is running and broadcasting.
          </div>
        )}
        
        {!isConnected && (
          <div className="text-xs text-muted-foreground">
            Note: This demo includes simulated mask data for testing. 
            Connect to a real NDI stream for live mask integration.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreamHandler;
