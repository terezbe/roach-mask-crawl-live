export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'connection-request' | 'connection-response';
  data: any;
  connectionId?: string;
}

export class WebRTCSignaling {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private connectionCallbacks: {
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
  } = {};

  constructor(private wsUrl: string = 'ws://localhost:8081/webrtc-signaling') {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);
        
        this.ws.onopen = () => {
          console.log('WebRTC signaling connected');
          this.connectionCallbacks.onOpen?.();
          resolve();
        };

        this.ws.onclose = () => {
          console.log('WebRTC signaling disconnected');
          this.connectionCallbacks.onClose?.();
        };

        this.ws.onerror = (error) => {
          console.error('WebRTC signaling error:', error);
          this.connectionCallbacks.onError?.(error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
              handler(message.data);
            }
          } catch (error) {
            console.error('Error parsing signaling message:', error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(message: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  onConnection(callbacks: {
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
  }) {
    this.connectionCallbacks = callbacks;
  }

  // Send offer to TouchDesigner WebRTC DAT
  sendOffer(offer: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      data: offer
    });
  }

  // Send ICE candidate to TouchDesigner
  sendIceCandidate(candidate: RTCIceCandidateInit) {
    this.send({
      type: 'ice-candidate',
      data: candidate
    });
  }

  // Request connection from TouchDesigner
  requestConnection() {
    this.send({
      type: 'connection-request',
      data: { timestamp: Date.now() }
    });
  }
}
