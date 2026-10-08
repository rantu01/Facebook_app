# AI Content Autopilot

Production-ready AI-powered automated social media content creation and publishing platform (Facebook Pages).

## Architecture

- `frontend/` — Next.js 14 (JS only) admin dashboard, Tailwind, lucide-react, recharts. Includes a **Test Lab** page (`/test-lab`) to verify Gemini, photo/video publishing, and Veo status end-to-end.
- `backend/` — Node.js + Express REST API, Mongoose, Gemini + Facebook Graph integrations, FFmpeg pipeline. All job stages live in `backend/src/workers/` and run **inline by default** (`USE_QUEUE=false`) — no separate worker process needed. Set `USE_QUEUE=true` + `REDIS_URL` to switch on BullMQ queues later.
- `storage/` — Local media during dev (generated/thumbnails/temp/music). S3-compatible abstraction ready.
- `docker-compose.yml` — MongoDB + Redis (both optional; only MongoDB is required).

Browser → Backend → External API always. Secrets never leave the server.

## Requirements

- Node.js 20+
- MongoDB 7, Redis 7 (`docker compose up -d`)
- FFmpeg + ffprobe on PATH (`ffmpeg -version`)
- Google Gemini API key (text + Veo video where your account supports it)
- Meta Developer app + Facebook Page you admin

## Quick start (local)

```bash
docker compose up -d
```

Terminal 1 (backend, port 5000):
```bash
cd backend && npm install && cp .env.example .env && npm run dev
```

Terminal 2 (frontend, port 3000):
```bash
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

No worker terminal needed. Only MongoDB is required (`docker compose up -d mongo`, or your Atlas URI).

## Deploying the backend on Vercel

The backend ships Vercel-ready (`backend/api/index.js` + `backend/vercel.json`): create a Vercel project rooted at `backend/`, set all `backend/.env` vars in Vercel's environment settings, and keep `USE_QUEUE=false`.

Honest limits on Vercel (serverless): functions time out after ~10–60s and disk is ephemeral, so **long jobs will fail there** — Veo video polling (minutes), FFmpeg assembly, and sometimes long Gemini calls. The Test Lab page reports these failures truthfully. Recommended split: **frontend on Vercel + backend on a long-running host** (VPS with the included PM2 `ecosystem.config.js`, or Render/Railway), where the full automation pipeline works without limits.

Seed admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` on first boot. Login at http://localhost:3000/login.

## Environment

See `backend/.env.example` for the full list: Mongo, JWT, Gemini (`GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_VIDEO_MODEL`), Meta (`META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`), Redis, storage, daily cost limits.

Facebook OAuth callback must exactly match `META_REDIRECT_URI` in the Meta app settings:
`http://localhost:5000/api/facebook/oauth/callback`.

## Real workflow

1. Set Gemini key → dashboard shows Gemini ✓ Connected.
2. Facebook Pages → Connect Page → approve → token stored encrypted server-side (never returned to browser).
3. Content Settings → niche AI/Technology, language Bengali, tone, videos/day.
4. Automation → enable, set research 06:00, posting 10:00/20:00 (Asia/Dhaka).
5. System runs: research → analyse → select → script → video (Veo op polling) → voice → subtitles → FFmpeg final → SEO → quality gate → schedule → publish → post ID saved.

Missing credentials surface as explicit `*_NOT_CONFIGURED` states — nothing is faked.

## Production (VPS)

- Nginx reverse proxy → backend :5000, frontend :3000.
- `pm2 start ecosystem.config.js`, `pm2 save`, `pm2 startup`.
- MongoDB + Redis with persistence; daily backups.
- Set `NODE_ENV=production`, strong `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY` (32+ chars), and real Meta/Gemini keys.

## Testing

```bash
cd backend && npm test
```

External APIs are mocked in tests; no real Gemini/Meta calls.

## Policies respected

Official Meta Graph API only. No browser automation, no scraping Facebook, minimal Page data stored. Trend sources are RSS/official feeds. No guaranteed-viral claims anywhere.
