# 🏗️ System Architecture & Flow Diagrams

## Complete System Architecture

```
                          🌐 FRONTEND (Next.js React)
         ┌────────────────────────────────────────────────────────┐
         │                                                        │
         │  Home Page      Browse       Debate       Leaderboard │
         │     │            │           Room            │        │
         │     │            │            │              │        │
         └─────┼────────────┼────────────┼──────────────┼────────┘
               │            │            │              │
               └────────────┼────────────┼──────────────┘
                            │            │
                    Socket.io WebSocket Connection
                            │            │
         ┌──────────────────┼────────────┼────────────────────────┐
         │                  │            │                        │
         │         🔥 WebSocket Server (server.js)               │
         │                  │            │                        │
         │    ┌─────────────┼────────────┼─────────────┐         │
         │    │ Connection  │ Message    │ Debate      │         │
         │    │ Manager     │ Router     │ Orchestrator│         │
         │    └─────────────┼────────────┼─────────────┘         │
         │                  │            │                        │
         │    ┌─────────────────────────────────────────────┐    │
         │    │  In-Memory Storage                         │    │
         │    │  - debateTranscripts[debateId]             │    │
         │    │  - debateMessages[debateId]                │    │
         │    │  - debateTimeouts[debateId]                │    │
         │    └─────────────────────────────────────────────┘    │
         │                  │            │                        │
         └──────────────────┼────────────┼────────────────────────┘
                            │            │
               ┌────────────┴┐      ┌────┴──────────────┐
               │             │      │                   │
         ┌─────▼──────┐  ┌───▼──────▼──┐      ┌──────────▼─────┐
         │ PostgreSQL │  │ OpenRouter   │      │  SimplePeer    │
         │ Database   │  │ API (GPT-4)  │      │  (P2P Video)   │
         │            │  │              │      │                │
         │ Users      │  │ AI Feedback  │      │ Direct video   │
         │ Debates    │  │ & Scoring    │      │ streaming      │
         │ Messages   │  │              │      │ between players│
         │ Scores     │  └──────────────┘      └────────────────┘
         │ Badges     │
         │ Votes      │
         └────────────┘
```

## User Journey - Detailed Flow

### Phase 1: Setup & Connection

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: SETUP                           │
└─────────────────────────────────────────────────────────────┘

PLAYER 1                        SERVER                    DATABASE
   │                              │                          │
   ├─ Sign in (Clerk) ──────────→ │                          │
   │                              ├─ Auth verified ─────────→ │
   │                              │←─ User data ────────────┤ │
   │←─ Authenticated ─────────────┤                          │
   │                              │                          │
   ├─ Create Debate ──────────────→│                          │
   │  ("AI Ethics")               ├─ Validate ──────────────→ │
   │                              │←─ Stored ──────────────┤ │
   │                              ├─ Generate ID           │ │
   │←─ Debate Created ────────────┤                        │ │
   │  ID: abc123                  │                        │ │
   │  Share code                  │                        │ │
   │                              │                        │ │
   ├─ Join Debate ──────────────→ │←─ Broadcast Event ────┐ │
   │  (Connect WebSocket)         │   "debate_created"    │ │
   │                              │                      │ │
   │←─ WebSocket Connected ───────┤                      │ │
   │  (Socket ID: sock_1)         │                      │ │
   │                              │                      │ │

                               PLAYER 2 RECEIVES EVENT
                                    │
                               Sees debate
                               Joins with code

   ├─ Join Debate ──────────────→ │←─ Broadcast Event ────┐
   │  (PLAYER 2 joins)            │   "player_joined"     │
   │                              │                      │ │
   │←─ User joined ──────────────┤                      │ │
   │  (Shows opponent name)       │                      │ │
   │                              │                      │ │
```

### Phase 2: Debate Starts

```
┌─────────────────────────────────────────────────────────────┐
│                  PHASE 2: DEBATE BEGINS                     │
└─────────────────────────────────────────────────────────────┘

PLAYER 1          SERVER           PLAYER 2         SIMPLEPEER
   │                │                 │                 │
   ├─ Click Start ──→│                 │                 │
   │                 │←─ Broadcast ───→├─ Start signal ─→│
   │                 │   "debate_start" │                 │
   │                 │                  │←─ Offer ──────┐ │
   │                 │  (3 min timer)   │   (P2P SDP)  │ │
   │                 │  starts          │            │  │
   │←─ Ready ────────┤                  │            │  │
   │   (Start video) │                  │            │  │
   │   │             │                  │            │  │
   │   └─ Negotiate ─────────────────────────────────→  │
   │     (P2P setup)                    │            │  │
   │   ←──────────────────────────────────────────────  │
   │     (Video stream)                 │            │  │
   │                                    │            │  │
   │ ══════════ VIDEO CONNECTED ══════════════════════ │
   │                │                                   │
```

### Phase 3: Debate (Voice-to-Text)

```
┌─────────────────────────────────────────────────────────────┐
│                 PHASE 3: DEBATE HAPPENS                     │
└─────────────────────────────────────────────────────────────┘

PLAYER 1 (SPEAKS)
   │
   ├─ Microphone listens
   │  (Web Speech API)
   │
   ├─ "The AI revolution..."
   │
   ├─ Recognizes 3 words
   │  │ "The"
   │  │ "AI"
   │  │ "revolution..."
   │
   ├─ Convert → Text
   │  (interim_transcript)
   │
   └─→ Send via Socket.io
      {
        "event": "transcript_update",
        "transcript": "The AI revolution",
        "isFinal": false
      }
           │
           ▼
       SERVER
       │ Stores in memory:
       │ debateTranscripts[abc123].pro = "The AI revolution..."
       │
       └─→ Broadcast to PLAYER 2
          {
            "event": "transcript_received",
            "speaker": "pro",
            "text": "The AI revolution"
          }
           │
           ▼
       PLAYER 2 (SEES TEXT)
       ├─ Transcript appears in chat
       ├─ Shows in real-time
       └─ Stores locally for context

    ═══════ SAME HAPPENS FOR PLAYER 2 ═══════
    
    ═══════ AND REPEATING EVERY 3-5 SECONDS ═══════
```

### Phase 4: Debate Ends (The Big Event!)

```
┌─────────────────────────────────────────────────────────────┐
│              PHASE 4: DEBATE ENDS & AI JUDGES               │
└─────────────────────────────────────────────────────────────┘

  TIMER EXPIRES (3 minutes)
         │
         ▼
    SERVER DETECTS
    endDebate() called
         │
         ├─ Step 1: Collect Data
         │  ├─ Get proUser transcript: "AI will help..."
         │  ├─ Get conUser transcript: "But risks exist..."
         │  └─ Get all messages: [msg1, msg2, msg3...]
         │
         ├─ Step 2: Check Participants
         │  ├─ proUser: Alice ✓
         │  └─ conUser: Bob ✓
         │
         ├─ Step 3: Build AI Prompt
         │  ├─ "Pro player (Alice) said: AI will help..."
         │  ├─ "Con player (Bob) said: But risks exist..."
         │  ├─ "Messages: ..."
         │  └─ "Rate each on 1-10 for: logic, clarity,
         │     persuasiveness, tone"
         │
         ├─ Step 4: Call AI API
         │  │
         │  └─→ OPENROUTER.AI (HTTP POST)
         │      ┌─────────────────────────────────────┐
         │      │  OpenRouter API Gateway             │
         │      │  ├─ Model: gpt-4-turbo              │
         │      │  ├─ Receives prompt                 │
         │      │  └─ Calls OpenAI servers            │
         │      │      │                              │
         │      │      └─→ GPT-4 Analyzes             │
         │      │          - Logic: 8/10              │
         │      │          - Clarity: 7/10            │
         │      │          - Persuasiveness: 6/10     │
         │      │          - Tone: 8/10               │
         │      │          - Mistakes: [...]          │
         │      │          - Improvements: [...]      │
         │      │                                     │
         │      │      Returns JSON response          │
         │      │                                     │
         │      └─ Returns to server                  │
         │  │
         │  ▼
         │
         ├─ Step 5: Parse Response
         │  {
         │    "pro": {
         │      "score": 7.3,
         │      "logic": 8,
         │      "clarity": 7,
         │      "persuasiveness": 6,
         │      "tone": 8,
         │      "mistakes": ["Wrong stat"],
         │      "improvements": ["Add sources"],
         │      "feedback": "Good arguments..."
         │    },
         │    "con": { /* same */ }
         │  }
         │
         ├─ Step 6: Save to Database
         │  └─→ PostgreSQL
         │      ├─ CREATE Score (
         │      │    userId: Alice,
         │      │    debateId: abc123,
         │      │    logic: 8,
         │      │    clarity: 7,
         │      │    persuasiveness: 6,
         │      │    tone: 8
         │      │  )
         │      ├─ CREATE Score (
         │      │    userId: Bob,
         │      │    debateId: abc123,
         │      │    logic: 7,
         │      │    clarity: 8,
         │      │    persuasiveness: 7,
         │      │    tone: 7
         │      │  )
         │      └─ UPDATE Debate.aiFeedback = {pro: {...}, con: {...}}
         │
         ├─ Step 7: Calculate Rankings
         │  ├─ Alice avg: (8+7+6+8)/4 = 7.25
         │  ├─ Bob avg: (7+8+7+7)/4 = 7.25
         │  └─ Update leaderboard position
         │
         └─ Step 8: Emit to Clients
            └─→ Socket.io
                ├─ TO: alice_socket & bob_socket
                ├─ EVENT: "debate_feedback"
                ├─ DATA: {
                │    pro: { score, logic, clarity, ... },
                │    con: { score, logic, clarity, ... },
                │    debateId: abc123
                │  }
                │
                ▼
            BOTH PLAYERS RECEIVE
            ├─ See feedback popup
            ├─ Show their score
            ├─ Show opponent score
            ├─ Show AI comments
            ├─ Show mistakes/improvements
            └─ Leaderboard updates in real-time
```

### Phase 5: Results Display

```
RESULTS SCREEN (After debate)

┌──────────────────────────────────────────┐
│  🎉 DEBATE RESULTS - AI Ethics          │
├──────────────────────────────────────────┤
│                                          │
│  YOU (Alice - Pro)        BOB (Con)      │
│  ────────────────         ──────────     │
│  Overall: 7.3/10          Overall: 7.3/10
│                                          │
│  Logic:        8          Logic:       7 │
│  Clarity:      7          Clarity:     8 │
│  Persuasion:   6          Persuasion:  7 │
│  Tone:         8          Tone:        7 │
│                                          │
├──────────────────────────────────────────┤
│ 📊 AI FEEDBACK                           │
├──────────────────────────────────────────┤
│ Your Performance:                        │
│ ✓ Strong logical arguments               │
│ ✓ Professional tone maintained           │
│ ✗ Lacked concrete statistics             │
│ ✗ Could address opponent better          │
│                                          │
│ Suggestions:                             │
│ • Research statistics before debate      │
│ • Practice active listening              │
│ • Add more examples                      │
├──────────────────────────────────────────┤
│          [👍 Next Debate]                │
└──────────────────────────────────────────┘
       │
       └─ Click → LeaderBoard Updates
              Alice: 1234 pts (Rank #3)
              Bob: 1220 pts (Rank #5)
```

---

## Data Flow Diagram

```
USER INPUT
   │
   ├─ Create Debate
   │  └─→ POST /api/debates
   │      └─→ Prisma.debate.create()
   │          └─→ PostgreSQL INSERT
   │
   ├─ Join Debate
   │  └─→ WebSocket 'join_debate'
   │      └─→ server.js socket handler
   │          └─→ Connect to debate room
   │
   ├─ Send Message
   │  └─→ WebSocket 'message'
   │      └─→ Prisma.message.create()
   │      └─→ Broadcast to room
   │
   ├─ Voice Speaks
   │  └─→ Web Speech API (browser)
   │      └─→ Convert to text
   │      └─→ WebSocket 'transcript_update'
   │          └─→ server.js stores in memory
   │              └─→ Broadcast to room
   │
   └─ Debate Ends
      └─→ Timer expires
          └─→ server.js endDebate()
              ├─ Collect transcripts
              ├─ Call AI API
              ├─ Parse response
              ├─ Prisma.score.create()
              ├─ Emit 'debate_feedback'
              └─→ Clients receive results

LEADERBOARD QUERY
   │
   └─→ GET /api/leaderboard
       └─→ Prisma.score.findMany()
           └─→ GROUP BY userId
               └─→ AVERAGE scores
                   └─→ ORDER BY total DESC
                       └─→ Return rankings
```

---

## Component Interaction Diagram

```
FRONTEND COMPONENTS

┌─────────────────────────────────────────────────────────────┐
│                      Home Page                              │
│  (page.tsx) - Shows hero + quick join + features           │
└────┬────────────────────────────────────────────────────────┘
     │
     ├─→ [CREATE DEBATE]
     │   └─→ DebateRoom.tsx (create variant)
     │       └─→ Debate Setup Form
     │           └─→ API POST /api/debates
     │
     ├─→ [BROWSE DEBATES]
     │   └─→ Debates Page
     │       └─→ Debate List
     │           └─→ API GET /api/debates
     │               └─→ Join Selected
     │
     └─→ [VIEW LEADERBOARD]
         └─→ Leaderboard Page
             └─→ API GET /api/leaderboard
                 └─→ Display Rankings


DEBATE PAGES

┌─────────────────────────────────────────────────────────────┐
│              /debates/[id] Route                            │
│  (Debate Page - Main interactive page)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ DebateRoom.tsx                                          │
│  │  ├─ Displays topic, join codes, participant status      │
│  │  └─ [Ready Button]                                      │
│  │      └─ Sets status to "waiting" → "ready"             │
│  │                                                          │
│  └─ When both ready → SWAP to VideoDebateRoom.tsx          │
│     │                                                       │
│     ├─ Video Container (SimplePeer)                        │
│     │  └─ Real-time P2P video stream                      │
│     │                                                       │
│     ├─ useAdvancedSpeechRecognition Hook                   │
│     │  └─ Listens to microphone                            │
│     │     └─ Converts voice → text                         │
│     │        └─ Emits transcript_update                    │
│     │                                                       │
│     ├─ Chat Messages Display                               │
│     │  └─ Shows all messages from both players             │
│     │     └─ Updates in real-time                          │
│     │                                                       │
│     ├─ Timer Display                                       │
│     │  └─ Counts down from 180 seconds                     │
│     │     └─ When 0 → Call endDebate()                    │
│     │                                                       │
│     └─ AIFeedback Display (appears when debate ends)       │
│        └─ Shows:                                            │
│           ├─ Your scores                                    │
│           ├─ Opponent scores                                │
│           ├─ AI analysis                                    │
│           └─ Mistakes & improvements                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Relationships Diagram

```
USER (1 person)
 │
 ├─ (1:M) Debates as Creator
 │        └─ Debate 1, Debate 2, Debate 3
 │
 ├─ (1:M) Debates as Pro
 │        └─ Debate 10, Debate 11, Debate 12
 │
 ├─ (1:M) Debates as Con
 │        └─ Debate 20, Debate 21, Debate 22
 │
 ├─ (1:M) Messages Sent
 │        └─ Message 100, Message 101, Message 102
 │
 ├─ (1:M) Scores Earned
 │        └─ Score 1000, Score 1001, Score 1002
 │
 ├─ (M:M) Badges Earned (through UserBadge)
 │        └─ Badge: Convincing Speaker
 │        └─ Badge: Fastest Thinker
 │
 └─ (1:M) Votes Cast
          └─ Vote 1, Vote 2, Vote 3


DEBATE (1 session)
 │
 ├─ (M:1) Creator → User
 │
 ├─ (1:1) Pro Player → User
 │
 ├─ (0:1) Con Player → User (optional, can be null)
 │
 ├─ (1:M) Messages in Debate
 │        └─ Chat messages from both players
 │
 ├─ (1:M) Scores Earned
 │        └─ Score for Pro
 │        └─ Score for Con
 │
 └─ (1:M) Votes Received
          └─ Users voting on winner


SCORE (1 point record)
 │
 ├─ (M:1) User → earned by
 │
 └─ (M:1) Debate → from


All relationships enforced with foreign keys in PostgreSQL
```

---

## WebSocket Event Sequence

```
CLIENT1                    SERVER              CLIENT2
   │                          │                   │
   ├─ io.connect() ──────────→│                   │
   │←─ connection event ───────┤                   │
   │                           │                   │
   ├─ join_debate ────────────→│                   │
   │                           ├─ socket.join() ──┤
   │                           │                   │
   │                           │←─ user_joined ───┤
   │                           │                   │
   │                           ├─ emit broadcast──→ CLIENT2
   │                           │                   │
   │ [BOTH READY]              │ [BOTH READY]      │
   │                           │                   │
   ├─ start_debate ───────────→│                   │
   │                           ├─ emit broadcast──→ CLIENT2
   │                           │                   │
   │                           │ [START TIMER]     │
   │                           │ [VIDEO CONNECTS]  │
   │                           │                   │
   ├─ message ────────────────→│                   │
   │                           ├─ prisma.create──→ DB
   │                           ├─ emit broadcast──→ CLIENT2
   │←─ new_message ────────────┤                   │
   │                           │←─ new_message ───┤
   │                           │                   │
   ├─ transcript_update ──────→│                   │
   │                           ├─ store in memory→ RAM
   │                           ├─ emit broadcast──→ CLIENT2
   │                           │                   │
   │                           │ [TIMER: 180...1] │
   │                           │                   │
   │                           │ [TIMER REACHED 0]│
   │                           │                   │
   │                           ├─ endDebate() ────→ AI API
   │                           │←─ aiFeedback ────┤
   │                           ├─ prisma.create──→ DB
   │                           │                   │
   │←─ debate_feedback ────────┤                   │
   │                           ├─ debate_feedback→ CLIENT2
   │                           │                   │
   │ [SHOW RESULTS]            │                   [SHOW RESULTS]
   │                           │                   │
   ├─ disconnect ─────────────→│                   │
   │                           ├─ socket.leave()─→ Leave room
   │                           │                   │
```

---

## Error Handling Flow

```
         ANY OPERATION
              │
              ▼
         TRY {
              │
         ├─ Execute action
         │
         └─ SUCCESS? → Return result
              │
              NO
              │
              ▼
         } CATCH {
              │
         ├─ Log error to console
         ├─ Determine error type:
         │  ├─ Database error?
         │  ├─ API error?
         │  ├─ Socket error?
         │  └─ Validation error?
         │
         ├─ Send error response/emit
         │
         └─ Client shows toast notification
         }
```

---

## Performance Optimization Paths

```
BOTTLENECK: Database queries slow
└─ Solution:
   ├─ Add indexes on frequently queried fields
   ├─ Cache leaderboard (30 sec TTL)
   └─ Use Prisma select to fetch only needed fields

BOTTLENECK: AI API slow
└─ Solution:
   ├─ Cache responses for common topics
   ├─ Use GPT-3.5 instead of GPT-4 (faster/cheaper)
   └─ Batch multiple requests

BOTTLENECK: Video streaming laggy
└─ Solution:
   ├─ Reduce video resolution
   ├─ Use WebRTC settings for bandwidth
   └─ Implement adaptive bitrate

BOTTLENECK: WebSocket room congestion
└─ Solution:
   ├─ Use namespaces for different debate types
   ├─ Horizontal scaling with Redis adapter
   └─ Limit room size (2 players per debate)
```

---

**Created**: October 2025
**Last Updated**: Current Session
**Format**: ASCII Diagrams & Flow Charts
