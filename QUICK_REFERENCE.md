# 🚀 Quick Reference Guide - Live AI Debate Arena

## At a Glance

### What is This Project?
A web platform where users debate with each other in real-time, get AI feedback, and compete on a leaderboard.

### In 60 Seconds
```
1. User creates/joins debate
2. Both players speak (voice-to-text)
3. Debate ends after 3 minutes
4. AI analyzes everything
5. Scores saved & leaderboard updated
```

---

## Architecture in 3 Parts

### Part 1: Frontend (What Users See)
```
┌─────────────────────────────────┐
│     Next.js React App           │
├─────────────────────────────────┤
│ Pages:                          │
│ - Home page                     │
│ - Create debate page            │
│ - Video debate room             │
│ - Leaderboard                   │
│ - Profile page                  │
└─────────────────────────────────┘
```

**Tech**: Next.js, TypeScript, Tailwind, Framer Motion

### Part 2: Real-Time Server (Connection Layer)
```
┌─────────────────────────────────┐
│     WebSocket Server            │
│     (server.js + Socket.io)     │
├─────────────────────────────────┤
│ Manages:                        │
│ - Live connections              │
│ - Message routing               │
│ - Transcript collection         │
│ - Debate timing                 │
└─────────────────────────────────┘
```

**Tech**: Node.js, Socket.io, Express

### Part 3: Data & AI (Backend)
```
┌─────────────────────────────────┐
│     PostgreSQL Database         │
│     + OpenRouter AI API         │
├─────────────────────────────────┤
│ Stores:                         │
│ - User profiles                 │
│ - Debates                       │
│ - Scores & rankings             │
│                                 │
│ Processes:                      │
│ - AI judging                    │
│ - Score calculation             │
└─────────────────────────────────┘
```

**Tech**: PostgreSQL, Prisma, OpenRouter (GPT-4)

---

## User Journey - Simple Version

```
SIGN UP
  ↓
HOME PAGE (Choose action)
  ├─ CREATE DEBATE
  ├─ BROWSE DEBATES
  └─ VIEW LEADERBOARD
  ↓
JOIN/CREATE DEBATE
  ├─ Enter debate topic
  ├─ Get unique code
  └─ Share with opponent
  ↓
OPPONENT JOINS
  ├─ Click ready
  ├─ Both confirm
  └─ Debate starts
  ↓
DEBATE TIME (3 minutes)
  ├─ Speak → Transcript
  ├─ Chat messages
  └─ Timer counts down
  ↓
DEBATE ENDS
  ├─ Transcripts collected
  ├─ Sent to AI
  └─ AI scores both
  ↓
RESULTS SHOWN
  ├─ Your score: 7/10
  ├─ Opponent score: 6/10
  ├─ AI feedback
  └─ Leaderboard updated
  ↓
NEXT DEBATE (Repeat)
```

---

## Tech Stack Quick Lookup

### Frontend
| Need | Technology |
|------|-----------|
| Web app framework | Next.js 15 |
| UI styling | Tailwind CSS |
| Animations | Framer Motion |
| Video streaming | SimplePeer |
| Real-time messaging | Socket.io |
| Voice-to-text | Web Speech API (free!) |
| State management | React Hooks |
| User auth | Clerk |

### Backend
| Need | Technology |
|------|-----------|
| Server runtime | Node.js |
| HTTP server | Express (via Next.js) |
| WebSocket | Socket.io |
| Database | PostgreSQL |
| ORM | Prisma |
| AI API | OpenRouter + GPT-4 |
| API calls | Axios, fetch |

### Database
```
Users → Have → Debates (as Pro, Con, or Creator)
         Have → Scores (one per debate)
         Have → Badges (achievements)

Debates → Have → Messages (chat)
          Have → Scores
          Have → Votes

Scores → Calculated from AI feedback
         Stored per user per debate
         Used for leaderboard ranking
```

---

## Key Flows Explained

### Flow 1: User Joins Debate
```
Browser                    Server                  Database
   │                         │                         │
   ├─ Click "Join Debate" ──→│                         │
   │                         ├─ Check debate exists ──→│
   │                         │←─ Debate found ────────┤
   │                         ├─ Create Socket room    │
   │←─ Connected ────────────┤                         │
   │                         ├─ Update status ───────→│
   │  (WebSocket)            │←─ Updated ────────────┤
   │                         │
```

### Flow 2: Speech Gets Saved
```
Browser (Microphone)              Server            Database
   │                                │                │
   ├─ User speaks                   │                │
   ├─ Web Speech API converts       │                │
   │  to text                       │                │
   ├─ "AI is the future" ──────────→│                │
   │  (transcript_update)           │                │
   │                                ├─ Store in ────┐│ (when debate ends)
   │                                │  memory        ││
   │←─ Confirmation ────────────────┤                │
   │                                ├─ Broadcast ──→│ Other player
```

### Flow 3: Debate Ends (Most Important!)
```
Timer expires
   ↓
Server detects debate_end time
   ↓
Collect all data:
├─ Pro transcript
├─ Con transcript
├─ All chat messages
└─ Check both joined
   ↓
Send to OpenRouter API:
{
  "model": "gpt-4",
  "prompt": "<All debate data>"
}
   ↓
AI responds with scores:
{
  "pro": {
    "logic": 7,
    "clarity": 8,
    ...
  }
}
   ↓
Save to database:
├─ Store scores
├─ Store feedback
└─ Update user rankings
   ↓
Send to clients:
"Your score: 7/10"
"Leaderboard updated"
```

---

## File Structure Overview

```
live-ai-debate-arena/
│
├─ src/
│  ├─ app/
│  │  ├─ page.tsx (Home)
│  │  ├─ api/
│  │  │  ├─ debates/
│  │  │  ├─ users/
│  │  │  ├─ leaderboard/
│  │  │  └─ ai-feedback/
│  │  ├─ debates/
│  │  │  ├─ create/
│  │  │  ├─ [id]/ (Debate page)
│  │  │  └─ page.tsx (Browse)
│  │  └─ leaderboard/
│  │
│  ├─ components/
│  │  ├─ VideoDebateRoom.tsx (Main debate UI)
│  │  ├─ DebateRoom.tsx (Setup)
│  │  ├─ AIFeedback.tsx (Results)
│  │  ├─ Navbar.tsx
│  │  └─ ui/ (Reusable components)
│  │
│  ├─ hooks/
│  │  └─ useAdvancedSpeechRecognition.ts
│  │
│  ├─ lib/
│  │  └─ prisma.ts
│  │
│  └─ types/
│     └─ Debate.ts
│
├─ prisma/
│  ├─ schema.prisma (Database structure)
│  └─ migrations/
│
├─ server.js (WebSocket server - IMPORTANT!)
├─ next.config.ts
├─ package.json
├─ .env.local (Your secrets)
└─ tsconfig.json
```

---

## Important Files & Their Purpose

| File | What It Does | Why It's Important |
|------|------------|-------------------|
| `server.js` | Manages WebSocket, runs AI, saves scores | Heart of real-time system |
| `src/components/VideoDebateRoom.tsx` | Debate video interface | What users see during debate |
| `src/hooks/useAdvancedSpeechRecognition.ts` | Voice-to-text | Converts speech to transcript |
| `prisma/schema.prisma` | Database structure | Defines all data models |
| `src/app/api/debates/route.ts` | Create/list debates | Debate management |
| `src/app/api/leaderboard/route.ts` | Get rankings | Shows scores & rankings |
| `.env.local` | Configuration secrets | Database, AI keys, auth |

---

## Common Tasks

### Task 1: Change Debate Duration
```typescript
// In: src/app/api/debates/route.ts or VideoDebateRoom.tsx

// Current: 180 seconds (3 minutes)
const DEBATE_DURATION = 180;

// Change to 5 minutes:
const DEBATE_DURATION = 300;
```

### Task 2: Add New Score Metric
```typescript
// In: prisma/schema.prisma

model Score {
  // Add new field:
  newMetric Float  // New score type
}

// Then run:
// npx prisma migrate dev --name add_new_metric
```

### Task 3: Change AI Model
```javascript
// In: server.js, getAIFeedback() function

// Current:
const model = "openai/gpt-4-turbo";

// Change to cheaper:
const model = "openai/gpt-3.5-turbo";
```

### Task 4: Debug WebSocket Issues
```javascript
// In: server.js, add logs

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Check browser console & server logs
```

---

## Environment Variables You Need

```env
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/live_debate

# Clerk (Sign-in/Sign-up)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# OpenRouter API (AI Judging)
OPENROUTER_API_KEY=sk-or-...

# Optional
NODE_ENV=development
PORT=3000
```

### How to Get Each:

**DATABASE_URL**
- Use Neon (free PostgreSQL): https://console.neon.tech
- Or Railway: https://railway.app
- Or local PostgreSQL

**CLERK Keys**
- Sign up: https://clerk.com
- Go to Settings → API Keys
- Copy both keys

**OPENROUTER_API_KEY**
- Sign up: https://openrouter.ai
- Go to Settings → API Key
- Copy API key

---

## Debugging Checklist

### Issue: Debate doesn't start
- [ ] Check WebSocket connected (browser console)
- [ ] Check server.js logs
- [ ] Verify both players joined
- [ ] Check database for debate record

### Issue: AI feedback not showing
- [ ] Check OPENROUTER_API_KEY set in .env
- [ ] Check server logs for API errors
- [ ] Verify debate has content (transcripts)
- [ ] Check if both players participated

### Issue: Voice not converting to text
- [ ] Check microphone permissions granted
- [ ] Check browser supports Web Speech API
- [ ] Look at browser console for errors
- [ ] Try Chrome/Edge (best support)

### Issue: Leaderboard not updating
- [ ] Check scores saved to database
- [ ] Run: `npx prisma studio` to inspect
- [ ] Check no database errors in logs
- [ ] Verify Score table has records

---

## Performance Tips

1. **WebSocket**: Keep rooms small (2 players per debate)
2. **Database**: Index frequently queried fields
3. **AI Calls**: Cache responses if same topic asked
4. **Video**: Limit bitrate for mobile users
5. **Frontend**: Lazy load debate pages

---

## Testing the System

### Manual Test: Full Debate Cycle
```
1. Create account
2. Create debate titled "Test Topic"
3. Copy debate ID
4. Open in another browser/incognito
5. Join with same debate ID
6. Both click ready
7. Speak for 1 minute each
8. Wait for debate to end
9. Check AI feedback appears
10. Check leaderboard updated
```

### Check Logs
```bash
# Terminal 1: Server logs
npm run dev
# Watch for: ✅ logs (success) and ❌ logs (errors)

# Terminal 2: Prisma Studio
npx prisma studio
# View database records in real-time
```

---

## Deployment (Quick Version)

```bash
# Build
npm run build

# Test build
npm start

# Deploy to Vercel (recommended for Next.js)
npx vercel

# Or deploy to Heroku
git push heroku main
```

Remember to set environment variables on your hosting platform!

---

## Summary

**What**: Real-time debate platform with AI judging
**How**: WebSocket + Video streaming + AI analysis
**Why**: Improve debate skills with AI feedback
**Tech**: Next.js + Node.js + PostgreSQL + OpenRouter AI

---

**Questions?** Check PROJECT_DOCUMENTATION.md for detailed info!
