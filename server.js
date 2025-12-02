const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let prisma;
try {
  prisma = new PrismaClient({
    log: dev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error);
  process.exit(1);
}

const debateTimeouts = new Map();

app.prepare().then(() => {
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

  const io = new SocketIOServer(server, {
    path: '/api/socket.io',
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const debateTranscripts = {};

  io.on('connection', (socket) => {
    socket.on('join_debate', async ({ debateId, userId, role }) => {
      try {
        socket.join(`debate_${debateId}`);
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

        const existingDebate = await prisma.debate.findUnique({
          where: { id: debateId }
        });

        if (!existingDebate) {
          console.error(`❌ Debate ${debateId} not found when trying to start`);
          socket.emit('error', { message: 'Debate not found' });
          return;
        }

        const now = new Date();
        const debate = await prisma.debate.update({
          where: { id: debateId },
          data: { startTime: now, status: 'in-progress' },
        });
        
        io.to(`debate_${debateId}`).emit('debate_started', { startTime: now, duration: debate.duration });
        
        const existingTimeout = debateTimeouts.get(debateId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        const timeoutId = setTimeout(async () => {
          try {
            await endDebate(debateId, io);
          } catch (error) {
            console.error(`❌ Error in debate timeout for ${debateId}:`, error);
          } finally {
            debateTimeouts.delete(debateId);
          }
        }, debate.duration * 1000);
        
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
      if (!debateId || !role || !transcript) return;
      
      if (!debateTranscripts[debateId]) {
        debateTranscripts[debateId] = { pro: '', con: '' };
      }
      
      const currentTranscript = debateTranscripts[debateId][role];
      
      if (!currentTranscript.includes(transcript)) {
        debateTranscripts[debateId][role] = currentTranscript + (currentTranscript ? ' ' : '') + transcript;
        
        io.to(`debate_${debateId}`).emit('transcript_update', { 
          role, 
          transcript: debateTranscripts[debateId][role] 
        });
        
      }
    });

    socket.on('signal', ({ debateId, userId, signal }) => {
      socket.to(`debate_${debateId}`).emit('signal', { userId, signal });
    });

    socket.on('disconnect', () => {
      // Handle client disconnect
    });
  });

  process.on('SIGTERM', () => {
    debateTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    debateTimeouts.clear();
    
    if (prisma) {
      prisma.$disconnect();
    }
    
    process.exit(0);
  });

  process.on('SIGINT', () => {
    debateTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    debateTimeouts.clear();
    
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
  });

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

async function endDebate(debateId, io) {
  try {
    const existingDebate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: { proUser: true, conUser: true }
    });

    if (!existingDebate) {
      console.log(`⚠️ Debate ${debateId} not found for ending - might have been cleaned up already`);
      return;
    }

    if (existingDebate.status === 'completed') {
      return;
    }

    // Check if both participants joined
    const missingParticipants = [];
    if (!existingDebate.proUser) missingParticipants.push('Pro player did not join');
    if (!existingDebate.conUser) missingParticipants.push('Con player did not join');

    const end = new Date();
    await prisma.debate.update({
      where: { id: debateId },
      data: { endTime: end, status: 'completed' },
    });
    
    io.to(`debate_${debateId}`).emit('debate_ended');
    
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
      
      const transcripts = debateTranscripts[debateId] || { pro: '', con: '' };
      
      // Generate AI feedback
      let aiFeedback = await getAIFeedback(messages, transcripts, missingParticipants);
      
      // Save feedback to database
      await prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback },
      });
      
      // If both participants joined, save scores to leaderboard
      if (!missingParticipants.length && aiFeedback.pro && aiFeedback.con) {
        try {
          // Save Pro player score
          if (existingDebate.proUser && aiFeedback.pro.score) {
            await prisma.score.create({
              data: {
                userId: existingDebate.proUser.id,
                debateId: debateId,
                logic: Math.floor(aiFeedback.pro.logic || aiFeedback.pro.score),
                clarity: Math.floor(aiFeedback.pro.clarity || aiFeedback.pro.score),
                persuasiveness: Math.floor(aiFeedback.pro.persuasiveness || aiFeedback.pro.score),
                tone: Math.floor(aiFeedback.pro.tone || aiFeedback.pro.score)
              }
            });
          }
          
          // Save Con player score
          if (existingDebate.conUser && aiFeedback.con.score) {
            await prisma.score.create({
              data: {
                userId: existingDebate.conUser.id,
                debateId: debateId,
                logic: Math.floor(aiFeedback.con.logic || aiFeedback.con.score),
                clarity: Math.floor(aiFeedback.con.clarity || aiFeedback.con.score),
                persuasiveness: Math.floor(aiFeedback.con.persuasiveness || aiFeedback.con.score),
                tone: Math.floor(aiFeedback.con.tone || aiFeedback.con.score)
              }
            });
          }
        } catch (scoreErr) {
          console.error(`❌ Error saving scores for debate ${debateId}:`, scoreErr.message);
        }
      } else if (missingParticipants.length) {
        // Missing participants, skipping score save
      }
      
      io.to(`debate_${debateId}`).emit('debate_feedback', aiFeedback);
      
      delete debateTranscripts[debateId];
      
    } catch (aiErr) {
      console.error(`❌ AI feedback error for debate ${debateId}:`, {
        error: aiErr instanceof Error ? aiErr.stack || aiErr.message : aiErr,
        errorType: aiErr?.constructor?.name || 'Unknown'
      });
      
      const errorFeedback = {
        error: 'AI analysis failed',
        message: 'Unable to generate feedback at this time',
        missingParticipants,
        timestamp: new Date().toISOString()
      };
      
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
    if (dbErr.code === 'P2025' || dbErr.message.includes('No record was found for an update')) {
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

async function cleanupOrphanedDebates() {
  try {
    console.log('🧹 Cleaning up orphaned debates...');
    
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
      
    } else {
      // No orphaned debates found
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up orphaned debates:', error);
  }
}

async function getAIFeedback(messages, transcripts, missingParticipants = []) {
  try {
    if (messages.length === 0 && !transcripts.pro && !transcripts.con) {
      return {
        error: 'Insufficient content',
        message: 'No messages or transcripts available for analysis',
        missingParticipants,
        pro: { score: 'N/A', logic: 0, clarity: 0, persuasiveness: 0, tone: 0, mistakes: [], improvements: [], feedback: 'No content to analyze' },
        con: { score: 'N/A', logic: 0, clarity: 0, persuasiveness: 0, tone: 0, mistakes: [], improvements: [], feedback: 'No content to analyze' }
      };
    }

    // Check for missing participants
    if (missingParticipants.length > 0) {
      return {
        missingParticipants,
        message: `Debate incomplete: ${missingParticipants.join(', ')}`,
        pro: { score: 'N/A', logic: 0, clarity: 0, persuasiveness: 0, tone: 0, mistakes: [], improvements: [], feedback: 'Debate could not be judged - missing participant' },
        con: { score: 'N/A', logic: 0, clarity: 0, persuasiveness: 0, tone: 0, mistakes: [], improvements: [], feedback: 'Debate could not be judged - missing participant' }
      };
    }

    const prompt = `You are an expert debate judge. Analyze the following debate between Pro and Con. For each side, provide:
- A numeric score out of 10 for overall performance
- Individual scores (1-10) for: logic, clarity, persuasiveness, tone
- A list of specific mistakes they made (array)
- Suggestions for improvement (array)
- A detailed feedback paragraph

Debate Transcripts (from speech-to-text):
PRO: ${transcripts.pro || 'No speech content'}

CON: ${transcripts.con || 'No speech content'}

Debate Messages (chat):
${messages.map(m => `[${m.role?.toUpperCase() || 'UNKNOWN'}] ${m.content}`).join('\n') || 'No messages available'}

IMPORTANT: Respond ONLY in valid JSON with this exact format:
{
  "pro": {
    "score": 7,
    "logic": 8,
    "clarity": 7,
    "persuasiveness": 6,
    "tone": 7,
    "mistakes": ["mistake1", "mistake2"],
    "improvements": ["improvement1", "improvement2"],
    "feedback": "detailed paragraph about pro's performance"
  },
  "con": {
    "score": 8,
    "logic": 8,
    "clarity": 8,
    "persuasiveness": 8,
    "tone": 7,
    "mistakes": ["mistake1"],
    "improvements": ["improvement1"],
    "feedback": "detailed paragraph about con's performance"
  }
}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('❌ Missing OPENROUTER_API_KEY environment variable');
      throw new Error('Missing OPENROUTER_API_KEY environment variable');
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert debate judge. ALWAYS respond with ONLY valid JSON, no other text.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.5
      }),
      timeout: 30000
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 200)
      });
      throw new Error(`OpenRouter API error ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || '';
    
    if (!aiText) {
      throw new Error('Empty response from AI');
    }

    let feedback;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiText;
      feedback = JSON.parse(jsonStr);
      
      // Validate structure
      if (!feedback.pro || !feedback.con) {
        throw new Error('Invalid feedback structure - missing pro or con');
      }

      // Ensure all required fields exist with defaults
      const ensureFields = (obj) => ({
        score: obj.score || 5,
        logic: obj.logic || 5,
        clarity: obj.clarity || 5,
        persuasiveness: obj.persuasiveness || 5,
        tone: obj.tone || 5,
        mistakes: Array.isArray(obj.mistakes) ? obj.mistakes : [],
        improvements: Array.isArray(obj.improvements) ? obj.improvements : [],
        feedback: obj.feedback || 'No additional feedback'
      });

      feedback.pro = ensureFields(feedback.pro);
      feedback.con = ensureFields(feedback.con);
      
      return feedback;
      
    } catch (parseErr) {
      console.error('❌ Failed to parse AI response:', parseErr.message);
      throw parseErr;
    }
    
  } catch (error) {
    console.error('❌ getAIFeedback error:', {
      error: error instanceof Error ? error.stack || error.message : error,
      errorType: error?.constructor?.name || 'Unknown'
    });
    return {
      error: error.message || 'Unknown error',
      message: 'Failed to generate AI feedback',
      missingParticipants,
      timestamp: new Date().toISOString(),
      pro: { score: 0, logic: 0, clarity: 0, persuasiveness: 0, tone: 0, mistakes: [], improvements: [], feedback: 'Error generating feedback' },
      con: { score: 0, logic: 0, clarity: 0, persuasiveness: 0, tone: 0, mistakes: [], improvements: [], feedback: 'Error generating feedback' }
    };
  }
}