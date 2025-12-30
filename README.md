# Online Saathi

<p align="center">
  <img src="client/public/assets/logo.svg" height="128">
  <h1 align="center">Online Saathi - AI Chat Application</h1>
</p>

A modern AI chat application that supports multiple AI models and providers.

## ✨ Features

- 🤖 **Multi AI Model Support**: OpenAI, Anthropic Claude, Google, Azure, and more
- 💬 **Real-time Chat**: Seamless conversation experience
- 🎨 **Modern UI**: Clean and responsive design
- �� **Secure**: User authentication and data protection
- 📱 **Responsive**: Works on desktop and mobile

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- npm

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/thapahemraj/onlinesaathi-gpt.git
cd onlinesaathi-gpt
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure Backend Environment**
```bash
cp api/.env.example api/.env
# Edit api/.env with your settings (MongoDB, API keys, etc.)
```

4. **Configure Frontend Environment**
```bash
cp client/.env.example client/.env
# Edit client/.env if needed
```

## 🖥️ Running the Application

### Option 1: Run Backend and Frontend Together (Development)
```bash
npm run dev
```

### Option 2: Run Separately (Recommended)

**Terminal 1 - Start Backend First:**
```bash
npm run backend:dev
# Backend runs at http://localhost:3080
```

**Terminal 2 - Start Frontend:**
```bash
npm run frontend:dev
# Frontend runs at http://localhost:3090
```

### Production Mode
```bash
# Build everything
npm run build

# Start backend
npm run start:backend

# In another terminal, start frontend
npm run start:frontend
```

## �� Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend + backend (development) |
| `npm run backend:dev` | Start only backend in dev mode |
| `npm run frontend:dev` | Start only frontend in dev mode |
| `npm run build` | Build everything for production |
| `npm run start:backend` | Start backend in production |
| `npm run start:frontend` | Start frontend in production |

## 📁 Project Structure

```
onlinesaathi-gpt/
├── api/              # Backend server (Node.js/Express)
│   ├── .env          # Backend environment variables
│   └── server/       # Server code
├── client/           # Frontend (React/Vite)
│   ├── .env          # Frontend environment variables
│   └── src/          # React source code
├── packages/         # Shared packages
└── config/           # Configuration scripts
```

## 🔧 Environment Variables

### Backend (api/.env)
- `MONGO_URI` - MongoDB connection string (Required)
- `CREDS_KEY`, `CREDS_IV` - Encryption keys (Required)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT tokens (Required)
- `OPENAI_API_KEY` - OpenAI API key
- `GOOGLE_KEY` - Google AI API key
- `ANTHROPIC_API_KEY` - Anthropic API key

### Frontend (client/.env)
- `PORT` - Frontend port (default: 3090)
- `BACKEND_PORT` - Backend port (default: 3080)

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

**Online Saathi** - Your AI companion for intelligent conversations.
