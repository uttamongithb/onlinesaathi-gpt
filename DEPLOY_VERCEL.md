# Deploying OnlineSaathi-GPT to Vercel (Single Service)

This repo is configured to deploy **both** the frontend (Vite client) and backend (Express API) as a **single Vercel service**.

## Architecture
- **Frontend**: Static SPA built from `/client` → served from `client/dist`
- **Backend**: Serverless function at `api/[...slug].js` → handles all `/api/*`, `/oauth/*`, `/images/*`, `/health` routes

## Files Structure
- `api/[...slug].js` — Catch-all Vercel Serverless Function
- `api/server/vercel-app.js` — Lightweight Express app initializer for serverless
- `vercel.json` — Build configuration & routing rules

## Required Environment Variables

Set these in **Vercel Dashboard** → Project Settings → Environment Variables:

### Required
| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `CREDS_KEY` | Encryption key for credentials |
| `CREDS_IV` | Encryption IV for credentials |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |

### Optional (AI Providers)
| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_API_KEY` | Google AI API key |

### Optional (Search)
| Variable | Description |
|----------|-------------|
| `SEARCH` | Enable search (`true`/`false`) |
| `MEILI_HOST` | MeiliSearch host URL |
| `MEILI_MASTER_KEY` | MeiliSearch master key |

## Deploy Steps

### Option 1: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Configure environment variables in Project Settings
3. Deploy!

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

## Local Testing

### Standard Development
```bash
npm run dev
```

### Serverless Testing
```bash
npm i -g vercel
vercel dev
```

## Limitations & Notes

1. **Cold Starts**: First request after idle may be slower (~2-5s)
2. **No WebSockets**: Streaming uses Server-Sent Events (SSE) instead
3. **60s Timeout**: Serverless functions have max 60s execution time
4. **1GB Memory**: Functions run with 1GB memory limit
5. **No Cluster Mode**: Multi-worker clustering not available in serverless

## Troubleshooting

### Function Timeout
Long AI responses may timeout. Consider:
- Using streaming responses
- Implementing response chunking
- Setting `maxDuration: 60` in `vercel.json` (Pro plan supports up to 300s)

### Database Connection
MongoDB connections are cached between warm invocations to minimize connection overhead.

### Build Failures
Ensure all packages build correctly:
```bash
npm run build:packages
cd client && npm run build
```
