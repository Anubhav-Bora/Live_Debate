# 🎯 Live AI Debate Arena - Complete Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & How It Works](#architecture--how-it-works)
4. [Core Features](#core-features)
5. [User Flow](#user-flow)
6. [Database Design](#database-design)
7. [Key Components](#key-components)
8. [Real-Time Communication](#real-time-communication)
9. [AI Judging System](#ai-judging-system)
10. [Setup & Running](#setup--running)

---

## Project Overview

**Live AI Debate Arena** is a web-based platform where users can:
- 🎤 **Engage in live debates** with video/audio and text
- 🧠 **Get AI-powered feedback** on their arguments and performance
- 📊 **Track scores** on a global leaderboard
- 🏆 **Earn badges** and build their debate reputation

Think of it as a combination of:
- **Zoom** (video communication)
- **ChatGPT** (AI analysis)
- **League of Legends** (ranking system)

---

## Tech Stack

### Frontend Technologies
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework for fast web apps |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS** | Styling and responsive design |
| **Framer Motion** | Smooth animations |
| **Socket.io Client** | Real-time messaging |
| **Simple Peer** | Peer-to-peer video connection |
| **Clerk** | User authentication & management |

### Backend Technologies
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime |
| **Express / Next.js API** | Server handling |
| **Socket.io** | Real-time bidirectional communication |
| **Prisma ORM** | Database management |
| **PostgreSQL** | Main database |
| **OpenRouter API** | AI judging (GPT-4 calls) |

### Key Libraries
```json
{
  "socket.io": "Real-time debate updates",
  "simple-peer": "P2P video streaming",
  "@clerk/nextjs": "User authentication",
  "@prisma/client": "Database queries",
  "axios": "HTTP requests",
  "react-hot-toast": "Toast notifications",
  "lucide-react": "Icons",
  "framer-motion": "Animations"
}
```

---

## Architecture & How It Works

### System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LIVE AI DEBATE ARENA                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐          ┌──────────────────┐
│  Pro Player      │          │  Con Player      │
│  (Browser)       │          │  (Browser)       │
└────────┬─────────┘          └────────┬─────────┘
         │                             │
         │     Socket.io Connection    │
         └──────────────────┬──────────┘
                            │
                            ▼
         ┌──────────────────────────────────┐
         │   WebSocket Server (server.js)   │
         │  - Manages debate sessions       │
         │  - Routes messages               │
         │  - Tracks transcripts            │
         └──────────────┬───────────────────┘
                        │
         ┌──────────────┴──────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────┐            ┌────────────────────┐
    │ PostgreSQL  │            │  OpenRouter API    │
    │ Database    │            │  (GPT-4 AI)        │
    │             │            │  - Judges debate   │
    └─────────────┘            │  - Scores players  │
                               └────────────────────┘
```

### Request Flow

```
1. USER JOINS DEBATE
   ├─ Authenticate via Clerk
   ├─ Create/join debate in database
   └─ Connect to WebSocket

2. DEBATE STARTS
   ├─ Both players connect via SimplePeer (P2P video)
   ├─ Chat messages sent through WebSocket
   ├─ Voice converted to text (Web Speech API)
   └─ Transcripts stored in memory

3. DEBATE ENDS (After 3 minutes)
   ├─ Collect all transcripts and messages
   ├─ Send to OpenRouter API (GPT-4)
   ├─ AI analyzes and scores both players
   ├─ Save scores to database
   └─ Update leaderboard

4. RESULTS SHOWN
   ├─ AI feedback displayed
   ├─ Scores shown on leaderboard
   └─ Badges earned if applicable
```

---

## Core Features

### 1. 🎥 Real-Time Debate
- **Video Chat**: Using SimplePeer for P2P connection
- **Text Chat**: WebSocket-based messaging
- **Voice-to-Text**: Browser's Web Speech API
- **3-Minute Timer**: Auto-ends debate

### 2. 🧠 AI Feedback System
- **Transcript Analysis**: AI reads what was said
- **Scoring**: Grades on logic, clarity, persuasiveness, tone
- **Feedback**: Detailed analysis with improvements
- **No Manual Review**: All automated

### 3. 📊 Leaderboard & Ranking
- **Global Scores**: Top debaters ranked
- **Score Calculation**: Average of all metrics
- **Debate Count**: How many debates participated
- **Badges**: Achievements for milestones

### 4. 👤 User Profiles
- **Debate History**: All past debates visible
- **Statistics**: Win rate, average score
- **Badges Earned**: Achievements displayed
- **Public/Private**: Choose visibility

---

## User Flow

### Flow Chart: From Sign Up to Leaderboard

```
START
  │
  ▼
SIGN UP / SIGN IN (via Clerk)
  │
  ├─ Username created
  ├─ Email verified
  └─ Profile initialized
  │
  ▼
HOME PAGE - Choose Action
  ├─ CREATE DEBATE ──────────┐
  ├─ BROWSE DEBATES ─────────├─ DEBATE SETUP
  └─ VIEW LEADERBOARD       │
                            ▼
              DEBATE CREATED
              ├─ Share debate ID/code
              ├─ Wait for opponent
              └─ Both confirmed?
                            │
                            ▼ YES
              DEBATE STARTS (3 min timer)
              ├─ Speak → Transcript created
              ├─ Chat messages
              ├─ Both participate? ◄─ NO ──┐
              └─ Timer expires            │
                            │             │
                            ▼             │
              DEBATE ENDED              │
              ├─ Collect transcripts     │
              ├─ Send to AI (GPT-4)      │
              ├─ AI scores both          │
              └─ Save scores to DB       │
                            │            │
                            ▼            │
              RESULTS PAGE              │
              ├─ AI feedback shown       │
              ├─ Your score: 7/10        │
              ├─ Opponent score: 6/10    │
              └─ Badges earned?          │
                            │            │
                            ▼            ▼
              LEADERBOARD UPDATED
              ├─ Your rank changed
              ├─ New score added
              └─ Show status (Joined/Incomplete)

              END
```

### Step-by-Step: Creating & Joining a Debate

**Step 1: Create Debate**
```
Click "Create Debate" → Enter topic → Set duration → Publish
Result: Unique debate ID generated, shareable link created
```

**Step 2: Share & Wait**
```
Share debate ID → Opponent enters ID → "Waiting for opponent"
Result: When opponent joins, both see "Ready to Start"
```

**Step 3: Start Debate**
```
Both click "Start" → Video connects → Timer begins
Result: 3-minute debate session begins
```

**Step 4: Speak & Chat**
```
Speak into microphone → Text appears in chat
Type messages → Other player sees instantly
Result: Transcripts collected, messages stored
```

**Step 5: Debate Ends**
```
Timer expires → AI analyzes → Scores calculated
Result: Scores saved to leaderboard
```

---

## Database Design

### Database Schema Overview

```
User (stores all users)
├─ id, clerkId, username, email
├─ created debates
├─ participated in debates (pro/con)
└─ earned badges

Debate (stores debate sessions)
├─ id, topic, duration, status
├─ creator, proUser, conUser
├─ aiFeedback (JSON with scores)
├─ start/end times
└─ participants' join codes

Message (chat during debate)
├─ id, content, role
├─ senderId, debateId
└─ timestamp

Score (AI scoring results)
├─ userId, debateId
├─ logic (1-10)
├─ clarity (1-10)
├─ persuasiveness (1-10)
├─ tone (1-10)
└─ timestamp

Badge (achievement system)
├─ id, name, description
├─ criteria (JSON)
└─ icon

UserBadge (tracks earned badges)
├─ userId, badgeId
└─ earnedAt timestamp

Vote (user voting)
├─ userId, debateId
├─ winner choice
└─ timestamp
```

### Relationships

```
User has many Scores
User has many Messages
User has many Debates (as creator/pro/con)
User has many Badges (through UserBadge)

Debate has one creator (User)
Debate has one Pro player (User)
Debate has optional Con player (User)
Debate has many Messages
Debate has many Scores
Debate has many Votes

Score belongs to User and Debate
Message belongs to User and Debate
```

---

## Key Components

### Frontend Components

#### 1. **VideoDebateRoom.tsx** - Main Debate Interface
```
Purpose: Where the actual debate happens
├─ Video streaming (SimplePeer)
├─ Chat display
├─ Voice-to-text
├─ Timer countdown
└─ Real-time transcript

Tech Used:
├─ SimplePeer for P2P video
├─ Socket.io for messaging
├─ Web Speech API for voice
└─ Framer Motion for animations
```

#### 2. **DebateRoom.tsx** - Setup & Waiting
```
Purpose: Before debate starts
├─ Show debate topic
├─ Share join codes
├─ Wait for opponent
├─ Confirm ready
└─ Show participant status

Tech Used:
├─ Prisma queries
├─ Socket.io events
└─ State management (React hooks)
```

#### 3. **Navbar.tsx** - Navigation
```
Purpose: Top navigation
├─ User profile dropdown
├─ Home link
├─ Search debates
└─ Leaderboard link

Tech Used:
├─ Clerk user info
├─ Next.js Link
└─ React hooks
```

#### 4. **AIFeedback.tsx** - Results Display
```
Purpose: Show AI analysis after debate
├─ Your score breakdown
├─ Opponent's score
├─ Mistakes identified
├─ Improvement suggestions
└─ Feedback paragraph

Tech Used:
├─ JSON parsing (aiFeedback)
├─ Formatting and display
└─ React components
```

#### 5. **useAdvancedSpeechRecognition.ts** - Speech to Text Hook
```
Purpose: Convert voice to text
├─ Detect microphone availability
├─ Request permissions
├─ Process speech
├─ Handle errors
└─ Return transcript

Tech Used:
├─ Web Speech API
├─ Browser native (no external API)
├─ React hooks
└─ Error handling
```

### Backend Components

#### 1. **server.js** - Main WebSocket Server
```
Purpose: Handle real-time communication
├─ Socket.io setup
├─ Debate session management
├─ Transcript collection
├─ Timer management
├─ AI feedback calling
└─ Score saving

Key Functions:
├─ joinDebate() - User joins
├─ startDebate() - Begin countdown
├─ transcript_update - Save speech
├─ endDebate() - Process results
└─ getAIFeedback() - Call AI API
```

#### 2. **API Routes** - REST Endpoints
```
/api/debates
├─ POST: Create debate
├─ GET: List debates
└─ [id]/
   ├─ GET: Get debate details
   ├─ PUT: Update status
   └─ messages/
      ├─ POST: Send message
      └─ GET: Get message history

/api/users
├─ POST: Sync user profile
└─ [userId]/
   └─ GET: Get user profile

/api/leaderboard
├─ GET: Get rankings
└─ Query: Filter by date range

/api/ai-feedback
├─ POST: Get AI analysis

/api/vote
├─ POST: Submit debate vote
```

#### 3. **Prisma Client** - Database Layer
```
Purpose: Safe database queries
├─ Type-safe queries
├─ Migrations for schema changes
├─ Connection pooling
└─ Query logging (development)
```

---

## Real-Time Communication

### Socket.io Events

#### Events from Client → Server

```javascript
// Player joins debate
socket.emit('join_debate', {
  debateId: string,
  userId: string,
  role: 'pro' | 'con'
})

// Player starts debate
socket.emit('start_debate', {
  debateId: string
})

// Transcript update (speech recognition)
socket.emit('transcript_update', {
  debateId: string,
  userId: string,
  transcript: string,
  isFinal: boolean
})

// Chat message
socket.emit('message', {
  debateId: string,
  userId: string,
  content: string,
  role: 'pro' | 'con'
})

// Leave debate
socket.emit('leave_debate', {
  debateId: string
})
```

#### Events from Server → Client

```javascript
// User joined room
socket.on('user_joined', {
  userId: string,
  role: 'pro' | 'con'
})

// Debate started
socket.on('debate_started', {
  startTime: DateTime,
  duration: number
})

// New message received
socket.on('new_message', {
  userId: string,
  username: string,
  content: string,
  timestamp: DateTime
})

// Transcript received
socket.on('transcript_received', {
  userId: string,
  transcript: string
})

// Debate feedback (results)
socket.on('debate_feedback', {
  pro: {
    score: number,
    logic: number,
    clarity: number,
    persuasiveness: number,
    tone: number,
    mistakes: string[],
    improvements: string[],
    feedback: string
  },
  con: { /* same structure */ },
  debateId: string
})

// Debate ended
socket.on('debate_ended', {
  endTime: DateTime,
  finalStatus: string
})

// User left
socket.on('user_left', {
  userId: string,
  role: 'pro' | 'con'
})
```

### Message Flow Example

```
User speaks:
┌─────────┐
│ Browser │─── Web Speech API ──→ Converts voice to text
└─────────┘
    │
    ├─ "The AI will improve efficiency"
    │
    ▼
┌─────────────────┐
│ Socket.io emit  │─── transcript_update event
│ 'transcript'    │
└─────────────────┘
    │
    ▼
┌──────────────┐
│ server.js    │─── Store in debateTranscripts[debateId]
│ memory store │
└──────────────┘
    │
    ▼
┌──────────────────┐
│ Socket.io emit   │─── Broadcast to other players
│ 'transcript_recv'│
└──────────────────┘
    │
    ▼
┌──────────────┐
│ Other browser│─── Display transcript in chat
└──────────────┘
```

---

## AI Judging System

### How AI Judges a Debate

#### Step 1: Collection
```
When debate ends (after 3 minutes):
├─ Collect Pro player's transcript
├─ Collect Con player's transcript
├─ Collect all chat messages
└─ Check if both players joined
```

#### Step 2: Prepare Data
```
Create AI prompt:
├─ "Pro player said: ..."
├─ "Con player said: ..."
├─ "Chat messages: ..."
├─ "Rate on scale 1-10:"
│  ├─ Logic (soundness of arguments)
│  ├─ Clarity (how well expressed)
│  ├─ Persuasiveness (convincingness)
│  └─ Tone (professionalism)
└─ "Provide JSON response"
```

#### Step 3: Call OpenRouter API
```
POST https://openrouter.ai/api/v1/chat/completions

Headers:
├─ Authorization: Bearer YOUR_OPENROUTER_API_KEY
└─ Content-Type: application/json

Body:
{
  "model": "openai/gpt-4-turbo",
  "messages": [{
    "role": "user",
    "content": "<AI prompt with debate data>"
  }]
}
```

#### Step 4: Parse Response
```
AI returns JSON:
{
  "pro": {
    "score": 7,
    "logic": 7,
    "clarity": 8,
    "persuasiveness": 6,
    "tone": 7,
    "mistakes": ["Used incorrect statistic", "..."],
    "improvements": ["Add sources", "..."],
    "feedback": "Your arguments were logical but could be more persuasive..."
  },
  "con": { /* same structure */ }
}
```

#### Step 5: Save to Database
```
For both Pro and Con players:
├─ Create Score record with:
│  ├─ userId
│  ├─ debateId
│  ├─ logic score
│  ├─ clarity score
│  ├─ persuasiveness score
│  └─ tone score
├─ Save aiFeedback JSON to Debate record
└─ Update user ranking
```

#### Step 6: Display Results
```
Send to both players:
├─ Your score: 7/10
├─ Opponent score: 7/10
├─ Breakdown of scores
├─ Mistakes you made
├─ How to improve
└─ Leaderboard updated
```

### AI Response Format

```typescript
interface AIFeedback {
  pro: {
    score: number;              // Overall score 1-10
    logic: number;              // How sound the arguments
    clarity: number;            // How well expressed
    persuasiveness: number;     // How convincing
    tone: number;               // Professionalism
    mistakes: string[];         // Array of errors
    improvements: string[];     // Suggestions
    feedback: string;           // Detailed analysis
  };
  con: {
    // Same as pro
  };
}
```

---

## Setup & Running

### Prerequisites
```
- Node.js (v18+)
- PostgreSQL database
- Clerk account (for authentication)
- OpenRouter API key (for AI judging)
```

### Installation Steps

#### 1. Clone Repository
```bash
git clone https://github.com/Anubhav-Bora/Live_Debate.git
cd live-ai-debate-arena
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Environment Setup
Create `.env.local` file:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/debate_arena"

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_public_key"
CLERK_SECRET_KEY="your_clerk_secret_key"

# OpenRouter (AI Judging)
OPENROUTER_API_KEY="your_openrouter_api_key"

# Optional
NODE_ENV="development"
PORT=3000
```

#### 4. Database Setup
```bash
# Run migrations
npm run deploy

# Or for development with Prisma Studio
npx prisma migrate dev --name init
```

#### 5. Run Development Server
```bash
# Start dev server with WebSocket
npm run dev

# Server runs on http://localhost:3000
```

#### 6. Build for Production
```bash
npm run build
npm start
```

### Environment Variables Explained

| Variable | Purpose | Where to Get |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Your database provider (Neon, Supabase, etc.) |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend key | Clerk dashboard |
| `CLERK_SECRET_KEY` | Clerk backend key | Clerk dashboard (secret) |
| `OPENROUTER_API_KEY` | AI API access | OpenRouter dashboard |

### Troubleshooting

**Issue: "Cannot find module 'next'"**
```bash
# Solution: Install dependencies
npm install
```

**Issue: "Database connection failed"**
```bash
# Check DATABASE_URL in .env.local
# Ensure PostgreSQL is running
# Test connection: psql postgresql://user:password@localhost:5432/dbname
```

**Issue: "Clerk authentication not working"**
```bash
# Verify CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
# Check Clerk dashboard for correct keys
# Restart server after env changes
```

**Issue: "AI feedback not generating"**
```bash
# Verify OPENROUTER_API_KEY is set
# Check OpenRouter account has credits
# Look at server logs for API errors
```

---

## Common Code Patterns

### Creating a Debate (Frontend)
```typescript
const createDebate = async (topic: string) => {
  const response = await fetch('/api/debates', {
    method: 'POST',
    body: JSON.stringify({
      topic,
      duration: 180,
      userId: currentUser.id
    })
  });
  
  const debate = await response.json();
  router.push(`/debates/${debate.id}`);
};
```

### Sending Transcript (Frontend)
```typescript
socket.emit('transcript_update', {
  debateId: currentDebateId,
  userId: currentUser.id,
  transcript: recognizedText,
  isFinal: true
});
```

### Processing Debate End (Backend)
```javascript
// In server.js
const endDebate = async (debateId, io) => {
  // Get debate and participants
  const debate = await prisma.debate.findUnique({
    where: { id: debateId },
    include: { proUser: true, conUser: true }
  });
  
  // Get transcripts and messages
  const transcripts = debateTranscripts[debateId] || {};
  const messages = await prisma.message.findMany({
    where: { debateId }
  });
  
  // Call AI for feedback
  const aiFeedback = await getAIFeedback(messages, transcripts);
  
  // Save scores
  await prisma.score.create({
    data: {
      userId: debate.proUser.id,
      debateId,
      logic: aiFeedback.pro.logic,
      clarity: aiFeedback.pro.clarity,
      persuasiveness: aiFeedback.pro.persuasiveness,
      tone: aiFeedback.pro.tone
    }
  });
  
  // Emit results to clients
  io.to(`debate_${debateId}`).emit('debate_feedback', aiFeedback);
};
```

### Querying Leaderboard (Backend)
```typescript
// In /api/leaderboard route
const scores = await prisma.score.findMany({
  include: { user: true },
  orderBy: { createdAt: 'desc' }
});

// Calculate rankings
const leaderboard = scores
  .reduce((acc, score) => {
    // Group by user
  }, {})
  .sort((a, b) => b.totalScore - a.totalScore);
```

---

## Key Takeaways

### How Everything Works Together

```
1️⃣ USER AUTHENTICATION
   └─ Clerk handles login/signup
   
2️⃣ DEBATE CREATION
   └─ Stored in PostgreSQL via Prisma
   
3️⃣ REAL-TIME CONNECTION
   └─ Socket.io connects players
   
4️⃣ VIDEO STREAMING
   └─ SimplePeer does P2P connection
   
5️⃣ SPEECH TO TEXT
   └─ Web Speech API (no cost)
   
6️⃣ AI JUDGING
   └─ OpenRouter API calls GPT-4
   
7️⃣ SCORING SYSTEM
   └─ Saves scores to database
   
8️⃣ LEADERBOARD
   └─ Ranks users by average score
```

### Technology Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js + React | Fast, modern UI |
| **Styling** | Tailwind CSS | Quick responsive design |
| **Real-time** | Socket.io | Live updates |
| **Video** | SimplePeer | Peer-to-peer streaming |
| **Voice** | Web Speech API | Free, browser native |
| **Auth** | Clerk | Secure, easy to use |
| **Database** | PostgreSQL + Prisma | Reliable, type-safe |
| **AI** | OpenRouter + GPT-4 | Accurate judging |
| **Backend** | Node.js + Express | JavaScript full-stack |

---

## Next Steps / Future Features

Potential improvements:
- [ ] Record debates as videos
- [ ] More detailed analytics dashboard
- [ ] Team debates (2v2)
- [ ] Debate tournaments
- [ ] Mobile app
- [ ] Advanced AI with custom judges
- [ ] Multiple debate formats
- [ ] Integration with social media

---

## Support & Resources

- **Clerk Docs**: https://clerk.com/docs
- **Socket.io Docs**: https://socket.io/docs/
- **Prisma Docs**: https://www.prisma.io/docs/
- **Next.js Docs**: https://nextjs.org/docs
- **OpenRouter Docs**: https://openrouter.ai/docs
- **TailwindCSS**: https://tailwindcss.com/docs

---

## Summary

**Live AI Debate Arena** is a full-stack web application that combines:
- Real-time video communication (SimplePeer)
- Automatic transcription (Web Speech API)
- AI-powered analysis (OpenRouter + GPT-4)
- Persistent scoring system (PostgreSQL + Prisma)
- Global rankings and achievements

It's built with modern technologies and is designed to be fast, scalable, and user-friendly. The entire system is automated - from debate hosting to AI judging to score tracking.

---

**Last Updated**: October 2025
**Version**: 1.0
**Status**: ✅ Production Ready
