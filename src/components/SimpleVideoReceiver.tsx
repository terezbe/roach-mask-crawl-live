
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, VideoOff, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useWebRTCConnection } from '../hooks/useWebRTCConnection';

interface SimpleVideoReceiverProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

const SimpleVideoReceiver: React.FC<SimpleVideoReceiverProps> = ({ onMaskUpdate, showPreview }) => {
  const [streamMethod, setStreamMethod] = useState<'webrtc' | 'rtsp'>('webrtc');
  const [rtspUrl, setRtspUrl] = useState('rtsp://localhost:554/tdvidstream');
  const [frameCount, setFrameCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Use WebRTC connection hook
  const {
    connectionState,
    isConnecting,
    error: webrtcError,
    connect: connectWebRTC,
    disconnect: disconnectWebRTC
  } = useWebRTCConnection({
    onVideoStream: (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    },
    onConnectionStateChange: (state) => {
      console.log('Connection state changed:', state);
    }
  });

  const isConnected = connectionState === 'connected';
  const connectionStatus = isConnecting ? 'connecting' : 
                          isConnected ? 'connected' : 
                          webrtcError ? 'error' : 'disconnected';

  // Process video frames for mask extraction
  const processVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Extract mask data for cockroach simulation
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
    video.addEventListener('loadedmetadata', () => {
      console.log('Video metadata loaded:', {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration
      });
    });
    
    return () => {
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('loadedmetadata', () => {});
    };
  }, []);

  // Connect using RTSP (alternative method)
  const connectRTSP = async () => {
    console.log('RTSP connection not implemented in this version');
    // RTSP implementation would require a media server
  };

  const connect = () => {
    if (streamMethod === 'webrtc') {
      connectWebRTC();
    } else {
      connectRTSP();
    }
  };

  const disconnect = () => {
    disconnectWebRTC();
    
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
    }
    
    onMaskUpdate(null);
    setFrameCount(0);
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          TouchDesigner WebRTC Stream
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
                  Connected
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
        {webrtcError && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{webrtcError}</span>
          </div>
        )}

        {/* Stream Method Selection */}
        <div className="space-y-2">
          <Label>Connection Method</Label>
          <Select value={streamMethod} onValueChange={(value: 'webrtc' | 'rtsp') => setStreamMethod(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="webrtc">WebRTC via TouchDesigner DAT</SelectItem>
              <SelectItem value="rtsp">RTSP (Not Implemented)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Connection Button */}
        <Button
          onClick={isConnected ? disconnect : connect}
          variant={isConnected ? "destructive" : "default"}
          className="w-full"
          disabled={isConnecting}
        >
          {isConnecting ? (
            'Connecting to TouchDesigner...'
          ) : isConnected ? (
            <>
              <VideoOff className="w-4 h-4 mr-2" />
              Disconnect
            </>
          ) : (
            <>
              <Video className="w-4 h-4 mr-2" />
              Connect to TouchDesigner WebRTC DAT
            </>
          )}
        </Button>

        {/* Video Element */}
        <video
          ref={videoRef}
          style={{ display: showPreview ? 'block' : 'none' }}
          autoPlay
          playsInline
          controls
          className="w-full max-h-48 object-contain border rounded"
        />

        {/* Processing Canvas (hidden) */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />

        {/* TouchDesigner WebRTC DAT Setup Instructions */}
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="font-semibold">TouchDesigner WebRTC DAT Setup:</div>
          <div className="space-y-1">
            <div>1. Add WebRTC DAT to your network</div>
            <div>2. Configure ICE servers (STUN/TURN) in WebRTC DAT</div>
            <div>3. Set up callbacks DAT for signaling</div>
            <div>4. Add Video Stream Out TOP</div>
            <div>5. Connect your video source to Video Stream Out TOP</div>
            <div>6. Set Video Stream Out TOP mode to WebRTC</div>
            <div>7. Point WebRTC parameter to your WebRTC DAT</div>
            <div>8. Configure video track in WebRTC page</div>
            <div>9. Set Active = On in both DATs</div>
          </div>
          
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <div className="font-semibold">Signaling:</div>
            <div>Requires WebSocket server at ws://localhost:8080/webrtc-signaling for offer/answer exchange with TouchDesigner.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleVideoReceiver;
