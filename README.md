# 🎤 Live AI Debate Arena

A real-time debate platform with AI-powered feedback, live video streaming, and speech-to-text transcription. Built with Next.js, Socket.IO, WebRTC, and OpenAI.

## 🌟 Features

- **Real-time Video Debates**: WebRTC peer-to-peer video/audio streaming
- **Live Speech Transcription**: Browser-based speech-to-text for both participants
- **AI-Powered Feedback**: GPT-4 analysis of debate performance with detailed scoring
- **Global Leaderboard**: Rankings based on debate scores and performance
- **User Authentication**: Secure authentication via Clerk
- **Real-time Messaging**: Socket.IO for live chat and updates
- **Responsive UI**: Beautiful animated interface with Framer Motion

## 🚀 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Radix UI** - Accessible component primitives

### Backend
- **Node.js** - Custom server with Next.js
- **Socket.IO** - Real-time bidirectional communication
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Database (hosted on Neon)

### Real-time Features
- **SimplePeer** - WebRTC wrapper for video/audio
- **Web Speech API** - Browser speech recognition
- **Socket.IO** - Live updates and signaling

### AI & Authentication
- **OpenRouter API** - GPT-4 for debate analysis
- **Clerk** - User authentication and management

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (or Neon account)
- Clerk account (for authentication)
- OpenRouter API key (for AI feedback)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd live-ai-debate-arena
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@host/database
```

Create `.env.local` file:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# OpenRouter API (for AI feedback)
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. **Set up the database**
```bash
npx prisma generate
npx prisma migrate deploy
```

5. **Run the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🎯 Project Flow

### 1. Landing Page (`/`)
- Users land on an animated homepage
- Options to sign in/up or browse as guest
- Quick join feature with debate ID
- Call-to-action buttons for creating or browsing debates

### 2. Authentication
- Powered by Clerk
- Sign up/Sign in flows at `/sign-up` and `/sign-in`
- User data synced to database via API

### 3. Create Debate (`/debates/create`)
**Flow:**
1. User enters debate topic
2. Sets duration (minutes:seconds, minimum 1 minute)
3. Chooses visibility (public/private)
4. System generates:
   - **Debate ID** (for spectators to view)
   - **Con Join Code** (secret code for opponent)
5. User automatically joins as **Pro** participant
6. Redirected to debate room

### 4. Join Debate
**Two ways to join:**

**As Participant (Con):**
- Enter the secret Con Join Code
- Joins as the opposing participant

**As Spectator:**
- Use the Debate ID
- Can watch but not participate in video

### 5. Debate Room (`/debates/[id]`)

**Pre-Debate:**
- Pro user sees "Start Camera" button
- Both participants must start their cameras
- Pro user can start the debate when ready
- Real-time status updates via Socket.IO

**During Debate:**
- **Video Streaming**: WebRTC peer-to-peer connection
  - Local video (small, bottom-right)
  - Remote video (main display)
  - Connection status indicators

- **Speech Recognition**: 
  - Automatic speech-to-text transcription
  - Shows interim results (blue text) in real-time
  - Final transcript saved continuously
  - Separate transcripts for Pro and Con

- **Live Chat**:
  - Text messaging between participants
  - Messages stored in database
  - Real-time delivery via Socket.IO

- **Timer**:
  - Countdown display
  - Auto-ends debate when time expires
  - Can be started only by Pro user

**Technical Flow:**
```
User clicks "Start Camera"
  ↓
Browser requests camera/microphone permissions
  ↓
MediaStream created
  ↓
Speech recognition starts automatically
  ↓
Socket.IO connects to debate room
  ↓
WebRTC peer connection established
  ↓
Video/audio streams exchanged
  ↓
Transcripts sent via Socket.IO
```

### 6. Debate End & AI Analysis

**When debate ends:**
1. Timer reaches zero OR Pro user manually ends
2. Socket.IO emits `debate_ended` event
3. Server collects:
   - All chat messages
   - Speech transcripts (Pro & Con)
   - Debate metadata

4. **AI Analysis** (via OpenRouter GPT-4):
   - Analyzes both participants' performance
   - Generates scores for:
     - Logic (1-10)
     - Clarity (1-10)
     - Persuasiveness (1-10)
     - Tone (1-10)
   - Identifies mistakes
   - Provides improvement suggestions
   - Writes detailed feedback

5. **Results Saved**:
   - AI feedback stored in database
   - Scores added to leaderboard
   - Displayed to both participants

**AI Feedback Structure:**
```json
{
  "pro": {
    "score": 7.5,
    "logic": 8,
    "clarity": 7,
    "persuasiveness": 7,
    "tone": 8,
    "mistakes": ["Interrupted opponent", "Weak closing"],
    "improvements": ["Provide more evidence", "Stronger conclusion"],
    "feedback": "Detailed paragraph about performance..."
  },
  "con": {
    "score": 8.0,
    "logic": 8,
    "clarity": 8,
    "persuasiveness": 8,
    "tone": 8,
    "mistakes": ["Repeated arguments"],
    "improvements": ["More diverse examples"],
    "feedback": "Detailed paragraph about performance..."
  }
}
```

### 7. Leaderboard (`/leaderboard`)
- Rankings by time period (week/month/all-time)
- Top 3 podium display with medals
- Full table with:
  - Rank
  - Username
  - Total score (average across debates)
  - Number of debates
  - Badges earned
- Scores calculated from AI feedback

### 8. Profile (`/profile/[userId]`)
- User's debate history
- Performance statistics
- Badges earned
- Personal leaderboard position

## 🏗️ Architecture

### Database Schema (Prisma)

**User**
- Stores user info from Clerk
- Links to debates, scores, messages

**Debate**
- Topic, duration, status
- Join codes for participants
- Links to creator, Pro user, Con user
- Stores AI feedback as JSON

**Message**
- Chat messages during debate
- Links to user and debate

**Score**
- Individual debate scores
- Broken down by category (logic, clarity, etc.)
- Used for leaderboard calculations

**Vote**
- User votes on debate winners
- One vote per user per debate

**Badge & UserBadge**
- Achievement system
- Earned based on performance criteria

### Real-time Communication

**Socket.IO Events:**

**Client → Server:**
- `join_debate` - Join a debate room
- `start_debate` - Begin the debate timer
- `send_message` - Send chat message
- `transcript_update` - Send speech transcript
- `signal` - WebRTC signaling data

**Server → Client:**
- `debate_started` - Debate has begun
- `debate_ended` - Debate finished
- `debate_feedback` - AI analysis results
- `new_message` - New chat message
- `transcript_update` - Updated transcript
- `signal` - WebRTC signaling data
- `user_joined` - Participant joined
- `error` - Error occurred

### API Routes

**Debates:**
- `GET /api/debates` - List all debates
- `POST /api/debates` - Create new debate
- `GET /api/debates/[id]` - Get debate details
- `POST /api/debates/[id]` - Join debate (as Con)
- `PATCH /api/debates/[id]` - Update debate (remove participant)
- `DELETE /api/debates/[id]` - Delete debate

**Messages:**
- `GET /api/debates/[id]/messages` - Get debate messages
- `POST /api/debates/[id]/messages` - Send message

**AI Feedback:**
- `POST /api/debates/[id]/ai-feedback` - Manually trigger AI analysis

**Leaderboard:**
- `GET /api/leaderboard?range=week|month|all` - Get rankings

**User Sync:**
- `POST /api/sync-user` - Sync Clerk user to database

## 🎨 Key Components

### VideoDebateRoom
- Manages WebRTC peer connections
- Handles camera/microphone access
- Speech recognition integration
- Real-time transcript display
- Connection status monitoring

### useAdvancedSpeechRecognition Hook
- Browser Speech Recognition API wrapper
- Continuous listening with auto-restart
- Interim and final transcript separation
- Error handling and recovery
- Microphone permission management

### SocketContext
- Global Socket.IO connection
- Automatic reconnection
- Connection state management
- Used throughout the app

## 🔒 Security Features

- Clerk authentication for all user actions
- Database-level user verification
- Join codes for debate participation
- Only debate creator can delete debates
- Only Pro user can start debates
- Environment variables for sensitive keys

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

The custom server (`server.js`) handles:
- Next.js app serving
- Socket.IO WebSocket connections
- Debate lifecycle management
- AI feedback generation

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set up Clerk production keys
4. Configure OpenRouter API key
5. Deploy to hosting platform (Vercel, Railway, etc.)

## 🐛 Troubleshooting

### Speech Recognition Not Working
- **Browser Support**: Use Chrome, Edge, or Safari
- **Permissions**: Allow microphone access in browser settings
- **HTTPS**: Speech API requires secure context (localhost or HTTPS)
- **Check Console**: Look for speech recognition logs

### Video Not Connecting
- **Firewall**: Check if WebRTC ports are blocked
- **TURN Server**: May need TURN server for restrictive networks
- **Browser Permissions**: Allow camera/microphone access
- **Check Console**: Look for WebRTC connection logs

### Socket.IO Connection Issues
- **CORS**: Check server CORS configuration
- **Port**: Ensure port 3000 is accessible
- **Path**: Socket.IO uses `/api/socket.io` path
- **Check Console**: Look for socket connection logs

### AI Feedback Not Generating
- **API Key**: Verify OpenRouter API key is set
- **Credits**: Check OpenRouter account has credits
- **Network**: Ensure server can reach OpenRouter API
- **Timeout**: AI analysis can take 10-30 seconds

## 📝 Development Notes

### Custom Server
The app uses a custom Node.js server (`server.js`) instead of the default Next.js server to support Socket.IO WebSocket connections.

### Speech Recognition
- Uses browser's native Web Speech API
- Requires HTTPS in production (localhost works in dev)
- Chrome has the best support
- Continuous listening with auto-restart on errors

### WebRTC
- Peer-to-peer connection (no media server)
- Uses public STUN/TURN servers
- May need custom TURN server for production
- SimplePeer library simplifies WebRTC complexity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Clerk for authentication
- OpenRouter for AI API access
- SimplePeer for WebRTC wrapper
- Prisma for database tooling

---

**Built with ❤️ for intellectual discourse and debate**
