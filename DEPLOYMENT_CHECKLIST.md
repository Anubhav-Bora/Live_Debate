# Production Deployment Checklist

## Camera Issues Resolution

### 1. HTTPS Requirement ⚠️ **CRITICAL**
- [ ] **Ensure your production site is served over HTTPS**
- [ ] Modern browsers require HTTPS for camera/microphone access
- [ ] Use SSL certificates (Let's Encrypt, Cloudflare, etc.)
- [ ] Verify `window.isSecureContext` returns `true` in production

### 2. Browser Permissions
- [ ] Test camera permissions on your production domain
- [ ] Ensure users can grant camera/microphone permissions
- [ ] Check browser console for permission-related errors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

### 3. WebRTC Configuration
- [ ] Verify STUN/TURN servers are accessible from production
- [ ] Test peer-to-peer connections work in production environment
- [ ] Check firewall rules allow WebRTC traffic
- [ ] Consider using a TURN server for restrictive networks

## Timer Issues Resolution

### 1. Socket.IO Connection
- [ ] **Verify Socket.IO server is running in production**
- [ ] Check server logs for Socket.IO initialization messages
- [ ] Test WebSocket connections work (not blocked by proxy/firewall)
- [ ] Ensure polling fallback is enabled for restricted networks

### 2. Environment Variables
```bash
# Required environment variables
NODE_ENV=production
DATABASE_URL=your_database_url
CLERK_SECRET_KEY=your_clerk_secret
OPENROUTER_API_KEY=your_openrouter_key
PORT=3000  # or your preferred port
```

### 3. Server Configuration
- [ ] Verify custom server (server.js) is being used in production
- [ ] Check that `npm run start` command uses `node server.js`
- [ ] Ensure Socket.IO path `/api/socket.io` is accessible
- [ ] Test real-time events (join_debate, start_debate, timer_started)

## Production Testing

### Camera Testing
1. Open production site in browser
2. Navigate to a debate page
3. Check browser address bar for camera permission icon
4. Grant camera/microphone permissions
5. Verify local video appears
6. Test with another user for peer connection

### Timer Testing
1. Create a debate as Pro user
2. Join as Con user (or have someone else join)
3. Start the debate
4. Verify timer countdown appears and updates
5. Check browser console for Socket.IO connection logs
6. Test timer reaches zero and debate ends properly

## Common Issues & Solutions

### Camera Not Working
```
Issue: "Camera access requires HTTPS in production"
Solution: Deploy with SSL certificate and HTTPS

Issue: "Permission denied"
Solution: User must manually grant permissions in browser

Issue: "Camera is already in use"
Solution: Close other applications using camera
```

### Timer Not Working
```
Issue: Timer doesn't start
Solution: Check Socket.IO connection status in browser console

Issue: "Socket not connected"
Solution: Verify server.js is running and accessible

Issue: Timer starts but doesn't update
Solution: Check for JavaScript errors blocking timer updates
```

## Deployment Commands

```bash
# Build the application
npm run build

# Deploy database schema
npm run deploy

# Start production server
npm run start
```

## Monitoring

### Check Server Health
- Visit `/api/health` endpoint to verify:
  - Database connection
  - Environment variables
  - Server status

### Browser Console Logs
- Look for Socket.IO connection messages
- Check for WebRTC peer connection logs
- Monitor for permission-related errors

### Server Logs
- Monitor Socket.IO connection/disconnection events
- Check for debate start/end events
- Watch for database connection issues

## Support

If issues persist after following this checklist:
1. Check browser console for specific error messages
2. Review server logs for Socket.IO and database errors
3. Test on different browsers and devices
4. Verify all environment variables are set correctly
5. Ensure production environment supports WebSockets