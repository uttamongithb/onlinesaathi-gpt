# OnlineSaathi GPT - Backend र Frontend अलग-अलग Deploy गर्ने Guide

यो guide ले तपाईंलाई OnlineSaathi GPT को backend (API) र frontend (Client) अलग-अलग servers मा deploy गर्न सिकाउँछ।

## 📁 Project Structure

```
onlinesaathi-gpt/
├── api/                    # Backend (Express.js API Server)
├── client/                 # Frontend (React + Vite)
├── packages/               # Shared packages (data-provider, schemas, etc.)
├── config/                 # Configuration scripts
└── ...
```

## 🚀 Quick Start

### Development मा (Locally)

दुबै एकसाथ run गर्न:
```bash
npm run dev
```

### Production मा अलग-अलग Deploy

#### Option 1: Backend र Frontend एउटै server मा (Traditional)
```bash
npm run frontend        # Frontend build गर्छ
npm run backend         # Backend start गर्छ (frontend serve पनि गर्छ)
```

#### Option 2: Backend र Frontend अलग-अलग servers मा (Recommended for Scale)

##### Backend Deploy:
```bash
# 1. Environment configure गर्नुहोस्
cp api/.env.example api/.env
# CORS_ALLOWED_ORIGINS मा frontend को URL add गर्नुहोस्

# 2. Backend build र start गर्नुहोस्
npm run backend:only
```

##### Frontend Deploy:
```bash
# 1. Environment configure गर्नुहोस्
cp client/.env.example client/.env
# VITE_API_BASE_URL मा backend को URL set गर्नुहोस्

# 2. Frontend build गर्नुहोस्
npm run frontend:only

# Build files client/dist/ मा हुन्छन्
# यसलाई Nginx, Vercel, Netlify, etc. मा serve गर्न सक्नुहुन्छ
```

---

## 🔧 Detailed Configuration

### Backend Configuration (api/.env)

```env
# Server Port
PORT=3080
HOST=0.0.0.0

# CORS - Frontend URLs यहाँ add गर्नुहोस् (comma-separated)
CORS_ALLOWED_ORIGINS=https://app.onlinesaathi.com,https://onlinesaathi.com

# Domain Configuration
DOMAIN_CLIENT=https://app.onlinesaathi.com
DOMAIN_SERVER=https://api.onlinesaathi.com

# MongoDB
MONGO_URI=mongodb://your-mongo-host:27017/onlinesaathi
```

### Frontend Configuration (client/.env)

```env
# Backend API URL
VITE_API_BASE_URL=https://api.onlinesaathi.com

# Development server port
PORT=3090
```

---

## 🐳 Docker Deployment

### Backend Only (Docker)

```dockerfile
# Dockerfile.backend
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
COPY api/ ./api/
COPY packages/ ./packages/
COPY config/ ./config/

RUN npm ci --only=production
RUN npm run build:packages

EXPOSE 3080
CMD ["npm", "run", "backend:only"]
```

### Frontend Only (Docker + Nginx)

```dockerfile
# Dockerfile.frontend
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
COPY client/ ./client/
COPY packages/ ./packages/

RUN npm ci
RUN npm run frontend:only

FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose (Separate Services)

```yaml
# docker-compose.separate.yml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3080:3080"
    environment:
      - CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.onlinesaathi.com
      - MONGO_URI=mongodb://mongo:27017/onlinesaathi
    depends_on:
      - mongo

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        - VITE_API_BASE_URL=http://localhost:3080
    ports:
      - "3000:80"

  mongo:
    image: mongo:latest
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

---

## ☁️ Cloud Deployment Examples

### Vercel (Frontend) + Railway/Render (Backend)

#### Frontend (Vercel)
1. Vercel मा project connect गर्नुहोस्
2. Build settings:
   - **Build Command:** `npm run frontend:only`
   - **Output Directory:** `client/dist`
   - **Install Command:** `npm ci`
3. Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-backend.railway.app`

#### Backend (Railway/Render)
1. Backend service create गर्नुहोस्
2. Environment Variables set गर्नुहोस्:
   - `PORT`: `3080`
   - `CORS_ALLOWED_ORIGINS`: `https://your-app.vercel.app`
   - `MONGO_URI`: Your MongoDB connection string
   - Other API keys...

### AWS (EC2 / ECS)

```bash
# Backend - EC2/ECS
PORT=3080 CORS_ALLOWED_ORIGINS=https://d123.cloudfront.net npm run backend:only

# Frontend - S3 + CloudFront
npm run frontend:only
aws s3 sync client/dist/ s3://your-bucket/
```

---

## 🔄 NPM Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Backend + Frontend development server |
| `npm run backend` | Production backend (serves frontend too) |
| `npm run backend:dev` | Development backend only |
| `npm run backend:only` | Production backend (API only) |
| `npm run backend:only:dev` | Development backend (API only) |
| `npm run frontend` | Build frontend |
| `npm run frontend:only` | Build frontend for separate deployment |
| `npm run frontend:only:dev` | Development frontend server |
| `npm run frontend:only:preview` | Preview built frontend |

---

## 🛡️ Security Considerations

1. **CORS Configuration**: Production मा only trusted origins allow गर्नुहोस्
2. **HTTPS**: दुबै backend र frontend मा HTTPS use गर्नुहोस्
3. **Environment Variables**: Sensitive data environment variables मा राख्नुहोस्
4. **API Rate Limiting**: Backend मा rate limiting configure गर्नुहोस्

---

## 🔍 Troubleshooting

### CORS Errors
```
Access to fetch at 'https://api.example.com' from origin 'https://app.example.com' 
has been blocked by CORS policy
```
**Solution**: Backend को `CORS_ALLOWED_ORIGINS` मा frontend URL add गर्नुहोस्

### API Connection Failed
```
Error: Network Error / Failed to fetch
```
**Solution**: 
1. Frontend को `VITE_API_BASE_URL` check गर्नुहोस्
2. Backend running छ कि छैन confirm गर्नुहोस्
3. Firewall/Security groups check गर्नुहोस्

### Cookie/Session Issues
Cross-domain cookies को लागि:
1. Backend मा `credentials: true` CORS config मा छ
2. Frontend मा `withCredentials: true` API requests मा छ
3. Same-site cookie policy check गर्नुहोस्

---

## 📞 Support

Issues वा questions को लागि GitHub Issues मा report गर्नुहोस्।
