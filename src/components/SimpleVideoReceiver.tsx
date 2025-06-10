
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, VideoOff, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface SimpleVideoReceiverProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

const SimpleVideoReceiver: React.FC<SimpleVideoReceiverProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [streamMethod, setStreamMethod] = useState<'webrtc' | 'rtsp'>('webrtc');
  const [rtspUrl, setRtspUrl] = useState('rtsp://localhost:554/tdvidstream');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [frameCount, setFrameCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebRTC Configuration for TouchDesigner
  const webrtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // Connect using WebRTC (TouchDesigner Video Stream Out TOP)
  const connectWebRTC = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      console.log('Setting up WebRTC connection to TouchDesigner Video Stream Out TOP');
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection(webrtcConfig);
      peerConnectionRef.current = peerConnection;

      // Handle incoming video stream from TouchDesigner
      peerConnection.ontrack = (event) => {
        console.log('Received video track from TouchDesigner:', event);
        const [remoteStream] = event.streams;
        if (videoRef.current && remoteStream) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play();
          setConnectionStatus('connected');
          setIsConnected(true);
          console.log('Video stream connected successfully');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate);
          // In a real implementation, you'd send this to TouchDesigner
          // For now, we'll use a simplified approach
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setConnectionStatus('connected');
          setIsConnected(true);
        } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
          setConnectionStatus('error');
          setIsConnected(false);
          setErrorMessage('WebRTC connection failed or disconnected');
        }
      };

      // Create offer for TouchDesigner to accept
      const offer = await peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      
      await peerConnection.setLocalDescription(offer);
      
      console.log('WebRTC offer created for TouchDesigner:');
      console.log('SDP:', offer.sdp);
      
      // For TouchDesigner integration, you would typically:
      // 1. Send this offer to TouchDesigner via WebSocket or HTTP
      // 2. TouchDesigner creates an answer using its WebRTC DAT
      // 3. Set the remote description with TouchDesigner's answer
      
      // Simplified connection for local testing
      setErrorMessage('WebRTC offer created. Configure TouchDesigner Video Stream Out TOP with WebRTC enabled.');
      
    } catch (error) {
      console.error('Error setting up WebRTC:', error);
      setConnectionStatus('error');
      setErrorMessage(`WebRTC setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Connect using RTSP (alternative method)
  const connectRTSP = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      console.log('Attempting RTSP connection to:', rtspUrl);
      
      // For RTSP, we need to use a different approach since browsers don't natively support RTSP
      // We can use WebRTC to convert RTSP to WebRTC, or use a media server
      setErrorMessage('RTSP direct connection not supported in browsers. Use WebRTC method or set up a media server.');
      setConnectionStatus('error');
      
    } catch (error) {
      console.error('RTSP connection error:', error);
      setConnectionStatus('error');
      setErrorMessage('RTSP connection failed');
    }
  };

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

  const connect = () => {
    if (streamMethod === 'webrtc') {
      connectWebRTC();
    } else {
      connectRTSP();
    }
  };

  const disconnect = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
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
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
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
        {errorMessage && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
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
              <SelectItem value="webrtc">WebRTC (Recommended)</SelectItem>
              <SelectItem value="rtsp">RTSP (Requires Media Server)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* RTSP URL Configuration (only show if RTSP selected) */}
        {streamMethod === 'rtsp' && (
          <div className="space-y-2">
            <Label>RTSP URL</Label>
            <Input
              value={rtspUrl}
              onChange={(e) => setRtspUrl(e.target.value)}
              placeholder="rtsp://localhost:554/tdvidstream"
              disabled={isConnected}
            />
          </div>
        )}

        {/* Connection Button */}
        <Button
          onClick={isConnected ? disconnect : connect}
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
              Connect to TouchDesigner
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

        {/* TouchDesigner Setup Instructions */}
        <div className="text-xs text-muted-foreground space-y-2">
          <div className="font-semibold">TouchDesigner Video Stream Out TOP Setup:</div>
          
          {streamMethod === 'webrtc' ? (
            <div className="space-y-1">
              <div>1. Add Video Stream Out TOP to your network</div>
              <div>2. Connect your camera/mask TOP to its input</div>
              <div>3. Set Mode = WebRTC in parameters</div>
              <div>4. Configure WebRTC page:</div>
              <div className="ml-4">- Add WebRTC DAT to your network</div>
              <div className="ml-4">- Set WebRTC parameter to point to WebRTC DAT</div>
              <div className="ml-4">- Configure video/audio tracks in WebRTC DAT</div>
              <div>5. Set Active = On</div>
            </div>
          ) : (
            <div className="space-y-1">
              <div>1. Add Video Stream Out TOP to your network</div>
              <div>2. Connect your camera/mask TOP to its input</div>
              <div>3. Set Mode = RTSP</div>
              <div>4. Set Network Port = 554 (default)</div>
              <div>5. Set Stream Name = tdvidstream</div>
              <div>6. Set Active = On</div>
              <div>7. Use media server to convert RTSP to WebRTC</div>
            </div>
          )}
          
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <div className="font-semibold">Note:</div>
            <div>WebRTC provides the best performance for real-time interaction with the cockroach simulation.</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleVideoReceiver;
