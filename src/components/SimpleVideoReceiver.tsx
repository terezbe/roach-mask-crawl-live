
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface SimpleVideoReceiverProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

const SimpleVideoReceiver: React.FC<SimpleVideoReceiverProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [streamUrl, setStreamUrl] = useState('ws://localhost:8081/video');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [frameCount, setFrameCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to TouchDesigner Video Stream
  const connectToVideoStream = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      console.log('Connecting to TouchDesigner Video Stream:', streamUrl);
      
      // Create WebSocket connection for video stream
      const ws = new WebSocket(streamUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Connected to TouchDesigner Video Stream');
        setConnectionStatus('connected');
        setIsConnected(true);
        setErrorMessage('');
        
        // Request video stream
        ws.send(JSON.stringify({
          type: 'requestStream',
          format: 'webm'
        }));
      };
      
      ws.onmessage = async (event) => {
        try {
          if (event.data instanceof Blob) {
            // Handle video blob data
            const videoUrl = URL.createObjectURL(event.data);
            if (videoRef.current) {
              videoRef.current.src = videoUrl;
              videoRef.current.play();
            }
          } else {
            // Handle JSON messages
            const message = JSON.parse(event.data);
            console.log('Received message:', message);
          }
        } catch (error) {
          console.error('Error processing video data:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setErrorMessage('Failed to connect to TouchDesigner Video Stream. Make sure Video Stream Out TOP is configured correctly.');
      };
      
      ws.onclose = () => {
        console.log('Video stream connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Auto-reconnect if it was an unexpected closure
        if (connectionStatus === 'connected') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectToVideoStream();
          }, 3000);
        }
      };
      
    } catch (error) {
      console.error('Failed to create video stream connection:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to create video stream connection');
    }
  };

  // Alternative: Use WebRTC for direct video streaming
  const connectWebRTCDirect = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      console.log('Attempting direct WebRTC connection to TouchDesigner');
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      // Handle incoming video stream
      peerConnection.ontrack = (event) => {
        console.log('Received video track from TouchDesigner');
        const [remoteStream] = event.streams;
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play();
          setConnectionStatus('connected');
          setIsConnected(true);
        }
      };
      
      // Create offer for TouchDesigner to answer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('WebRTC offer created, send this to TouchDesigner:', offer.sdp);
      setErrorMessage('WebRTC offer created. Configure TouchDesigner to accept this connection.');
      
    } catch (error) {
      console.error('Error creating WebRTC connection:', error);
      setErrorMessage('Failed to create WebRTC connection');
      setConnectionStatus('error');
    }
  };

  // Process video frames for mask extraction
  const processVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Extract mask data for simulation
    const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onMaskUpdate(maskData);
    
    setFrameCount(prev => prev + 1);
  };

  // Process frames when video is playing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleVideoPlay = () => {
      const processFrame = () => {
        if (video.paused || video.ended) return;
        processVideoFrame();
        requestAnimationFrame(processFrame);
      };
      processFrame();
    };
    
    video.addEventListener('play', handleVideoPlay);
    return () => video.removeEventListener('play', handleVideoPlay);
  }, []);

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
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
          TouchDesigner Video Stream
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <Label>Status</Label>
          <div className="flex items-center gap-2">
            <Badge variant={connectionStatus === 'connected' ? "default" : "secondary"}>
              {connectionStatus === 'connected' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Video Connected
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Connecting...
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
            {connectionStatus === 'connected' && (
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

        {/* Stream URL Configuration */}
        <div className="space-y-2">
          <Label>TouchDesigner Video Stream URL</Label>
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="ws://localhost:8081/video"
            disabled={isConnected}
          />
          <div className="text-xs text-muted-foreground">
            Configure Video Stream Out TOP: Active=On, Port=8081, Protocol=WebSocket
          </div>
        </div>

        {/* Connection Buttons */}
        <div className="space-y-2">
          <Button
            onClick={isConnected ? disconnect : connectToVideoStream}
            variant={isConnected ? "destructive" : "default"}
            className="w-full"
            disabled={connectionStatus === 'connecting'}
          >
            {connectionStatus === 'connecting' ? (
              'Connecting to Video Stream...'
            ) : isConnected ? (
              <>
                <VideoOff className="w-4 h-4 mr-2" />
                Disconnect
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Connect to Video Stream
              </>
            )}
          </Button>
          
          <Button
            onClick={connectWebRTCDirect}
            variant="outline"
            className="w-full"
            disabled={isConnected || connectionStatus === 'connecting'}
          >
            Try Direct WebRTC Connection
          </Button>
        </div>

        {/* Video Element */}
        <video
          ref={videoRef}
          style={{ display: showPreview ? 'block' : 'none' }}
          autoPlay
          playsInline
          className="w-full max-h-48 object-contain border rounded"
        />

        {/* Processing Canvas (hidden) */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-semibold">TouchDesigner Video Setup:</div>
          <div>1. Add Video Stream Out TOP from Palette</div>
          <div>2. Connect your camera/mask TOP to Video Stream Out TOP</div>
          <div>3. Set Active=On, Port=8081, Protocol=WebSocket</div>
          <div>4. Optional: Set Format=WebM, Codec=VP8 for better compatibility</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleVideoReceiver;
