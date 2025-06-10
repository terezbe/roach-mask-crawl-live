"""
TouchDesigner WebRTC DAT Callback Script
Place this code in a DAT (set to Python) and reference it in your WebRTC DAT's Callbacks parameter.

This script handles WebRTC signaling between TouchDesigner and the web application.
"""

import json
import websocket
import threading

# WebSocket connection to signaling server
ws = None
webrtc_dat = None

def onConnectionOpen(dat, connection_id):
    """Called when a WebRTC connection is opened"""
    print(f"WebRTC connection opened: {connection_id}")

def onConnectionClose(dat, connection_id):
    """Called when a WebRTC connection is closed"""
    print(f"WebRTC connection closed: {connection_id}")

def onOffer(dat, connection_id, offer):
    """Called when an offer is received from a peer"""
    print(f"Received offer for connection {connection_id}")
    
    # Send offer to web application via WebSocket
    if ws and ws.sock and ws.sock.connected:
        message = {
            'type': 'offer',
            'data': {
                'sdp': offer['sdp'],
                'type': offer['type']
            },
            'connectionId': connection_id
        }
        ws.send(json.dumps(message))

def onAnswer(dat, connection_id, answer):
    """Called when an answer is received from a peer"""
    print(f"Received answer for connection {connection_id}")

def onIceCandidate(dat, connection_id, candidate):
    """Called when an ICE candidate is received"""
    print(f"Received ICE candidate for connection {connection_id}")
    
    # Send ICE candidate to web application
    if ws and ws.sock and ws.sock.connected:
        message = {
            'type': 'ice-candidate',
            'data': candidate,
            'connectionId': connection_id
        }
        ws.send(json.dumps(message))

def setupWebSocket():
    """Setup WebSocket connection to signaling server"""
    global ws, webrtc_dat
    
    def on_message(ws, message):
        try:
            data = json.loads(message)
            
            if data['type'] == 'offer':
                # Handle offer from web application
                offer_data = data['data']
                # Create answer using WebRTC DAT
                # This would typically involve calling WebRTC DAT methods
                print("Received offer from web app:", offer_data)
                
            elif data['type'] == 'ice-candidate':
                # Handle ICE candidate from web application
                candidate_data = data['data']
                print("Received ICE candidate from web app:", candidate_data)
                
        except Exception as e:
            print(f"Error processing WebSocket message: {e}")
    
    def on_error(ws, error):
        print(f"WebSocket error: {error}")
    
    def on_close(ws, close_status_code, close_msg):
        print("WebSocket connection closed")
    
    def on_open(ws):
        print("WebSocket connection opened to signaling server")
    
    try:
        ws = websocket.WebSocketApp("ws://localhost:8081/webrtc-signaling",
                                   on_message=on_message,
                                   on_error=on_error,
                                   on_close=on_close,
                                   on_open=on_open)
        
        # Run WebSocket in separate thread
        ws_thread = threading.Thread(target=ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
    except Exception as e:
        print(f"Failed to setup WebSocket: {e}")

# Initialize WebSocket connection when DAT is created
def onInit():
    """Called when the DAT is initialized"""
    global webrtc_dat
    webrtc_dat = op('webrtc1')  # Adjust name to match your WebRTC DAT
    setupWebSocket()

# Call initialization
onInit()
