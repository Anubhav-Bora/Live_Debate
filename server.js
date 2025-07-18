const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
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
        io.to(`debate_${debateId}`).emit('debate_started', { startTime: now, duration: debate.duration });
        // Schedule debate end
        setTimeout(async () => {
          const end = new Date();
          await prisma.debate.update({
            where: { id: debateId },
            data: { endTime: end, status: 'completed' },
          });
          io.to(`debate_${debateId}`).emit('debate_ended');
          // --- AI FEEDBACK LOGIC ---
          try {
            const messages = await prisma.message.findMany({
              where: { debateId },
              orderBy: { createdAt: 'asc' },
            });
            // Use live transcripts if available
            const transcripts = debateTranscripts[debateId] || { pro: '', con: '' };
            const aiFeedback = await getAIFeedback(messages, transcripts);
            await prisma.debate.update({
              where: { id: debateId },
              data: { aiFeedback },
            });
            io.to(`debate_${debateId}`).emit('debate_feedback', aiFeedback);
          } catch (aiErr) {
            console.error('AI feedback error:', aiErr);
          }
        }, debate.duration * 1000);
      } catch (err) {
        console.error('Error starting debate:', err);
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

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`🔌 Socket.IO server ready on path: /api/socket/io`);
  });
});

async function getAIFeedback(messages, transcripts) {
  // Prepare the prompt for OpenRouter
  const prompt = `You are an expert debate judge. Analyze the following debate between Pro and Con. For each side, provide:\n- A score out of 10\n- A list of mistakes\n- Suggestions for improvement\n- A short feedback paragraph\n\nDebate Transcripts (from speech-to-text):\nPRO:\n${transcripts.pro}\n\nCON:\n${transcripts.con}\n\nDebate Messages (chat):\n${messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n')}\n\nRespond in JSON with this format: { pro: { score, mistakes, improvements, feedback }, con: { score, mistakes, improvements, feedback } }`;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4',
      messages: [
        { role: 'system', content: 'You are an expert debate judge.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${errorText}`);
  }

  const data = await response.json();
  // Try to parse the JSON from the AI's response
  let feedback;
  try {
    const text = data.choices?.[0]?.message?.content || '';
    feedback = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
  } catch (err) {
    feedback = { error: 'Failed to parse AI feedback', raw: data };
  }
  return feedback;
}