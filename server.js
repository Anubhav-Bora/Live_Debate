const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: SocketIOServer } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

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

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

  socket.on('join_debate', async ({ debateId, userId, role }) => {
  try {
    if (role === 'viewer') {
      socket.join(`debate_${debateId}_viewers`);
    } else {
      socket.join(`debate_${debateId}_participants`);
    }
    console.log(`User ${userId} joined debate ${debateId} as ${role}`);
    
    // Notify others
    socket.to(`debate_${debateId}_participants`).emit('user_joined', { userId, role });
  } catch (error) {
    console.error('Error joining debate:', error);
    socket.emit('error', { message: 'Failed to join debate' });
  }
});


    socket.on('send_message', async ({ debateId, userId, content, role }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content,
            role,
            debateId: parseInt(debateId),
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