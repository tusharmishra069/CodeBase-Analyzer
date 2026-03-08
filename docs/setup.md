# Deployment Guide — AI Code Analyzer

> **Current stack:** FastAPI 0.135 · Gunicorn 25 · Next.js 16 · React 19 · Neon PostgreSQL · Groq LLM

---

## Table of Contents

1. [Deployment Readiness Checklist](#1-deployment-readiness-checklist)
2. [Prerequisites](#2-prerequisites)
3. [Project Structure](#3-project-structure)
4. [External Services](#4-external-services)
5. [Generate an API Key](#5-generate-an-api-key)
6. [Running Locally (Dev)](#6-running-locally-dev)
7. [Deploy: Backend on Railway](#7-deploy-backend-on-railway)
8. [Deploy: Frontend on Vercel](#8-deploy-frontend-on-vercel)
9. [Deploy: Full Stack via Docker Compose](#9-deploy-full-stack-via-docker-compose)
10. [Environment Variable Reference](#10-environment-variable-reference)
11. [Verifying the Stack](#11-verifying-the-stack)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Deployment Readiness Checklist

Both services are **production-ready** as of the current commit.

### ✅ Backend (FastAPI)

| Item | Status |
|---|---|
| Layered `app/` package (routes / services / schemas / core / models) | ✅ |
| Gunicorn + UvicornWorker production server (`gunicorn.conf.py`) | ✅ |
| Multi-stage `Dockerfile` (builder → slim runtime, non-root user) | ✅ |
| `lifespan` startup: env validation + `CREATE TABLE IF NOT EXISTS` | ✅ |
| CORS middleware (explicit origins, `credentials=True`) | ✅ |
| HMAC-SHA256 API key auth (`require_api_key` FastAPI dependency) | ✅ |
| Rate limiting via `slowapi` (10/min AI, 120/min polling, 60/min default) | ✅ |
| Security response headers (HSTS, X-Frame-Options, etc.) | ✅ |
| Swagger/ReDoc disabled in production | ✅ |
| Neon PostgreSQL via SQLAlchemy 2 (pool_size=5) | ✅ |
| Worker race-condition fix (result saved before COMPLETED status) | ✅ |
| `requirements.txt` with pinned deps | ✅ |

### ✅ Frontend (Next.js)

| Item | Status |
|---|---|
| `output: "standalone"` in `next.config.ts` | ✅ |
| Multi-stage `Dockerfile` (deps → builder → alpine runner) | ✅ |
| `apiFetch` helper in `src/lib/api.ts` (injects `X-API-Key` header) | ✅ |
| Security headers (`next.config.ts` headers callback) | ✅ |
| All 4 fetch call sites use `apiFetch` | ✅ |

### ⚠️ Before deploying — rotate your secrets

Your `backend/.env` credentials have been exposed. **Do this before going live:**

1. **Groq** → [console.groq.com](https://console.groq.com) → API Keys → revoke + create new
2. **Neon** → [console.neon.tech](https://console.neon.tech) → project → Settings → Reset password
3. **API_SECRET_KEY** → run `cd backend && python -m app.core.security` for a fresh key
4. **GitHub token** → [github.com/settings/tokens](https://github.com/settings/tokens) → delete + regenerate

---

## 2. Prerequisites

| Tool | Minimum | Notes |
|---|---|---|
| Python | **3.12** | `str | None` syntax; 3.14 also tested |
| Node.js | **20 LTS** | |
| npm | **10** | Ships with Node 20 |
| Git | any | Required at runtime — backend clones repos |
| Docker + Compose | 24 / 2.x | Only needed for Docker deployments |

```bash
# macOS
brew install python@3.12 node git
```

---

## 3. Project Structure

```
ai-code-analyzer/
├── backend/
│   ├── app/
│   │   ├── api/routes/        analysis.py  profile.py
│   │   ├── core/              config.py  database.py  limiter.py  security.py
│   │   ├── models/            job.py
│   │   ├── schemas/           analysis.py  profile.py
│   │   └── services/          ai_engine.py  github_service.py  repo_parser.py
│   │                          roast_generator.py  profile_review_generator.py  worker.py
│   ├── main.py                FastAPI app factory + middleware
│   ├── gunicorn.conf.py       2 workers · UvicornWorker · 300s timeout
│   ├── requirements.txt       30 pinned deps
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/               repo-analysis/  profile-review/  profile-roast/
│   │   ├── components/        Navbar  Footer  Features  Pricing  ThreeDScene
│   │   └── lib/api.ts         apiFetch helper (injects X-API-Key)
│   ├── next.config.ts         standalone output + security headers
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── env.example
```

---

## 4. External Services

### 4.1 Groq (LLM) — required

1. Sign up at [console.groq.com](https://console.groq.com)
2. **API Keys** → Create API key
3. Save as `GROQ_API_KEY`
4. Default model: `llama-3.3-70b-versatile` (free tier, no card required)

### 4.2 PostgreSQL — required

The app calls `CREATE TABLE IF NOT EXISTS` on startup — no migrations needed.

| Platform | Free tier | Connection string format |
|---|---|---|
| **Neon** ✅ recommended | ✅ | `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&channel_binding=require` |
| Supabase | ✅ | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| Railway | limited | `postgresql://postgres:pass@xxx.railway.app:5432/railway` |
| Local | — | `postgresql://postgres:postgres@localhost:5432/codeanalyzer` |

### 4.3 GitHub Personal Access Token — optional

Without a token: **60 requests/hour** per IP. With a token: **5 000 requests/hour**.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. **Generate new token (classic)**
3. Scope: ✅ `public_repo` only
4. Save as `GITHUB_TOKEN`

---

## 5. Generate an API Key

The backend uses a single pre-shared secret. The **same value** goes in both services.

```bash
cd backend
source venv/bin/activate
python -m app.core.security
```

Output:
```
New API key generated:
  a3f9e2d1c8b74f560e9a1d23b56c78ef...

Set in backend:   API_SECRET_KEY=a3f9e2d1c8b74f560e9a1d23b56c78ef...
Set in frontend:  NEXT_PUBLIC_API_KEY=a3f9e2d1c8b74f560e9a1d23b56c78ef...
```

- `backend/.env` → `API_SECRET_KEY=<value>`
- `frontend/.env.local` → `NEXT_PUBLIC_API_KEY=<same value>`

> **Dev bypass:** When `APP_ENV=development` and `API_SECRET_KEY` is blank, all requests are allowed through with a warning log. Never ship this to prod.

---

## 6. Running Locally (Dev)

### Backend

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Minimum `backend/.env` for dev:

```dotenv
APP_ENV=development
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
# API_SECRET_KEY=        ← leave blank for dev bypass
# GITHUB_TOKEN=          ← optional
```

```bash
uvicorn main:app --reload --port 8000
```

| Endpoint | URL |
|---|---|
| Swagger UI | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| ReDoc | http://localhost:8000/redoc |

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

`frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=        # leave blank in dev
```

```bash
npm run dev
# → http://localhost:3000
```

---

## 7. Deploy: Backend on Railway

Railway detects the `Dockerfile` automatically — zero extra config needed.

### Steps

1. Push this repo to GitHub (already at `tusharmishra069/CodeBase-Analyzer`)

2. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**

3. Select `tusharmishra069/CodeBase-Analyzer` → set **Root directory** to `backend`

4. Railway builds from the `Dockerfile` automatically

5. **Variables** tab → add all required vars:

```
APP_ENV                = production
GROQ_API_KEY           = gsk_xxxxxxxxxxxxxxxxxxxx
DATABASE_URL           = postgresql://...?sslmode=require
API_SECRET_KEY         = <generated in §5>
ALLOWED_ORIGINS        = https://your-frontend.vercel.app
GITHUB_TOKEN           = ghp_xxxxxxxxxxxxxxxxxxxx
```

6. **Settings** → **Networking** → **Generate Domain**  
   Note the URL: `https://codeanalyzer-backend.up.railway.app`

7. Verify:

```bash
curl https://codeanalyzer-backend.up.railway.app/health
# → {"status":"ok","env":"production",...}
```

> Add `WEB_CONCURRENCY=4` to Railway Variables to increase Gunicorn workers beyond the default 2.

---

## 8. Deploy: Frontend on Vercel

### Steps

1. [vercel.com](https://vercel.com) → **New Project** → Import `tusharmishra069/CodeBase-Analyzer`

2. Set **Root Directory** to `frontend`

3. Framework preset auto-detects as **Next.js**

4. **Environment Variables** → add:

```
NEXT_PUBLIC_API_URL  = https://codeanalyzer-backend.up.railway.app
NEXT_PUBLIC_API_KEY  = <same value as API_SECRET_KEY on backend>
```

5. Click **Deploy**

6. Copy the Vercel URL (e.g. `https://codeanalyzer.vercel.app`)

7. Go back to Railway → update `ALLOWED_ORIGINS` to include the Vercel URL:

```
ALLOWED_ORIGINS = https://codeanalyzer.vercel.app
```

8. Redeploy Railway backend (Deployments → Redeploy) to pick up the CORS change

### Custom domain (optional)

Vercel: **Settings** → **Domains** → add your domain  
Railway: **Settings** → **Networking** → **Custom Domain**

---

## 9. Deploy: Full Stack via Docker Compose

For a VPS (DigitalOcean, Hetzner, EC2, etc.):

```bash
git clone https://github.com/tusharmishra069/CodeBase-Analyzer.git
cd CodeBase-Analyzer

cp env.example .env
nano .env
```

Fill in `.env`:

```dotenv
# ── Backend ───────────────────────────────────────────────────────────────────
APP_ENV=production
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
API_SECRET_KEY=<generate: cd backend && python -m app.core.security>
ALLOWED_ORIGINS=http://your-server-ip:3000,https://yourdomain.com
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# ── Frontend ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://your-server-ip:8000
NEXT_PUBLIC_API_KEY=<same value as API_SECRET_KEY>
```

```bash
docker compose up -d --build
docker compose logs -f
docker compose ps
```

| Service | Port | Health check |
|---|---|---|
| `backend` | `8000` | `http://localhost:8000/health` |
| `frontend` | `3000` | `http://localhost:3000` |

> The frontend waits for the backend health check before starting (`depends_on: condition: service_healthy`).

```bash
docker compose down           # stop and remove containers
docker compose restart        # restart all services
```

---

## 10. Environment Variable Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ | — | Groq API key |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `API_SECRET_KEY` | ✅ prod | — | Auth token. Blank → dev bypass active |
| `APP_ENV` | — | `development` | Set `production` to enable all guards |
| `ALLOWED_ORIGINS` | ✅ prod | `http://localhost:3000` | Comma-separated list of trusted frontend origins |
| `GITHUB_TOKEN` | — | — | GitHub PAT for higher rate limits |
| `GROQ_MODEL` | — | `llama-3.3-70b-versatile` | Override Groq model |
| `MAX_FILE_COUNT` | — | `120` | Max files parsed per repo |
| `MAX_FILE_SIZE_BYTES` | — | `524288` | Max single file size (bytes) |
| `RATE_LIMIT_DEFAULT` | — | `60/minute` | Default rate limit |
| `RATE_LIMIT_AI` | — | `10/minute` | Limit on `/api/analyze`, `/api/roast`, `/api/profile-review` |
| `RATE_LIMIT_STATUS` | — | `120/minute` | Limit on `/api/jobs/{id}/status` |

### Frontend (`frontend/.env.local` / `.env.production.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | — | `http://localhost:8000` | Backend base URL — **must include `http://`**, no trailing slash |
| `NEXT_PUBLIC_API_KEY` | ✅ prod | — | Must exactly match `API_SECRET_KEY` on the backend |

> `NEXT_PUBLIC_*` vars are **baked into the browser bundle at build time**. Changing them requires a rebuild / redeploy.

---

## 11. Verifying the Stack

### Health check

```bash
curl https://your-backend.railway.app/health
# {"status":"ok","service":"AI Code Analyzer API","version":"2.0.0","env":"production"}
```

### Auth check

```bash
# No key → 401
curl -s -o /dev/null -w "%{http_code}" \
  -X POST https://your-backend.railway.app/api/roast \
  -H "Content-Type: application/json" \
  -d '{"username":"torvalds"}'

# Correct key → 200
curl -s -X POST https://your-backend.railway.app/api/roast \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"username":"torvalds"}'
```

### Rate limit check (should hit 429 after 10 requests)

```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://your-backend.railway.app/api/roast \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_KEY" \
    -d '{"username":"torvalds"}'
done
# First 10 → 200, then → 429
```

### Docker Compose

```bash
docker compose ps                    # status should be "healthy"
docker compose logs backend --tail 20
docker compose logs frontend --tail 20
```

---

## 12. Troubleshooting

### `Missing required environment variables: GROQ_API_KEY is required`
Backend validates required vars on startup. Check `backend/.env` exists with all values filled. In Docker pass `--env-file .env`.

### `ALLOWED_ORIGINS must not contain '*' in production`
Set explicit origins: `ALLOWED_ORIGINS=https://yourdomain.com`

### `psycopg2.OperationalError: could not connect`
- Neon/Supabase require `?sslmode=require` in the URL
- Old `postgres://` prefix is auto-corrected to `postgresql://`
- Check firewall / IP allowlist on the DB provider dashboard

### `401 Unauthorized` on all API calls
- **Dev:** Leave `API_SECRET_KEY` blank — requests pass through automatically
- **Prod:** Confirm `API_SECRET_KEY` (backend) exactly matches `NEXT_PUBLIC_API_KEY` (frontend)

### `Backend connection failed` in the frontend
- `NEXT_PUBLIC_API_URL` must include the protocol: `http://localhost:8000` not `localhost:8000`
- Check CORS: the frontend origin must be in `ALLOWED_ORIGINS`

### `429 Too Many Requests`
Rate limit hit. Increase: add `RATE_LIMIT_AI=30/minute` to `backend/.env` and restart.

### Report not showing after analysis (shows only footer)
Fixed in current code — `job.result` is now committed atomically with `status=COMPLETED` in `app/services/worker.py`.

### `NEXT_PUBLIC_API_KEY` is `undefined` in browser
Must be present at **build time**. On Vercel: add the env var then trigger a redeploy. In Docker: pass `--build-arg NEXT_PUBLIC_API_KEY=...` at build time.

### Docker build fails on `torch` (ARM / Apple Silicon)
```bash
docker buildx build --platform linux/amd64 -t codeanalyzer-backend ./backend
```

### Gunicorn worker timeout on large repos
Default timeout is 300s. For very large repos add `GUNICORN_TIMEOUT=600` or edit `gunicorn.conf.py` → `timeout = 600`.