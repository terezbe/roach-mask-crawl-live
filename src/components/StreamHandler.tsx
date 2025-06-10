
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Video, VideoOff, Wifi, WifiOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';

interface StreamHandlerProps {
  onMaskUpdate: (maskData: ImageData | null) => void;
  showPreview: boolean;
}

const StreamHandler: React.FC<StreamHandlerProps> = ({ onMaskUpdate, showPreview }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'webrtc-connecting' | 'webrtc-connected' | 'error'>('disconnected');
  const [signalingServerUrl, setSignalingServerUrl] = useState('wss://localhost:443');
  const [useSecure, setUseSecure] = useState(true);
  const [clientId, setClientId] = useState<string>('');
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [frameCount, setFrameCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to TouchDesigner Signaling Server
  const connectToSignalingServer = () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    setAvailableClients([]);
    
    // Clear any existing connections
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    console.log('Connecting to TouchDesigner Signaling Server:', signalingServerUrl);
    
    try {
      const ws = new WebSocket(signalingServerUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Connected to TouchDesigner Signaling Server');
        setConnectionStatus('connected');
        setIsConnected(true);
        setErrorMessage('');
        
        // Generate a unique client ID
        const id = `web-client-${Date.now()}`;
        setClientId(id);
        
        // Send client registration message
        const registerMessage = {
          messageType: 'clientRegistration',
          clientId: id,
          content: {
            clientType: 'web'
          }
        };
        ws.send(JSON.stringify(registerMessage));
      };
      
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received signaling message:', message);
          
          switch (message.messageType) {
            case 'clientList':
              // Update available clients
              const clients = message.content?.clients || [];
              setAvailableClients(clients.filter((c: string) => c !== clientId));
              break;
              
            case 'offer':
              // Handle WebRTC offer from TouchDesigner
              await handleOffer(message);
              break;
              
            case 'answer':
              // Handle WebRTC answer
              await handleAnswer(message);
              break;
              
            case 'ice':
              // Handle ICE candidate
              await handleIceCandidate(message);
              break;
              
            default:
              console.log('Unknown message type:', message.messageType);
          }
        } catch (error) {
          console.error('Error parsing signaling message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setErrorMessage('Connection failed. Make sure TouchDesigner signalingServer COMP is active with the correct port and TLS settings.');
      };
      
      ws.onclose = () => {
        console.log('Signaling server connection closed');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setAvailableClients([]);
        
        // Auto-reconnect if it was an unexpected closure
        if (connectionStatus === 'connected' || connectionStatus === 'webrtc-connected') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectToSignalingServer();
          }, 3000);
        }
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      setErrorMessage('Failed to create WebSocket connection');
    }
  };

  // Start WebRTC connection with selected TouchDesigner client
  const startWebRTCConnection = async () => {
    if (!selectedClient || !wsRef.current) return;
    
    setConnectionStatus('webrtc-connecting');
    console.log('Starting WebRTC connection with:', selectedClient);
    
    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = peerConnection;
      
      // Handle incoming video stream
      peerConnection.ontrack = (event) => {
        console.log('Received video track from TouchDesigner');
        const [remoteStream] = event.streams;
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play();
          setConnectionStatus('webrtc-connected');
        }
      };
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          const iceMessage = {
            messageType: 'ice',
            targetClientId: selectedClient,
            sourceClientId: clientId,
            content: {
              sdpCandidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            }
          };
          wsRef.current.send(JSON.stringify(iceMessage));
        }
      };
      
      // Send offer to TouchDesigner
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      const offerMessage = {
        messageType: 'offer',
        targetClientId: selectedClient,
        sourceClientId: clientId,
        content: {
          sdp: offer.sdp
        }
      };
      wsRef.current.send(JSON.stringify(offerMessage));
      
    } catch (error) {
      console.error('Error starting WebRTC connection:', error);
      setErrorMessage('Failed to start WebRTC connection');
      setConnectionStatus('connected');
    }
  };

  // Handle WebRTC offer from TouchDesigner
  const handleOffer = async (message: any) => {
    if (!wsRef.current) return;
    
    try {
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      peerConnectionRef.current = peerConnection;
      
      // Handle incoming video stream
      peerConnection.ontrack = (event) => {
        console.log('Received video track from TouchDesigner');
        const [remoteStream] = event.streams;
        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;
          videoRef.current.play();
          setConnectionStatus('webrtc-connected');
        }
      };
      
      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          const iceMessage = {
            messageType: 'ice',
            targetClientId: message.sourceClientId,
            sourceClientId: clientId,
            content: {
              sdpCandidate: event.candidate.candidate,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              sdpMid: event.candidate.sdpMid
            }
          };
          wsRef.current.send(JSON.stringify(iceMessage));
        }
      };
      
      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: message.content.sdp
      }));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      const answerMessage = {
        messageType: 'answer',
        targetClientId: message.sourceClientId,
        sourceClientId: clientId,
        content: {
          sdp: answer.sdp
        }
      };
      wsRef.current.send(JSON.stringify(answerMessage));
      
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  // Handle WebRTC answer
  const handleAnswer = async (message: any) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.content.sdp
      }));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (message: any) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate({
        candidate: message.content.sdpCandidate,
        sdpMLineIndex: message.content.sdpMLineIndex,
        sdpMid: message.content.sdpMid
      }));
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
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
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setAvailableClients([]);
    setSelectedClient('');
    onMaskUpdate(null);
    setFrameCount(0);
  };

  // Update signaling server URL when secure toggle changes
  useEffect(() => {
    const protocol = useSecure ? 'wss://' : 'ws://';
    const port = useSecure ? '443' : '3001';
    const host = signalingServerUrl.replace(/^wss?:\/\//, '').split(':')[0];
    setSignalingServerUrl(`${protocol}${host}:${port}`);
  }, [useSecure]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
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
          TouchDesigner WebRTC
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <Label>Status</Label>
          <div className="flex items-center gap-2">
            <Badge variant={connectionStatus === 'webrtc-connected' ? "default" : "secondary"}>
              {connectionStatus === 'webrtc-connected' ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  WebRTC Connected
                </>
              ) : connectionStatus === 'connected' ? (
                <>
                  <Wifi className="w-3 h-3 mr-1" />
                  Signaling Connected
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
            {connectionStatus === 'webrtc-connected' && (
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

        {/* Security Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="secure-mode"
            checked={useSecure}
            onCheckedChange={setUseSecure}
            disabled={isConnected}
          />
          <Label htmlFor="secure-mode" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Secure Connection (TLS)
          </Label>
        </div>

        {/* Signaling Server URL */}
        <div className="space-y-2">
          <Label>TouchDesigner Signaling Server</Label>
          <Input
            value={signalingServerUrl}
            onChange={(e) => setSignalingServerUrl(e.target.value)}
            placeholder="wss://localhost:443"
            disabled={isConnected}
          />
          <div className="text-xs text-muted-foreground">
            Configure signalingServer COMP: Active=On, Port={useSecure ? '443' : '3001'}, Secure={useSecure ? 'On' : 'Off'}
          </div>
        </div>

        {/* Connect/Disconnect Button */}
        <Button
          onClick={isConnected ? disconnect : connectToSignalingServer}
          variant={isConnected ? "destructive" : "default"}
          className="w-full"
          disabled={connectionStatus === 'connecting'}
        >
          {connectionStatus === 'connecting' ? (
            'Connecting to Signaling...'
          ) : isConnected ? (
            <>
              <VideoOff className="w-4 h-4 mr-2" />
              Disconnect
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 mr-2" />
              Connect to Signaling Server
            </>
          )}
        </Button>

        {/* Available Clients */}
        {isConnected && availableClients.length > 0 && (
          <div className="space-y-2">
            <Label>Available TouchDesigner Clients</Label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={connectionStatus === 'webrtc-connected'}
            >
              <option value="">Select a client...</option>
              {availableClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
            {selectedClient && connectionStatus !== 'webrtc-connected' && (
              <Button
                onClick={startWebRTCConnection}
                disabled={connectionStatus === 'webrtc-connecting'}
                className="w-full"
              >
                {connectionStatus === 'webrtc-connecting' ? 'Starting WebRTC...' : 'Start WebRTC Session'}
              </Button>
            )}
          </div>
        )}

        {/* Video Element (hidden) */}
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          autoPlay
          playsInline
        />

        {/* Preview Canvas */}
        {showPreview && (
          <div className="space-y-2">
            <Label>WebRTC Stream Preview</Label>
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
          <div className="font-semibold">TouchDesigner WebRTC Setup:</div>
          <div>1. Add signalingServer COMP: Active=On, Port={useSecure ? '443' : '3001'}, Secure={useSecure ? 'On' : 'Off'}</div>
          <div>2. Add signalingClient COMP: Active=On, Forward to Subscribers=On</div>
          <div>3. Add webRTCPanel COMP: Active=On, reference your Panel and signalingClient</div>
          <div>4. {useSecure && 'Generate TLS certificates and configure them in signalingServer'}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamHandler;
