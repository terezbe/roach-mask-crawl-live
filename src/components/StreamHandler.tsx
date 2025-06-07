import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, VideoOff, Wifi, WifiOff, RefreshCw, Radio, AlertCircle } from 'lucide-react';

interface StreamHandlerProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

interface StreamSource {
  name: string;
  type: 'ndi' | 'rtmp' | 'websocket';
  url: string;
}

const StreamHandler: React.FC<StreamHandlerProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<StreamSource[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isScanning, setIsScanning] = useState(false);
  const [customRTMPUrl, setCustomRTMPUrl] = useState('rtmp://localhost:1935/live/stream1');
  const [bridgeUrl, setBridgeUrl] = useState('ws://localhost:8081/ndi'); // Changed port to 8081
  const [touchDesignerUrl, setTouchDesignerUrl] = useState('ws://localhost:8081'); // Changed port to 8081
  const [connectionErrors, setConnectionErrors] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any existing timeouts
  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  // Connect to bridge server and scan for sources
  const scanForSources = async () => {
    setIsScanning(true);
    setConnectionErrors([]);
    console.log('Connecting to NDI bridge server...');
    
    try {
      const ws = new WebSocket(bridgeUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        setIsScanning(false);
        setConnectionErrors(prev => [...prev, 'Bridge server connection timeout. Make sure ndi-bridge-server.js is running.']);
        console.error('Connection to bridge server timed out');
      }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        console.log('Connected to NDI bridge server');
        setConnectionErrors([]);
        ws.send(JSON.stringify({ type: 'ping' }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'sources_available') {
            console.log('Available sources:', data.sources);
            // Add TouchDesigner direct WebSocket option
            const sources = [
              ...data.sources,
              { name: 'TouchDesigner Direct (WebSocket)', type: 'websocket', url: touchDesignerUrl }
            ];
            setAvailableSources(sources);
            setIsScanning(false);
          }
        } catch (error) {
          console.error('Error parsing bridge message:', error);
          setConnectionErrors(prev => [...prev, 'Error parsing bridge server response']);
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(timeout);
        console.error('Bridge connection error:', error);
        setConnectionErrors(prev => [...prev, `Bridge connection failed. Check if ndi-bridge-server.js is running on port 8081`]);
        setIsScanning(false);
      };
      
      ws.onclose = () => {
        clearTimeout(timeout);
        ws.close();
      };
      
    } catch (error) {
      console.error('Failed to connect to bridge server:', error);
      setConnectionErrors(prev => [...prev, 'Failed to connect to bridge server']);
      setIsScanning(false);
    }
  };

  // Connect directly to TouchDesigner WebSocket with better error handling
  const connectToTouchDesigner = () => {
    setConnectionStatus('connecting');
    setConnectionErrors([]);
    clearReconnectTimeout();
    
    console.log('Connecting directly to TouchDesigner WebSocket:', touchDesignerUrl);
    
    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const ws = new WebSocket(touchDesignerUrl);
      wsRef.current = ws;
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        ws.close();
        setConnectionStatus('error');
        setConnectionErrors(prev => [...prev, 'TouchDesigner connection timeout. Check WebSocket DAT: Active=On, Network Address=localhost, Port=8081']);
      }, 10000);
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('Connected to TouchDesigner WebSocket');
        setConnectionStatus('connected');
        setIsConnected(true);
        setConnectionErrors([]);
        
        // Request initial frame
        ws.send(JSON.stringify({ type: 'request_frame' }));
        
        // Set up periodic frame requests
        const frameInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'request_frame' }));
          } else {
            clearInterval(frameInterval);
          }
        }, 1000 / 30); // 30 FPS
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'frame' && data.imageData) {
            processFrameData(data.imageData, data.width, data.height);
          }
        } catch (error) {
          // Try to handle raw image data
          if (typeof event.data === 'string' && event.data.startsWith('data:image')) {
            processDirectImageData(event.data);
          } else {
            console.error('Error processing TouchDesigner message:', error);
          }
        }
      };
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('TouchDesigner WebSocket error:', error);
        setConnectionStatus('error');
        setConnectionErrors(prev => [...prev, `TouchDesigner connection failed. Verify WebSocket DAT: Active=On, Network Address=localhost, Port=8081 (NOT ws://localhost:8081)`]);
      };
      
      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        console.log('TouchDesigner connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect after 3 seconds if it was an unexpected closure
        if (connectionStatus === 'connected') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect to TouchDesigner...');
            connectToTouchDesigner();
          }, 3000);
        }
      };
      
    } catch (error) {
      console.error('Failed to connect to TouchDesigner:', error);
      setConnectionStatus('error');
      setConnectionErrors(prev => [...prev, 'Failed to create TouchDesigner WebSocket connection']);
    }
  };

  // Connect to selected source
  const connectToSource = async () => {
    if (!selectedSource && !customRTMPUrl) {
      setConnectionErrors(['No source selected']);
      return;
    }
    
    const source = availableSources.find(s => s.name === selectedSource);
    
    // If TouchDesigner direct connection is selected
    if (source?.type === 'websocket') {
      connectToTouchDesigner();
      return;
    }
    
    setConnectionStatus('connecting');
    setConnectionErrors([]);
    console.log('Connecting to source:', selectedSource || customRTMPUrl);
    
    try {
      const ws = new WebSocket(bridgeUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Connected to bridge');
        setConnectionStatus('connected');
        setIsConnected(true);
        setConnectionErrors([]);
        
        // Request stream
        const streamType = source?.type || 'rtmp';
        const streamUrl = source?.url || customRTMPUrl;
        
        ws.send(JSON.stringify({ 
          type: 'request_stream',
          source: streamUrl,
          streamType: streamType
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'frame' && data.imageData) {
            processFrameData(data.imageData, data.width, data.height);
          }
        } catch (error) {
          console.error('Error processing stream message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('Stream WebSocket error:', error);
        setConnectionStatus('error');
        setConnectionErrors(prev => [...prev, 'Bridge server stream connection failed']);
      };
      
      ws.onclose = () => {
        console.log('Stream connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };
      
    } catch (error) {
      console.error('Failed to connect to stream:', error);
      setConnectionStatus('error');
      setConnectionErrors(prev => [...prev, 'Failed to connect to stream']);
    }
  };

  // Process incoming frame data
  const processFrameData = (imageData: string, width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0);
      
      // Extract mask data
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onMaskUpdate(maskData);
    };
    img.src = `data:image/jpeg;base64,${imageData}`;
  };

  // Process direct image data
  const processDirectImageData = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Extract mask data
      const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onMaskUpdate(maskData);
    };
    img.src = dataUrl;
  };

  const disconnectFromSource = () => {
    clearReconnectTimeout();
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop_stream' }));
      wsRef.current.close();
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    onMaskUpdate(null);
  };

  const addCustomRTMPSource = () => {
    if (customRTMPUrl && !availableSources.find(s => s.url === customRTMPUrl)) {
      const newSource: StreamSource = {
        name: `Custom RTMP (${customRTMPUrl.split('/').pop()})`,
        type: 'rtmp',
        url: customRTMPUrl
      };
      setAvailableSources(prev => [...prev, newSource]);
      setSelectedSource(newSource.name);
    }
  };

  // Auto-scan on component mount
  useEffect(() => {
    scanForSources();
    
    return () => {
      clearReconnectTimeout();
    };
  }, []);

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Stream Handler
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

        {/* Connection Errors */}
        {connectionErrors.length > 0 && (
          <div className="space-y-2">
            {connectionErrors.map((error, index) => (
              <div key={index} className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {/* TouchDesigner Direct WebSocket URL */}
        <div className="space-y-2">
          <Label>TouchDesigner WebSocket URL</Label>
          <Input
            value={touchDesignerUrl}
            onChange={(e) => setTouchDesignerUrl(e.target.value)}
            placeholder="ws://localhost:8081"
            disabled={isConnected}
          />
          <div className="text-xs text-muted-foreground">
            Configure WebSocket DAT: Network Address=localhost, Port=8081, Active=On
          </div>
        </div>

        {/* Bridge Server URL */}
        <div className="space-y-2">
          <Label>Bridge Server URL</Label>
          <Input
            value={bridgeUrl}
            onChange={(e) => setBridgeUrl(e.target.value)}
            placeholder="ws://localhost:8081/ndi"
            disabled={isConnected}
          />
          <div className="text-xs text-muted-foreground">
            Make sure ndi-bridge-server.js is running
          </div>
        </div>

        {/* Scan for Sources */}
        <Button
          onClick={scanForSources}
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
              Scan for Sources
            </>
          )}
        </Button>

        {/* Source Selection */}
        <div className="space-y-2">
          <Label>Available Sources</Label>
          <Select
            value={selectedSource}
            onValueChange={setSelectedSource}
            disabled={isConnected}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select source..." />
            </SelectTrigger>
            <SelectContent>
              {availableSources.map((source) => (
                <SelectItem key={source.name} value={source.name}>
                  <div className="flex items-center gap-2">
                    {source.type === 'ndi' ? (
                      <Video className="w-4 h-4" />
                    ) : source.type === 'websocket' ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <Radio className="w-4 h-4" />
                    )}
                    {source.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom RTMP URL */}
        <div className="space-y-2">
          <Label>Custom RTMP Stream</Label>
          <div className="flex gap-2">
            <Input
              value={customRTMPUrl}
              onChange={(e) => setCustomRTMPUrl(e.target.value)}
              placeholder="rtmp://localhost:1935/live/stream1"
              disabled={isConnected}
            />
            <Button
              onClick={addCustomRTMPSource}
              variant="outline"
              disabled={isConnected || !customRTMPUrl}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnectFromSource : connectToSource}
          variant={isConnected ? "destructive" : "default"}
          className="w-full"
          disabled={connectionStatus === 'connecting' || (!selectedSource && !customRTMPUrl && !isConnected)}
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
              Connect to Stream
            </>
          )}
        </Button>

        {/* Preview Elements */}
        <div style={{ display: showPreview ? 'block' : 'none' }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', border: '1px solid #333' }}
          />
        </div>

        {/* Status Messages */}
        {connectionStatus === 'error' && (
          <div className="text-sm text-destructive">
            Failed to connect. Make sure the bridge server is running on {bridgeUrl}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Found {availableSources.length} source(s)</div>
          <div className="font-mono">Bridge: {bridgeUrl}</div>
          <div className="font-mono">TouchDesigner: {touchDesignerUrl}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamHandler;
