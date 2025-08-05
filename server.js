const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

console.log('🚀 Starting server in', dev ? 'development' : 'production', 'mode');
console.log('🌐 Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? 'SET' : 'NOT_SET',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT_SET'
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Prisma with better error handling
let prisma;
try {
  prisma = new PrismaClient({
    log: dev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
  console.log('✅ Prisma client initialized');
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error);
  process.exit(1);
}

// Store debate timeouts to clear them when needed
const debateTimeouts = new Map();

app.prepare().then(() => {
  console.log('✅ Next.js app prepared');
  
  // Clean up any orphaned debates on startup
  cleanupOrphanedDebates();
  
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, {
        error: err instanceof Error ? err.stack || err.message : err,
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new SocketIOServer(server, {
    path: '/api/socket.io',
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  console.log('✅ Socket.IO server initialized');

  // Store latest transcripts in memory
  const debateTranscripts = {};

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    socket.on('join_debate', async ({ debateId, userId, role }) => {
      try {
        // All users join the same room for real-time messaging
        socket.join(`debate_${debateId}`);
        console.log(`User ${userId} joined debate ${debateId} as ${role}`);
        // Notify others (optional, can be kept or removed)
        socket.to(`debate_${debateId}`).emit('user_joined', { userId, role });
      } catch (error) {
        console.error('❌ Error joining debate:', {
          error: error instanceof Error ? error.stack || error.message : error,
          debateId,
          userId,
          role
        });
        socket.emit('error', { message: 'Failed to join debate' });
      }
    });

    socket.on('start_debate', async ({ debateId }) => {
      try {
        if (!prisma) {
          throw new Error('Database not available');
        }

        // Check if debate exists before updating
        const existingDebate = await prisma.debate.findUnique({
          where: { id: debateId }
        });

        if (!existingDebate) {
          console.error(`❌ Debate ${debateId} not found when trying to start`);
          socket.emit('error', { message: 'Debate not found' });
          return;
        }

        // Set startTime and status in DB
        const now = new Date();
        const debate = await prisma.debate.update({
          where: { id: debateId },
          data: { startTime: now, status: 'in-progress' },
        });
        
        console.log(`✅ Debate ${debateId} started with duration: ${debate.duration}s`);
        io.to(`debate_${debateId}`).emit('debate_started', { startTime: now, duration: debate.duration });
        
        // Clear any existing timeout for this debate
        const existingTimeout = debateTimeouts.get(debateId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          console.log(`🧹 Cleared existing timeout for debate ${debateId}`);
        }
        
        // Schedule debate end with proper error handling
        const timeoutId = setTimeout(async () => {
          try {
            await endDebate(debateId, io);
          } catch (error) {
            console.error(`❌ Error in debate timeout for ${debateId}:`, error);
          } finally {
            // Always clean up the timeout reference
            debateTimeouts.delete(debateId);
          }
        }, debate.duration * 1000);
        
        // Store the timeout reference
        debateTimeouts.set(debateId, timeoutId);
        
      } catch (err) {
        console.error('❌ Error starting debate:', {
          error: err instanceof Error ? err.stack || err.message : err,
          debateId,
          errorType: err?.constructor?.name || 'Unknown'
        });
        socket.emit('error', { message: 'Failed to start debate' });
      }
    });

    socket.on('send_message', async ({ debateId, userId, content, role }) => {
      try {
        if (!prisma) {
          throw new Error('Database not available');
        }

        // Prevent messages if debate is completed
        const debate = await prisma.debate.findUnique({ where: { id: debateId } });
        if (!debate) {
          socket.emit('error', { message: 'Debate not found.' });
          return;
        }
        if (debate.status === 'completed') {
          socket.emit('error', { message: 'Debate has ended.' });
          return;
        }
        const message = await prisma.message.create({
          data: {
            content,
            role,
            debateId: debateId,
            senderId: userId,
          },
        });
        io.to(`debate_${debateId}`).emit('new_message', {
          id: message.id,
          content: message.content,
          role: message.role,
          senderId: message.senderId,
          createdAt: message.createdAt,
        });
      } catch (error) {
        console.error('❌ Error sending message:', {
          error: error instanceof Error ? error.stack || error.message : error,
          debateId,
          userId,
          role,
          errorType: error?.constructor?.name || 'Unknown'
        });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('start_timer', ({ debateId, duration }) => {
      try {
        io.to(`debate_${debateId}`).emit('timer_started', { duration });
        console.log(`Timer started for debate ${debateId}: ${duration}s`);
      } catch (error) {
        console.error('❌ Error starting timer:', error);
      }
    });

    socket.on('transcript_update', ({ debateId, userId, role, transcript }) => {
      if (!debateId || !role) return;
      if (!debateTranscripts[debateId]) {
        debateTranscripts[debateId] = { pro: '', con: '' };
      }
      debateTranscripts[debateId][role] = transcript;
      io.to(`debate_${debateId}`).emit('transcript_update', { role, transcript });
    });

    // WebRTC signaling handler
    socket.on('signal', ({ debateId, userId, signal }) => {
      console.log(`📡 Signal from ${userId} in debate ${debateId}`);
      // Forward the signal to other participants in the same debate
      socket.to(`debate_${debateId}`).emit('signal', { userId, signal });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, cleaning up...');
    // Clear all timeouts
    debateTimeouts.forEach((timeoutId, debateId) => {
      clearTimeout(timeoutId);
      console.log(`🧹 Cleared timeout for debate ${debateId}`);
    });
    debateTimeouts.clear();
    
    // Close database connection
    if (prisma) {
      prisma.$disconnect();
    }
    
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, cleaning up...');
    // Clear all timeouts
    debateTimeouts.forEach((timeoutId, debateId) => {
      clearTimeout(timeoutId);
      console.log(`🧹 Cleared timeout for debate ${debateId}`);
    });
    debateTimeouts.clear();
    
    // Close database connection
    if (prisma) {
      prisma.$disconnect();
    }
    
    process.exit(0);
  });

  server.listen(port, (err) => {
    if (err) {
      console.error('❌ Server failed to start:', err);
      throw err;
    }
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server ready on path: /api/socket/io`);
  });

  // Test database connection
  if (prisma) {
    prisma.$connect()
      .then(() => {
        console.log('✅ Database connected successfully in server.js');
      })
      .catch((error) => {
        console.error('❌ Database connection failed in server.js:', error);
      });
  }
}).catch((error) => {
  console.error('❌ Failed to prepare Next.js app:', error);
  process.exit(1);
});

// Separate function to handle debate ending with proper error handling
async function endDebate(debateId, io) {
  try {
    // Check if debate exists before updating
    const existingDebate = await prisma.debate.findUnique({
      where: { id: debateId }
    });

    if (!existingDebate) {
      console.log(`⚠️ Debate ${debateId} not found for ending - might have been cleaned up already`);
      return;
    }

    // Only update if debate is still in progress
    if (existingDebate.status === 'completed') {
      console.log(`⚠️ Debate ${debateId} already completed`);
      return;
    }

    const end = new Date();
    await prisma.debate.update({
      where: { id: debateId },
      data: { endTime: end, status: 'completed' },
    });
    
    console.log(`✅ Debate ${debateId} ended, generating AI feedback...`);
    io.to(`debate_${debateId}`).emit('debate_ended');
    
    // --- ENHANCED AI FEEDBACK LOGIC ---
    try {
      const messages = await prisma.message.findMany({
        where: { debateId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { username: true }
          }
        }
      });
      
      // Use live transcripts if available
      const transcripts = debateTranscripts[debateId] || { pro: '', con: '' };
      
      console.log(`📊 Generating feedback for debate ${debateId}:`, {
        messageCount: messages.length,
        proTranscriptLength: transcripts.pro.length,
        conTranscriptLength: transcripts.con.length
      });
      
      // Generate AI feedback
      const aiFeedback = await getAIFeedback(messages, transcripts);
      
      // Save feedback to database
      await prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback },
      });
      
      console.log(`✅ AI feedback generated and saved for debate ${debateId}`);
      
      // Emit feedback to all connected clients
      io.to(`debate_${debateId}`).emit('debate_feedback', aiFeedback);
      
      // Clean up transcripts from memory
      delete debateTranscripts[debateId];
      
    } catch (aiErr) {
      console.error(`❌ AI feedback error for debate ${debateId}:`, {
        error: aiErr instanceof Error ? aiErr.stack || aiErr.message : aiErr,
        errorType: aiErr?.constructor?.name || 'Unknown'
      });
      
      // Send error feedback to clients
      const errorFeedback = {
        error: 'AI analysis failed',
        message: 'Unable to generate feedback at this time',
        timestamp: new Date().toISOString()
      };
      
      // Try to save error to database, but don't fail if debate is gone
      try {
        await prisma.debate.update({
          where: { id: debateId },
          data: { aiFeedback: errorFeedback },
        });
      } catch (dbSaveErr) {
        console.error(`❌ Could not save error feedback for debate ${debateId}:`, dbSaveErr.message);
      }
      
      io.to(`debate_${debateId}`).emit('debate_feedback', errorFeedback);
    }
    
  } catch (dbErr) {
    // Handle the specific "record not found" error
    if (dbErr.code === 'P2025' || dbErr.message.includes('No record was found for an update')) {
      console.log(`⚠️ Debate ${debateId} not found for update - might have been cleaned up already`);
      return;
    }
    
    console.error(`❌ Database error ending debate ${debateId}:`, {
      error: dbErr instanceof Error ? dbErr.stack || dbErr.message : dbErr,
      errorType: dbErr?.constructor?.name || 'Unknown'
    });
    
    io.to(`debate_${debateId}`).emit('error', { 
      message: 'Failed to end debate properly' 
    });
  }
}

// Function to clean up orphaned debates on server startup
async function cleanupOrphanedDebates() {
  try {
    console.log('🧹 Cleaning up orphaned debates...');
    
    // Find debates that are still marked as active but are older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const orphanedDebates = await prisma.debate.findMany({
      where: {
        status: {
          in: ['active', 'in-progress']
        },
        createdAt: {
          lt: tenMinutesAgo
        }
      }
    });
    
    if (orphanedDebates.length > 0) {
      console.log(`🧹 Found ${orphanedDebates.length} orphaned debates, cleaning up...`);
      
      await prisma.debate.updateMany({
        where: {
          id: {
            in: orphanedDebates.map(d => d.id)
          }
        },
        data: {
          status: 'completed',
          endTime: new Date()
        }
      });
      
      console.log(`✅ Cleaned up ${orphanedDebates.length} orphaned debates`);
    } else {
      console.log('✅ No orphaned debates found');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up orphaned debates:', error);
  }
}

// Enhanced AI feedback function with better error handling
async function getAIFeedback(messages, transcripts) {
  try {
    // Check if we have sufficient content
    if (messages.length === 0 && !transcripts.pro && !transcripts.con) {
      return {
        error: 'Insufficient content',
        message: 'No messages or transcripts available for analysis',
        pro: { score: 'N/A', mistakes: [], improvements: [], feedback: 'No content to analyze' },
        con: { score: 'N/A', mistakes: [], improvements: [], feedback: 'No content to analyze' }
      };
    }

    // Prepare the prompt for OpenRouter
    const prompt = `You are an expert debate judge. Analyze the following debate between Pro and Con. For each side, provide:
- A score out of 10 (number only)
- A list of mistakes (array of strings)
- Suggestions for improvement (array of strings)  
- A detailed feedback paragraph (string)

Debate Transcripts (from speech-to-text):
PRO: ${transcripts.pro || 'No transcript available'}

CON: ${transcripts.con || 'No transcript available'}

Debate Messages (chat):
${messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n') || 'No messages available'}

Respond ONLY in valid JSON with this exact format:
{
  "pro": {
    "score": 7,
    "mistakes": ["mistake1", "mistake2"],
    "improvements": ["improvement1", "improvement2"],
    "feedback": "detailed feedback paragraph"
  },
  "con": {
    "score": 8,
    "mistakes": ["mistake1", "mistake2"],
    "improvements": ["improvement1", "improvement2"], 
    "feedback": "detailed feedback paragraph"
  }
}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('❌ Missing OPENROUTER_API_KEY environment variable');
      throw new Error('Missing OPENROUTER_API_KEY environment variable');
    }

    console.log('🤖 Sending request to OpenRouter API...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert debate judge. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
      timeout: 30000 // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';
    
    if (!aiText) {
      throw new Error('Empty response from AI');
    }
    
    console.log('🤖 Raw AI response:', aiText);

    // Try to parse JSON from AI response
    let feedback;
    try {
      // Extract JSON from response (in case AI adds extra text)
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiText;
      feedback = JSON.parse(jsonStr);
      
      // Validate structure
      if (!feedback.pro || !feedback.con) {
        throw new Error('Invalid feedback structure');
      }
      
      console.log('✅ Successfully parsed AI feedback');
      return feedback;
      
    } catch (parseErr) {
      console.error('❌ Failed to parse AI response:', parseErr);
      // Return structured error with raw content
      return {
        error: 'Parse error',
        message: 'AI response could not be parsed as JSON',
        raw: aiText,
        pro: { score: 'N/A', mistakes: [], improvements: [], feedback: 'Analysis failed' },
        con: { score: 'N/A', mistakes: [], improvements: [], feedback: 'Analysis failed' }
      };
    }
    
  } catch (error) {
    console.error('❌ getAIFeedback error:', {
      error: error instanceof Error ? error.stack || error.message : error,
      errorType: error?.constructor?.name || 'Unknown'
    });
    return {
      error: error.message || 'Unknown error',
      message: 'Failed to generate AI feedback',
      timestamp: new Date().toISOString(),
      pro: { score: 'N/A', mistakes: [], improvements: [], feedback: 'Error generating feedback' },
      con: { score: 'N/A', mistakes: [], improvements: [], feedback: 'Error generating feedback' }
    };
  }
}