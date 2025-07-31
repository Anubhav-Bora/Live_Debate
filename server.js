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
const prisma = new PrismaClient();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
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
        console.error('Error joining debate:', error);
        socket.emit('error', { message: 'Failed to join debate' });
      }
    });

    socket.on('start_debate', async ({ debateId }) => {
      try {
        // Set startTime and status in DB
        const now = new Date();
        const debate = await prisma.debate.update({
          where: { id: debateId },
          data: { startTime: now, status: 'in-progress' },
        });
        
        console.log(`✅ Debate ${debateId} started with duration: ${debate.duration}s`);
        io.to(`debate_${debateId}`).emit('debate_started', { startTime: now, duration: debate.duration });
        
        // Schedule debate end
        setTimeout(async () => {
          try {
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
              console.error(`❌ AI feedback error for debate ${debateId}:`, aiErr);
              
              // Send error feedback to clients
              const errorFeedback = {
                error: 'AI analysis failed',
                message: 'Unable to generate feedback at this time',
                timestamp: new Date().toISOString()
              };
              
              // Save error to database
              await prisma.debate.update({
                where: { id: debateId },
                data: { aiFeedback: errorFeedback },
              });
              
              io.to(`debate_${debateId}`).emit('debate_feedback', errorFeedback);
            }
            
          } catch (dbErr) {
            console.error(`❌ Database error ending debate ${debateId}:`, dbErr);
            io.to(`debate_${debateId}`).emit('error', { 
              message: 'Failed to end debate properly' 
            });
          }
        }, debate.duration * 1000);
        
      } catch (err) {
        console.error('Error starting debate:', err);
        socket.emit('error', { message: 'Failed to start debate' });
      }
    });

    socket.on('send_message', async ({ debateId, userId, content, role }) => {
      try {
        // Prevent messages if debate is completed
        const debate = await prisma.debate.findUnique({ where: { id: debateId } });
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
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('start_timer', ({ debateId, duration }) => {
      try {
        io.to(`debate_${debateId}`).emit('timer_started', { duration });
        console.log(`Timer started for debate ${debateId}: ${duration}s`);
      } catch (error) {
        console.error('Error starting timer:', error);
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

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server ready on path: /api/socket/io`);
  });
});

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
    console.error('❌ getAIFeedback error:', error);
    return {
      error: error.message || 'Unknown error',
      message: 'Failed to generate AI feedback',
      timestamp: new Date().toISOString(),
      pro: { score: 'N/A', mistakes: [], improvements: [], feedback: 'Error generating feedback' },
      con: { score: 'N/A', mistakes: [], improvements: [], feedback: 'Error generating feedback' }
    };
  }
}