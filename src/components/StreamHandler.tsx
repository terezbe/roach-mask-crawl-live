
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface StreamHandlerProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

const StreamHandler: React.FC<StreamHandlerProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [touchDesignerUrl, setTouchDesignerUrl] = useState('ws://localhost:8080');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [frameCount, setFrameCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to TouchDesigner WebSocket
  const connectToTouchDesigner = () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    console.log('Connecting to TouchDesigner:', touchDesignerUrl);
    
    try {
      const ws = new WebSocket(touchDesignerUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Connected to TouchDesigner');
        setConnectionStatus('connected');
        setIsConnected(true);
        setErrorMessage('');
        
        // Send initial handshake
        ws.send(JSON.stringify({ type: 'hello' }));
      };
      
      ws.onmessage = (event) => {
        try {
          // Handle JSON messages
          const data = JSON.parse(event.data);
          console.log('Received message:', data.type);
          
          if (data.type === 'frame' && data.image) {
            processImageData(data.image);
          }
        } catch (error) {
          // Handle direct image data
          if (typeof event.data === 'string') {
            if (event.data.startsWith('data:image')) {
              processImageData(event.data);
            } else if (event.data.startsWith('/9j/') || event.data.includes('base64')) {
              // Handle base64 image data
              processImageData(`data:image/jpeg;base64,${event.data}`);
            }
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setErrorMessage('Connection failed. Make sure TouchDesigner WebSocket DAT is active on the specified port.');
      };
      
      ws.onclose = () => {
        console.log('TouchDesigner connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect if it was an unexpected closure
        if (connectionStatus === 'connected') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectToTouchDesigner();
          }, 3000);
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to create WebSocket connection');
    }
  };

  // Process incoming image data
  const processImageData = (imageData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Extract mask data for simulation
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onMaskUpdate(maskData);
      
      setFrameCount(prev => prev + 1);
    };
    img.src = imageData;
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    onMaskUpdate(null);
    setFrameCount(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          TouchDesigner Stream
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <Label>Status</Label>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                {frameCount} frames
              </Badge>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TouchDesigner WebSocket URL */}
        <div className="space-y-2">
          <Label>TouchDesigner WebSocket URL</Label>
          <Input
            value={touchDesignerUrl}
            onChange={(e) => setTouchDesignerUrl(e.target.value)}
            placeholder="ws://localhost:8080"
            disabled={isConnected}
          />
          <div className="text-xs text-muted-foreground">
            Configure WebSocket DAT: Active=On, Network Address=localhost, Port=8080
          </div>
        </div>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnect : connectToTouchDesigner}
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
              <Wifi className="w-4 h-4 mr-2" />
              Connect to TouchDesigner
            </>
          )}
        </Button>

        {/* Preview Canvas */}
        {showPreview && (
          <div className="space-y-2">
            <Label>Stream Preview</Label>
            <canvas
              ref={canvasRef}
              style={{ 
                width: '100%', 
                maxHeight: '200px', 
                objectFit: 'contain', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '4px'
              }}
            />
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-semibold">TouchDesigner Setup:</div>
          <div>1. Add a WebSocket DAT to your project</div>
          <div>2. Set Active = On</div>
          <div>3. Set Network Address = localhost</div>
          <div>4. Set Network Port = 8080</div>
          <div>5. Send image data via WebSocket</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamHandler;
