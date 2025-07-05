# Video Connection Troubleshooting Guide

## Why Video Might Not Work Between Different Laptops

### 1. **Network Issues**
- **Same Network**: If both laptops are on the same WiFi, video should work
- **Different Networks**: Video calls need TURN servers to work across different networks

### 2. **Firewall/Security Software**
- Windows Firewall might block WebRTC connections
- Antivirus software might interfere with video streams
- Corporate networks often block peer-to-peer connections

### 3. **Browser Permissions**
- Camera/microphone permissions must be granted
- HTTPS is required for camera access in most browsers

## Solutions

### ✅ **Immediate Fixes**

1. **Check Camera Permissions**
   - Make sure both users allow camera/microphone access
   - Look for camera icon in browser address bar

2. **Use Same Network**
   - Connect both laptops to the same WiFi network
   - This is the easiest solution

3. **Check Browser Console**
   - Press F12 to open developer tools
   - Look for error messages in the Console tab
   - Check for WebRTC connection errors

### 🔧 **Advanced Solutions**

1. **Configure Firewall**
   - Allow the application through Windows Firewall
   - Temporarily disable antivirus for testing

2. **Use Different Browsers**
   - Try Chrome, Firefox, or Edge
   - Some browsers handle WebRTC differently

3. **Check Network Settings**
   - Ensure both users have stable internet connections
   - Try using mobile hotspot for testing

### 🌐 **For Different Networks**

The app now includes TURN servers to help with cross-network connections:

- **STUN servers**: Help discover public IP addresses
- **TURN servers**: Relay video data when direct connection fails

If video still doesn't work across different networks, you may need to:
1. Set up your own TURN server
2. Use a video service like Twilio or Agora
3. Deploy the app to a cloud service

## Testing Steps

1. **Test on Same Network First**
   - Connect both laptops to same WiFi
   - Create a debate and join as Pro/Con
   - Check if video works

2. **Test Camera Access**
   - Open browser settings
   - Check camera/microphone permissions
   - Test camera in browser settings

3. **Check Connection Status**
   - Look for "Connected" status in video room
   - Check browser console for errors
   - Verify both users see "Connected" status

## Common Error Messages

- **"Could not access webcam/mic"**: Permission denied
- **"Connection error"**: Network/firewall issue
- **"Peer connection error"**: WebRTC connection failed

## Quick Fix Checklist

- [ ] Both users allow camera/microphone permissions
- [ ] Both laptops on same network (if possible)
- [ ] Check browser console for errors
- [ ] Try different browser
- [ ] Temporarily disable firewall/antivirus
- [ ] Ensure stable internet connection

## Alternative Solutions

If video continues to fail:

1. **Use Chat Only**: The app works without video
2. **Screen Share**: Use browser's built-in screen sharing
3. **External Video Call**: Use Zoom/Teams for video, app for debate
4. **Deploy to Cloud**: Deploy to Vercel/Railway for better connectivity 