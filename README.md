# DebateArena

DebateArena is a real-time video debate app with browser speech-to-text, persisted transcripts, Gemini scoring, winner selection, chat, profiles, and a live leaderboard.

## How the debate flow works

1. An authenticated user creates a public or private debate and becomes the Pro participant.
2. A second authenticated user joins as Con with the private join code.
3. Each participant clicks **Start camera**. The browser asks for camera and microphone access only after that user gesture.
4. When both participants are media-ready, Pro starts the debate.
5. WebRTC carries peer-to-peer audio/video. Socket.IO carries authenticated signaling, chat, presence, timer state, and transcript snapshots.
6. The browser Web Speech API produces separate Pro and Con transcripts. The server continuously persists the latest complete snapshot for recovery.
7. At timeout, or when Pro ends the debate, the server flushes transcripts and marks analysis as in progress.
8. Gemini returns schema-constrained feedback. The server validates and clamps all scores, derives the winner from the four category averages, then saves feedback, winner, score records, and earned achievements in one database transaction.
9. Results clearly identify the decision as transcript-based, show assessment confidence, and are broadcast immediately to the room, profiles, and leaderboard. Failed analysis can be retried without creating duplicate scores.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind CSS
- Custom Node server with Socket.IO
- First-party email/password authentication with database-backed sessions
- Prisma with PostgreSQL
- WebRTC through `simple-peer`
- Browser Web Speech API
- Google Gemini structured output

No Docker setup is required.

## Local setup

Requirements: Node.js 18.18 or newer, npm, a PostgreSQL database, and a Gemini API key.

```bash
npm install
copy .env.example .env.local
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

Use `cp .env.example .env.local` instead of `copy` on macOS or Linux. Do not run `next dev` directly: `npm run dev` starts the custom server required for Socket.IO.

## Environment variables

```env
DATABASE_URL=postgresql://user:password@host/database

GEMINI_API_KEY=replace_me
GEMINI_MODEL=gemini-2.5-flash
SITE_URL=http://localhost:3000
```

`SITE_URL` is optional on Render because the app automatically accepts Render's
`RENDER_EXTERNAL_URL`. Set it to the exact HTTPS origin when using a custom domain.
Use `ALLOWED_ORIGINS` for additional comma-separated origins.

Optional production WebRTC relay variables:

```env
NEXT_PUBLIC_TURN_URL=turn:turn.example.com:3478
NEXT_PUBLIC_TURN_USERNAME=replace_me
NEXT_PUBLIC_TURN_CREDENTIAL=replace_me
```

Keep all real credentials in ignored local environment files or the deployment platform's secret manager. Variables beginning with `NEXT_PUBLIC_` are intentionally included in browser bundles and must never contain secrets.

TURN credentials are necessarily delivered to the browser. Use restricted,
short-lived TURN credentials in production rather than an administrator password
or another reusable secret.

## Render deployment

The repository includes a native Node `render.yaml`; it does not use Docker. For
a manually configured Render Web Service, use:

```text
Build Command: npm ci && npm run build
Start Command: npm start
Health Check Path: /api/health
```

Add these values under **Environment**:

```env
DATABASE_URL=<your PostgreSQL connection string>
GEMINI_API_KEY=<a fresh key created in Google AI Studio>
GEMINI_MODEL=gemini-2.5-flash
```

Do not add `PORT`; Render supplies it. Do not prefix `GEMINI_API_KEY` with
`NEXT_PUBLIC_`, paste it into the build command, or commit it to an environment
file. If you use a custom domain, also set `SITE_URL=https://your-domain.example`.
The `/api/health` response reports whether the database is reachable and whether
the AI key is configured, without exposing the key.

Keep this stateful Socket.IO/WebRTC service at one application instance unless
you add a shared Socket.IO adapter and distributed coordination for room presence,
transcript buffers, and timers.

## Commands

```bash
npm run dev          # custom Next.js + Socket.IO development server
npm run build        # production Next.js build
npm start            # custom production server
npm run lint         # ESLint
npm run typecheck    # TypeScript without emitting files
npm run check        # lint, typecheck, and production build
npm run db:generate  # regenerate the Prisma client
npm run db:migrate   # apply committed production migrations
npm run db:seed      # idempotently add realistic demo profiles and debates
```

The seed creates six profiles and eight completed debates with transcripts,
messages, structured feedback, rankings, and achievements. Seeded profiles cannot
sign in by default. Set `SEED_DEMO_PASSWORD` to intentionally enable first-party
login for all seeded profiles. Production seeding also requires the explicit
`ALLOW_DATABASE_SEED=true` safety flag.

To replace all existing application records with the curated seed set, run the
seed once with `RESET_DATABASE_DATA=true` and `ALLOW_DATABASE_RESET=true`. Remove
those flags immediately afterward. A normal `npm run db:seed` is non-destructive
and idempotent.

Useful diagnostics:

```bash
node scripts/check-db.cjs
node scripts/check-ai.cjs
node scripts/check-http.cjs  # while the app is running
```

The database check is read-only. The AI check makes one small Gemini request and therefore uses API quota.

## Browser and deployment notes

- Speech recognition needs a browser with Web Speech recognition support and a secure context. `localhost` works for development; production should use HTTPS.
- Chrome and Edge currently provide the most reliable continuous speech-recognition behavior. The UI shows a clear fallback message in unsupported browsers.
- WebRTC uses a public STUN server by default. Configure a TURN relay for reliable production connectivity across restrictive corporate or mobile networks.
- Deploy to a host that runs the persistent custom Node process and supports WebSockets. A serverless-only Next.js deployment will not run this Socket.IO lifecycle correctly.
- Render's public origin is detected automatically. Set `SITE_URL` for a custom domain so Socket.IO connections remain restricted to known origins.

## Security model

- Accounts use scrypt password hashing and opaque, database-backed sessions stored in HTTP-only, SameSite cookies.
- HTTP mutations and Socket.IO participants use the same first-party session; client-supplied user IDs and roles are ignored.
- Cross-site mutation requests are rejected and authentication attempts are rate-limited.
- Private debates are visible only to their participants. Join codes are returned only to the creator and compared safely.
- Debate creation, joining, messaging, voting, topic generation, and analysis retry endpoints are rate-limited.
- Only Pro can start or end a debate, and both participants must report media readiness before it starts.
- Transcript text is treated as untrusted evidence in the AI prompt and is length-limited.
- AI output is schema-constrained, validated server-side, and cannot directly choose the winner.
- A database uniqueness constraint prevents duplicate score rows for one user and debate.
- API errors do not expose database details, credentials, password hashes, session tokens, or participant email addresses.

## Troubleshooting

**Camera or transcript does not start**

Use HTTPS or localhost, grant camera and microphone permissions, and click **Start camera** for each participant. If recognition stops because of a transient browser error, use the retry control shown beside the transcript status.

**Participants cannot see each other**

Confirm both participants clicked **Start camera** and that Socket.IO is connected. If it fails only on restrictive networks, configure TURN credentials.

**Analysis failed**

Check `GEMINI_API_KEY`, outbound network access, and the server log. A completed debate shows a retry action to an authenticated participant; retrying upserts the existing scores rather than duplicating them.

**Build fails on a Windows exFAT drive with `EISDIR: illegal operation on a directory, readlink`**

This is a filesystem limitation in the Next.js tracing step. Build from an NTFS volume or deploy from a Linux filesystem; application linting, type checking, and development remain unaffected.
