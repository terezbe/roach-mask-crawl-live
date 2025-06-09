
# TouchDesigner WebSocket DAT Callback Script
# Copy this script into the "Callbacks" parameter of your WebSocket DAT

def onConnect(dat):
    print("WebSocket connected to cockroach simulation")
    # Send initial connection message
    dat.sendText('{"type": "connected", "source": "TouchDesigner"}')

def onDisconnect(dat):
    print("WebSocket disconnected from simulation")

def onReceiveText(dat, text):
    # Handle messages from the simulation
    import json
    try:
        msg = json.loads(text)
        if msg.get('type') == 'hello':
            print("Received hello from simulation")
            # Start sending frames
            sendCurrentFrame(dat)
    except Exception as e:
        print(f"Error parsing message: {e}")

def sendCurrentFrame(dat):
    # Get your mask TOP (replace 'mask_top' with your actual TOP name)
    maskTop = op('mask_top')  # CHANGE THIS to your mask TOP name
    
    if maskTop and maskTop.width > 0:
        try:
            # Convert TOP to base64 image
            import base64
            import tempfile
            import os
            
            # Save TOP to temp file
            temp_path = tempfile.mktemp(suffix='.jpg')
            maskTop.save(temp_path, quality=0.8)
            
            # Read and encode as base64
            with open(temp_path, 'rb') as f:
                data = f.read()
                b64_data = base64.b64encode(data).decode('utf-8')
            
            # Clean up temp file
            os.unlink(temp_path)
            
            # Send frame data
            frameData = {
                'type': 'frame',
                'timestamp': absTime.frame,
                'image': f'data:image/jpeg;base64,{b64_data}'
            }
            
            dat.sendText(json.dumps(frameData))
            
        except Exception as e:
            print(f"Error sending frame: {e}")

# Auto-send frames every frame (optional)
def onPulse(dat):
    # Uncomment the line below to auto-send frames every pulse
    # This will send at your project's FPS rate
    sendCurrentFrame(dat)

# WebSocket DAT Configuration:
# - Active: On
# - Network Address: localhost
# - Network Port: 8080 (must match the URL in the web app)
# - Auto Reconnect: On (recommended)
# - Connection Timeout: 5000 (5 seconds)
