
import { useState, useRef, useCallback } from 'react';
import { WebRTCSignaling } from '../services/webrtcSignaling';

interface UseWebRTCConnectionProps {
  onVideoStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

export const useWebRTCConnection = ({ onVideoStream, onConnectionStateChange }: UseWebRTCConnectionProps = {}) => {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingRef = useRef<WebRTCSignaling | null>(null);

  const webrtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const setupPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(webrtcConfig);
    peerConnectionRef.current = peerConnection;

    // Handle incoming video stream
    peerConnection.ontrack = (event) => {
      console.log('Received video track from TouchDesigner:', event);
      const [remoteStream] = event.streams;
      if (remoteStream && onVideoStream) {
        onVideoStream(remoteStream);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log('WebRTC connection state:', state);
      setConnectionState(state);
      onConnectionStateChange?.(state);
      
      if (state === 'failed' || state === 'disconnected') {
        setError('WebRTC connection failed');
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        signalingRef.current.sendIceCandidate(event.candidate);
      }
    };

    return peerConnection;
  }, [onVideoStream, onConnectionStateChange]);

  const setupSignaling = useCallback(() => {
    const signaling = new WebRTCSignaling();
    signalingRef.current = signaling;

    // Handle answer from TouchDesigner
    signaling.onMessage('answer', async (answer: RTCSessionDescriptionInit) => {
      console.log('Received answer from TouchDesigner:', answer);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(answer);
      }
    });

    // Handle ICE candidates from TouchDesigner
    signaling.onMessage('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      console.log('Received ICE candidate from TouchDesigner:', candidate);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      }
    });

    signaling.onConnection({
      onError: (error) => {
        console.error('Signaling error:', error);
        setError('Signaling connection failed');
        setIsConnecting(false);
      }
    });

    return signaling;
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Setup signaling
      const signaling = setupSignaling();
      await signaling.connect();
      
      // Setup peer connection
      const peerConnection = setupPeerConnection();
      
      // Create offer
      const offer = await peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
      });
      
      await peerConnection.setLocalDescription(offer);
      
      // Send offer to TouchDesigner
      signaling.sendOffer(offer);
      
      console.log('WebRTC offer sent to TouchDesigner');
      
    } catch (error) {
      console.error('Error connecting:', error);
      setError(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
    }
  }, [setupSignaling, setupPeerConnection]);

  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (signalingRef.current) {
      signalingRef.current.disconnect();
      signalingRef.current = null;
    }
    
    setConnectionState('closed');
    setIsConnecting(false);
    setError('');
  }, []);

  return {
    connectionState,
    isConnecting,
    error,
    connect,
    disconnect
  };
};
