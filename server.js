const { createServer } = require("http");
const { createHash } = require("crypto");
const { parse } = require("url");
const next = require("next");
const { Server: SocketIOServer } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const { judgeDebate } = require("./lib/ai-judge");

require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
require("dotenv").config({ path: ".env.ai.local", override: true, quiet: true });

const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
process.env.NODE_ENV = production ? "production" : "development";

const hostname = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev: !production, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient({ log: production ? ["error"] : ["warn", "error"] });

const debateTimers = new Map();
const transcriptCache = new Map();
const transcriptFlushTimers = new Map();
const analysesInFlight = new Set();
const MAX_TRANSCRIPT_LENGTH = 50_000;

const roomName = (debateId) => `debate_${debateId}`;
const isSafeId = (value) => typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);
const cleanTranscript = (value) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_TRANSCRIPT_LENGTH) : "";

function getAllowedOrigins() {
  const origins = new Set([`http://localhost:${port}`, `http://127.0.0.1:${port}`]);
  for (const value of [process.env.NEXT_PUBLIC_SITE_URL, process.env.ALLOWED_ORIGINS]) {
    if (!value) continue;
    for (const origin of value.split(",")) {
      const normalized = origin.trim().replace(/\/$/, "");
      if (normalized) origins.add(normalized);
    }
  }
  return origins;
}

function socketError(socket, message, code = "BAD_REQUEST") {
  socket.emit("app_error", { message, code });
}

function acknowledge(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

function allowSocketEvent(socket, key, limit, windowMs) {
  const now = Date.now();
  const buckets = socket.data.rateLimits || new Map();
  socket.data.rateLimits = buckets;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

async function authenticateSocket(socket, nextCallback) {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const tokenPair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("debate_session="));
  let token = tokenPair ? tokenPair.slice("debate_session=".length) : "";
  try { token = decodeURIComponent(token); } catch { token = ""; }
  if (!token) {
    socket.data.userId = null;
    nextCallback();
    return;
  }
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      socket.data.userId = null;
      nextCallback();
      return;
    }
    socket.data.userId = session.userId;
    nextCallback();
  } catch (error) {
    console.warn("Socket session lookup failed:", error instanceof Error ? error.message : error);
    nextCallback(new Error("Session lookup failed"));
  }
}

function roleForDebate(debate, userId) {
  if (!userId) return "viewer";
  if (debate.proUser?.id === userId) return "pro";
  if (debate.conUser?.id === userId) return "con";
  return "viewer";
}

async function loadDebate(debateId) {
  return prisma.debate.findUnique({
    where: { id: debateId },
    include: {
      proUser: { select: { id: true, username: true } },
      conUser: { select: { id: true, username: true } },
    },
  });
}

function transcriptStateFor(debate) {
  if (!transcriptCache.has(debate.id)) {
    transcriptCache.set(debate.id, {
      pro: cleanTranscript(debate.proTranscript),
      con: cleanTranscript(debate.conTranscript),
    });
  }
  return transcriptCache.get(debate.id);
}

function queueTranscriptFlush(debateId, role) {
  const key = `${debateId}:${role}`;
  const currentTimer = transcriptFlushTimers.get(key);
  if (currentTimer) clearTimeout(currentTimer);
  transcriptFlushTimers.set(
    key,
    setTimeout(async () => {
      transcriptFlushTimers.delete(key);
      try {
        const state = transcriptCache.get(debateId);
        if (!state) return;
        await prisma.debate.update({
          where: { id: debateId },
          data: role === "pro" ? { proTranscript: state.pro } : { conTranscript: state.con },
        });
      } catch (error) {
        console.error(`Could not persist ${role} transcript for ${debateId}:`, error);
      }
    }, 500),
  );
}

async function flushTranscripts(debateId) {
  for (const role of ["pro", "con"]) {
    const key = `${debateId}:${role}`;
    const timer = transcriptFlushTimers.get(key);
    if (timer) clearTimeout(timer);
    transcriptFlushTimers.delete(key);
  }
  const state = transcriptCache.get(debateId);
  if (!state) return;
  await prisma.debate.update({
    where: { id: debateId },
    data: { proTranscript: state.pro, conTranscript: state.con },
  });
}

function clearDebateTimer(debateId) {
  const timer = debateTimers.get(debateId);
  if (timer) clearTimeout(timer);
  debateTimers.delete(debateId);
}

function scheduleDebateEnd(debateId, endAt, io) {
  clearDebateTimer(debateId);
  const timer = setTimeout(() => {
    finalizeDebate(debateId, io).catch((error) => console.error(`Could not finalize ${debateId}:`, error));
  }, Math.max(0, endAt.getTime() - Date.now()));
  debateTimers.set(debateId, timer);
}

async function emitPeerReadiness(io, debateId) {
  const sockets = await io.in(roomName(debateId)).fetchSockets();
  const roles = new Set(
    sockets.filter((connectedSocket) => connectedSocket.data.mediaReady).map((connectedSocket) => connectedSocket.data.role),
  );
  io.to(roomName(debateId)).emit("presence_update", {
    proReady: roles.has("pro"),
    conReady: roles.has("con"),
  });
  if (roles.has("pro") && roles.has("con")) io.to(roomName(debateId)).emit("peer_ready");
}

async function refreshRoomMembership(io, debateId, suppliedDebate) {
  const debate = suppliedDebate || await loadDebate(debateId);
  if (!debate) return;
  const sockets = [...io.sockets.sockets.values()].filter((connectedSocket) =>
    connectedSocket.rooms.has(roomName(debateId)),
  );
  for (const connectedSocket of sockets) {
    const nextRole = roleForDebate(debate, connectedSocket.data.userId);
    if (connectedSocket.data.role !== nextRole) connectedSocket.data.mediaReady = false;
    connectedSocket.data.role = nextRole;
    connectedSocket.data.userId = nextRole === "pro"
      ? debate.proUser?.id
      : nextRole === "con"
        ? debate.conUser?.id
        : null;
  }
}

function scoreWrite(userId, debateId, participant) {
  const data = {
    logic: participant.logic,
    clarity: participant.clarity,
    persuasiveness: participant.persuasiveness,
    tone: participant.tone,
  };
  return prisma.score.upsert({
    where: { userId_debateId: { userId, debateId } },
    create: { ...data, userId, debateId },
    update: data,
  });
}

async function analyzeDebate(debateId, io, { force = false } = {}) {
  if (analysesInFlight.has(debateId)) return;
  analysesInFlight.add(debateId);
  try {
    await flushTranscripts(debateId);
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        proUser: true,
        conUser: true,
        messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } },
      },
    });
    if (!debate || debate.status !== "completed") return;
    if (!force && debate.analysisStatus === "completed" && debate.aiFeedback) return;

    await prisma.debate.update({ where: { id: debateId }, data: { analysisStatus: "analyzing" } });
    io.to(roomName(debateId)).emit("analysis_status", { status: "analyzing" });

    if (!debate.proUser || !debate.conUser) {
      const feedback = {
        status: "insufficient",
        winner: null,
        summary: "Both participants must join before a debate can be judged.",
        pro: { joined: Boolean(debate.proUser) },
        con: { joined: Boolean(debate.conUser) },
        generatedAt: new Date().toISOString(),
      };
      await prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback: feedback, analysisStatus: "completed", winner: null },
      });
      io.to(roomName(debateId)).emit("debate_feedback", feedback);
      return;
    }

    const evidenceLength = (role, transcript) =>
      transcript.length + debate.messages
        .filter((message) => message.role === role)
        .reduce((total, message) => total + message.content.length, 0);
    if (evidenceLength("pro", debate.proTranscript) < 20 || evidenceLength("con", debate.conTranscript) < 20) {
      const feedback = {
        status: "insufficient",
        winner: null,
        summary: "There was not enough recorded argument from both sides to select a fair winner.",
        pro: { joined: true, score: null },
        con: { joined: true, score: null },
        generatedAt: new Date().toISOString(),
      };
      await prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback: feedback, analysisStatus: "completed", winner: null },
      });
      io.to(roomName(debateId)).emit("debate_feedback", feedback);
      return;
    }

    const feedback = await judgeDebate({
      topic: debate.topic,
      proTranscript: debate.proTranscript,
      conTranscript: debate.conTranscript,
      messages: debate.messages,
    });
    await prisma.$transaction([
      prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback: feedback, analysisStatus: "completed", winner: feedback.winner },
      }),
      scoreWrite(debate.proUser.id, debateId, feedback.pro),
      scoreWrite(debate.conUser.id, debateId, feedback.con),
    ]);
    io.to(roomName(debateId)).emit("debate_feedback", feedback);
    io.emit("dashboard_updated", { debateId, winner: feedback.winner });
  } catch (error) {
    console.error(`Analysis failed for debate ${debateId}:`, error);
    const feedback = {
      status: "failed",
      winner: null,
      message: "AI analysis could not be completed. You can safely retry.",
      retryable: true,
      generatedAt: new Date().toISOString(),
    };
    await prisma.debate.update({
      where: { id: debateId },
      data: { aiFeedback: feedback, analysisStatus: "failed", winner: null },
    }).catch((databaseError) => console.error("Could not save analysis failure:", databaseError));
    io.to(roomName(debateId)).emit("debate_feedback", feedback);
  } finally {
    analysesInFlight.delete(debateId);
  }
}

async function finalizeDebate(debateId, io) {
  clearDebateTimer(debateId);
  await flushTranscripts(debateId);
  const updated = await prisma.debate.updateMany({
    where: { id: debateId, status: "in-progress" },
    data: { status: "completed", endTime: new Date(), analysisStatus: "analyzing" },
  });
  if (updated.count > 0) {
    io.to(roomName(debateId)).emit("debate_ended", { analysisStatus: "analyzing" });
  }
  await analyzeDebate(debateId, io);
}

async function recoverActiveDebates(io) {
  const debates = await prisma.debate.findMany({ where: { status: "in-progress" } });
  for (const debate of debates) {
    const startTime = debate.startTime || debate.updatedAt;
    const endAt = new Date(startTime.getTime() + debate.duration * 1_000);
    if (endAt.getTime() <= Date.now()) {
      finalizeDebate(debate.id, io).catch((error) => console.error("Recovery finalization failed:", error));
    } else {
      scheduleDebateEnd(debate.id, endAt, io);
    }
  }

  const interruptedAnalyses = await prisma.debate.findMany({
    where: { status: "completed", analysisStatus: "analyzing" },
    select: { id: true },
  });
  await Promise.allSettled(interruptedAnalyses.map(({ id }) => analyzeDebate(id, io, { force: true })));
}

async function start() {
  await app.prepare();
  await prisma.$connect();
  const httpServer = createServer(async (request, response) => {
    try {
      await handle(request, response, parse(request.url, true));
    } catch (error) {
      console.error("Request handling failed:", error);
      if (!response.headersSent) response.statusCode = 500;
      response.end("Internal server error");
    }
  });

  const allowedOrigins = getAllowedOrigins();
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    maxHttpBufferSize: 250_000,
    cors: {
      credentials: true,
      methods: ["GET", "POST"],
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) callback(null, true);
        else callback(new Error("Origin not allowed"));
      },
    },
  });
  globalThis.debateRealtime = io;
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on("join_debate", async (payload = {}, ack) => {
      try {
        if (!allowSocketEvent(socket, "join", 30, 60_000)) throw new Error("Too many room requests");
        const debateId = payload.debateId;
        if (!isSafeId(debateId)) throw new Error("Invalid debate ID");
        const debate = await loadDebate(debateId);
        if (!debate) throw new Error("Debate not found");
        const role = roleForDebate(debate, socket.data.userId);
        if (!debate.isPublic && role === "viewer") throw new Error("This debate is private");

        const changedDebate = socket.data.debateId !== debateId;
        if (socket.data.debateId) socket.leave(roomName(socket.data.debateId));
        socket.data.debateId = debateId;
        socket.data.role = role;
        socket.data.userId = role === "pro" ? debate.proUser?.id : role === "con" ? debate.conUser?.id : null;
        if (changedDebate) socket.data.mediaReady = false;
        socket.join(roomName(debateId));
        await refreshRoomMembership(io, debateId, debate);
        const transcripts = transcriptStateFor(debate);
        socket.emit("debate_state", {
          status: debate.status,
          startTime: debate.startTime,
          endTime: debate.endTime,
          duration: debate.duration,
          analysisStatus: debate.analysisStatus,
          aiFeedback: debate.aiFeedback,
          winner: debate.winner,
          transcripts,
          role,
        });
        acknowledge(ack, { ok: true, role });
        await emitPeerReadiness(io, debateId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not join debate";
        socketError(socket, message, "JOIN_FAILED");
        acknowledge(ack, { ok: false, error: message });
      }
    });

    socket.on("start_debate", async (payload = {}, ack) => {
      try {
        if (!allowSocketEvent(socket, "start", 10, 60_000)) throw new Error("Too many start requests");
        const debateId = payload.debateId;
        if (socket.data.debateId !== debateId || socket.data.role !== "pro") {
          throw new Error("Only the Pro participant can start this debate");
        }
        const debate = await loadDebate(debateId);
        if (!debate || debate.proUser?.id !== socket.data.userId) throw new Error("Not authorized");
        if (!debate.conUser) throw new Error("Wait for the Con participant to join");
        if (debate.status !== "waiting") throw new Error("This debate has already started");
        const connectedSockets = await io.in(roomName(debateId)).fetchSockets();
        const readyRoles = new Set(
          connectedSockets.filter((connectedSocket) => connectedSocket.data.mediaReady).map((connectedSocket) => connectedSocket.data.role),
        );
        if (!readyRoles.has("pro") || !readyRoles.has("con")) {
          throw new Error("Both participants must start their camera and microphone first");
        }

        const startTime = new Date();
        const result = await prisma.debate.updateMany({
          where: { id: debateId, status: "waiting", conUserId: { not: null } },
          data: { status: "in-progress", startTime, endTime: null, analysisStatus: "idle", winner: null },
        });
        if (result.count !== 1) throw new Error("The debate could not be started");

        const state = transcriptStateFor(debate);
        state.pro = "";
        state.con = "";
        await prisma.debate.update({
          where: { id: debateId },
          data: { proTranscript: "", conTranscript: "", aiFeedback: null },
        });
        scheduleDebateEnd(debateId, new Date(startTime.getTime() + debate.duration * 1_000), io);
        io.to(roomName(debateId)).emit("debate_started", {
          startTime: startTime.toISOString(),
          duration: debate.duration,
        });
        acknowledge(ack, { ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start debate";
        socketError(socket, message, "START_FAILED");
        acknowledge(ack, { ok: false, error: message });
      }
    });

    socket.on("end_debate", async (payload = {}, ack) => {
      try {
        if (!allowSocketEvent(socket, "end", 10, 60_000)) throw new Error("Too many end requests");
        if (socket.data.debateId !== payload.debateId || socket.data.role !== "pro") {
          throw new Error("Only the Pro participant can end this debate");
        }
        const debate = await prisma.debate.findUnique({
          where: { id: payload.debateId },
          select: { status: true, proUserId: true },
        });
        if (!debate || debate.proUserId !== socket.data.userId) throw new Error("Not authorized");
        if (debate.status !== "in-progress") throw new Error("The debate is not active");
        await finalizeDebate(payload.debateId, io);
        acknowledge(ack, { ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not end debate";
        socketError(socket, message, "END_FAILED");
        acknowledge(ack, { ok: false, error: message });
      }
    });

    socket.on("transcript_update", async (payload = {}, ack) => {
      try {
        if (!allowSocketEvent(socket, "transcript", 180, 60_000)) throw new Error("Transcript updates are arriving too quickly");
        const { debateId } = payload;
        const role = socket.data.role;
        if (socket.data.debateId !== debateId || !["pro", "con"].includes(role)) {
          throw new Error("Not authorized to update this transcript");
        }
        const debate = await prisma.debate.findUnique({
          where: { id: debateId },
          select: { id: true, status: true, proUserId: true, conUserId: true, proTranscript: true, conTranscript: true },
        });
        if (!debate || debate.status !== "in-progress") throw new Error("The debate is not active");
        const expectedUserId = role === "pro" ? debate.proUserId : debate.conUserId;
        if (!expectedUserId || expectedUserId !== socket.data.userId) throw new Error("Participant access changed");
        const transcript = cleanTranscript(payload.transcript);
        if (!transcript) return acknowledge(ack, { ok: true });
        const state = transcriptStateFor(debate);
        state[role] = transcript;
        queueTranscriptFlush(debateId, role);
        socket.to(roomName(debateId)).emit("transcript_update", { role, transcript });
        acknowledge(ack, { ok: true });
      } catch (error) {
        acknowledge(ack, { ok: false, error: error instanceof Error ? error.message : "Transcript rejected" });
      }
    });

    socket.on("send_message", async (payload = {}, ack) => {
      try {
        if (!allowSocketEvent(socket, "message", 30, 60_000)) throw new Error("Messages are arriving too quickly");
        const { debateId } = payload;
        const content = typeof payload.content === "string" ? payload.content.trim().slice(0, 2_000) : "";
        const role = socket.data.role;
        if (!content) throw new Error("Message is empty");
        if (socket.data.debateId !== debateId || !["pro", "con"].includes(role)) {
          throw new Error("Not authorized to send messages");
        }
        const debate = await prisma.debate.findUnique({
          where: { id: debateId },
          select: { status: true, proUserId: true, conUserId: true },
        });
        if (debate?.status !== "in-progress") throw new Error("The debate is not active");
        const expectedUserId = role === "pro" ? debate.proUserId : debate.conUserId;
        if (!expectedUserId || expectedUserId !== socket.data.userId) throw new Error("Participant access changed");
        const message = await prisma.message.create({
          data: { content, role, debateId, senderId: socket.data.userId },
          include: { sender: { select: { id: true, username: true } } },
        });
        io.to(roomName(debateId)).emit("new_message", message);
        acknowledge(ack, { ok: true, message });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not send message";
        socketError(socket, message, "MESSAGE_FAILED");
        acknowledge(ack, { ok: false, error: message });
      }
    });

    socket.on("media_ready", async (payload = {}) => {
      if (socket.data.debateId !== payload.debateId || !["pro", "con"].includes(socket.data.role)) return;
      socket.data.mediaReady = true;
      await emitPeerReadiness(io, payload.debateId);
    });

    socket.on("media_not_ready", async (payload = {}) => {
      if (socket.data.debateId !== payload.debateId) return;
      socket.data.mediaReady = false;
      await emitPeerReadiness(io, payload.debateId);
    });

    socket.on("signal", (payload = {}) => {
      if (!allowSocketEvent(socket, "signal", 500, 60_000)) return;
      const { debateId, signal } = payload;
      if (socket.data.debateId !== debateId || !["pro", "con"].includes(socket.data.role)) return;
      if (!signal || JSON.stringify(signal).length > 200_000) return;
      socket.to(roomName(debateId)).emit("signal", { fromRole: socket.data.role, signal });
    });

    socket.on("disconnect", () => {
      if (socket.data.debateId) emitPeerReadiness(io, socket.data.debateId).catch(() => undefined);
    });
  });

  httpServer.on("error", (error) => {
    console.error("HTTP server error:", error);
    process.exitCode = 1;
  });
  httpServer.listen(port, hostname, () => {
    console.log(`DebateArena ready at http://${hostname === "0.0.0.0" ? "localhost" : hostname}:${port}`);
  });
  await recoverActiveDebates(io);

  async function shutdown(signal) {
    console.log(`${signal} received; shutting down cleanly.`);
    for (const timer of debateTimers.values()) clearTimeout(timer);
    for (const timer of transcriptFlushTimers.values()) clearTimeout(timer);
    io.close();
    httpServer.close();
    delete globalThis.debateRealtime;
    await prisma.$disconnect();
    process.exit(0);
  }
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async (error) => {
  console.error("Server failed to start:", error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
