# 🎥 Frame — Real-Time Video Conferencing Platform

[![MERN](https://img.shields.io/badge/Stack-MERN-3C873A?style=for-the-badge)](#tech-stack)
[![WebRTC](https://img.shields.io/badge/Powered%20By-WebRTC-blue?style=for-the-badge)](#features)
[![Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=fff)](#real-time-collaboration)
[![Docker](https://img.shields.io/badge/Containerized-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=fff)](#docker-setup)
[![Tailwind CSS](https://img.shields.io/badge/Styled%20With-Tailwind%20CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=fff)](#tech-stack)

**Frame** is a full-stack, real-time video conferencing application built on the **MERN stack** with **WebRTC** peer-to-peer communication and **Socket.IO** for live collaboration. It supports multi-participant video calls, in-meeting text chat, emoji reactions, hand-raise, typing indicators, screen sharing, and persistent meeting history — all served through a Dockerized, production-ready architecture.

🌐 **Live Demo**: [https://frame-frontend.onrender.com](https://frame-frontend.onrender.com)  
🐳 **Docker Hub**: [https://hub.docker.com/r/maazk31/frame](https://hub.docker.com/r/maazk31/frame)

---

## 📌 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started (Local Setup)](#getting-started-local-setup)
- [Environment Variables](#environment-variables)
- [Docker Setup](#docker-setup)
- [Deployment](#deployment)
- [Scripts Reference](#scripts-reference)
- [Contributing](#contributing)
- [Author](#author)

---

## 🧠 Overview

Frame delivers a browser-based video conferencing experience with no plugin installation required. Users register once, create or join meetings with a short room code, and get a full-featured conference with:

- Peer-to-peer WebRTC video/audio (Twilio STUN/ICE with Google STUN fallback)
- Socket.IO-powered real-time signaling, chat, and presence
- MongoDB-backed user accounts and meeting history

---

## ✨ Features

### 🔐 Authentication & User Accounts
- **Register / Login** — username + bcrypt-hashed password stored in MongoDB
- **Token-based auth** — 40-character hex token generated on login, stored in the `User` document and persisted to `localStorage` on the client
- **Protected routes** — `withAuth` HOC redirects unauthenticated users; middleware validates tokens on every protected API call

### 📹 Video & Audio
- **WebRTC P2P video/audio** for every participant in the room
- **Twilio STUN/ICE servers** fetched dynamically via `/api/users/ice-servers`; Google STUN as fallback
- **Mute / unmute microphone** with per-participant audio state synced to all peers
- **Camera on / off** with per-participant video state synced to all peers
- **Screen sharing** using `getDisplayMedia` with `replaceTrack` (no stream flicker)
- **Speaking indicator** — real-time audio frequency analysis highlights the active speaker
- **Push-to-talk** — hold `Spacebar` to temporarily unmute

### 💬 Real-Time Collaboration (Socket.IO)
- **Room join / leave** — participants see who enters and exits instantly; graceful cleanup when a room becomes empty
- **WebRTC signaling** — SDP offer/answer and ICE candidates relayed through `signal` events
- **In-meeting text chat** — messages broadcast to all participants; full chat history delivered to late joiners on `join-call`
- **Typing indicators** — shows who is currently typing with a 2-second idle timeout
- **Emoji reactions** — 6-emoji set (👍 ❤️ 😂 🎉 🔥 👏) displayed as floating overlays with sender's username
- **Raise / lower hand** — signals intent to speak; visible to all participants
- **Media state sync** — each participant's audio/video on/off state is broadcast on change
- **Meeting start time** — server records room creation timestamp and sends it to late joiners so everyone sees the same elapsed meeting timer

### 📋 Meeting Management
- **Create meeting** — generates a 6-character alphanumeric room code shown in a copy-friendly card
- **Join meeting** — enter any existing room code directly from the dashboard
- **Meeting history** — every meeting a user joins is saved to MongoDB and displayed grouped by date (Today, Yesterday, older dates) with a one-click **Rejoin** button
- **Session persistence** — page refresh inside a meeting reconnects the user to the same room via `sessionStorage`
- **Meeting duration tracking** — elapsed time stored in `localStorage` and shown in history

### 🔔 UI / UX
- **Audio notifications** — distinct sounds for join, leave, new message, reaction, and hand-raise events
- **Resizable chat panel** — drag to adjust the chat sidebar width during a call
- **Snackbar toast notifications** — non-intrusive feedback for key in-call events
- **Dark theme** with emerald (`#34d399`) accent color throughout
- **Custom Tailwind animations** — `floatAround`, `typewriter`, `shimmer`, `pulseRing`, `floatUp`, `meshMove`, `breathe`
- **Responsive design** for desktop and mobile browsers

### 🏗️ Backend & Persistence
- **Health check endpoint** — `GET /api/health` for uptime monitoring
- **Meeting status check** — `GET /api/users/meeting-status/:meetingCode` lets the client verify whether a room is currently active before joining
- **MongoDB persistence** — user accounts and full meeting history stored in Atlas-compatible MongoDB
- **In-memory room state** — `connections`, `messages`, `usernames`, `mediaStates`, `roomStartTimes`, and `timeOnline` maps held in the Node.js process for zero-latency real-time operations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Tailwind CSS v3, Material UI v7 |
| **Backend** | Node.js, Express 5 |
| **Real-Time** | Socket.IO v4 (server + client) |
| **Video / Audio** | WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`) |
| **Database** | MongoDB (Mongoose v8) |
| **Authentication** | Token-based (crypto hex), bcrypt |
| **ICE / STUN** | Twilio Programmable Video + Google STUN fallback |
| **HTTP Client** | Axios |
| **Containerization** | Docker, Docker Compose |
| **Frontend Server** | nginx (Alpine) — production Docker image |
| **Dev Tooling** | Nodemon, Create React App, PostCSS |

---

## 🏛️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│  React SPA  ──→  Socket.IO client ──→  WebRTC P2P        │
│      │                                                   │
│      │  REST (Axios)        Socket.IO events             │
└──────┼───────────────────────────┼──────────────────────-┘
       │                           │
       ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│              Express 5  +  Socket.IO Server              │
│                                                          │
│  /api/users/*  ──→  Controllers ──→  MongoDB (Mongoose)  │
│                                                          │
│  Socket events:  join-call · signal · chat-message       │
│                  typing · reaction · media-state         │
│                  raise-hand · lower-hand                 │
│                  meeting-start-time                      │
└─────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  MongoDB    │  ← user accounts + meeting history
└─────────────┘
```

WebRTC video/audio streams travel **directly between browsers** (P2P) after the signaling handshake completes through the Node.js server — the server never handles media data.

---

## 📁 Project Structure

```
Frame/
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express server + Socket.IO initialization
│   │   ├── config/
│   │   │   └── DBconnect.js          # Mongoose MongoDB connection
│   │   ├── controllers/
│   │   │   └── user.controller.js    # Auth (register/login) + meeting history
│   │   ├── middleware/
│   │   │   └── auth.middleware.js    # Token validation middleware
│   │   ├── models/
│   │   │   ├── user.model.js         # User schema (name, username, password, token)
│   │   │   └── meeting.model.js      # Meeting history schema (user_id, meetingCode, date)
│   │   ├── routes/
│   │   │   └── user.routes.js        # API route definitions
│   │   └── socket/
│   │       └── socketManager.js      # All Socket.IO event handlers + room state
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ReactionPicker.jsx
│   │   │   └── Snackbar.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx       # Global auth state
│   │   ├── pages/
│   │   │   ├── landing.jsx           # Welcome / landing page
│   │   │   ├── authentication.jsx    # Login + Register (toggled)
│   │   │   ├── home.jsx              # Dashboard — create / join / history shortcuts
│   │   │   ├── history.jsx           # Full meeting history with rejoin
│   │   │   └── VideoMeet.jsx         # Complete video call UI
│   │   ├── utils/
│   │   │   ├── sounds.js             # Audio notification helpers
│   │   │   └── withAuth.jsx          # Auth guard HOC
│   │   └── config/
│   │       └── server.js             # API base URL selection (dev vs prod)
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yaml
```

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (LTS recommended)
- [npm](https://www.npmjs.com/) v9+
- [MongoDB](https://www.mongodb.com/) — local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- Git

### 1 — Clone the repository

```bash
git clone https://github.com/Maaz-21/Frame.git
cd Frame
```

### 2 — Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a separate terminal)
cd ../frontend
npm install
```

### 3 — Configure environment variables

Create `.env` files as described in the [Environment Variables](#environment-variables) section below.

### 4 — Start the backend

```bash
cd backend
npm run dev       # Starts with nodemon on port 8000
```

### 5 — Start the frontend

```bash
cd frontend
npm start         # Starts React dev server on port 3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Environment Variables

### Backend — `backend/.env`

```env
# Server
PORT=8000

# MongoDB
MONGO_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/frame

# CORS — comma-separated list of allowed frontend origins
FRONTEND_URLS=http://localhost:3000

# Twilio (optional — Google STUN used as fallback when absent)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

### Frontend — `frontend/.env`

```env
REACT_APP_DEV_SERVER_URL=http://localhost:8000
REACT_APP_PROD_SERVER_URL=https://frame-1ftf.onrender.com
```

> The frontend automatically selects the correct server URL based on `NODE_ENV`.

---

## 🐳 Docker Setup

All services are pre-configured in `docker-compose.yaml`. The frontend uses a **multi-stage Docker build** (Node.js compiles React, then nginx:alpine serves the static bundle). The backend runs a single-stage Node.js image.

### Prerequisites

- [Docker](https://www.docker.com/) v24+
- [Docker Compose](https://docs.docker.com/compose/) v2+

### Run with Docker Compose (recommended)

```bash
# From the repository root
docker compose up --build
```

| Service | Accessible at |
|---------|--------------|
| Frontend | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:8000](http://localhost:8000) |

Run in detached mode:

```bash
docker compose up -d --build
```

Stop and remove containers:

```bash
docker compose down
```

### Build and run individual images

**Backend:**

```bash
cd backend
docker build -t frame-backend .
docker run -p 8000:8000 --env-file .env frame-backend
```

**Frontend:**

```bash
cd frontend
docker build -t frame-frontend .
docker run -p 3000:80 frame-frontend
```

### Pull from Docker Hub

```bash
docker pull maazk31/frame:latest
docker run -p 3000:80 maazk31/frame:latest
```

### Useful Docker commands

```bash
# View running containers
docker ps

# Tail logs for a service
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service
docker compose restart backend

# Remove stopped containers and dangling images
docker system prune -f
```

---

## 🌍 Deployment

The project is deployed on **Render** using GitHub auto-deploy.

| Resource | URL |
|----------|-----|
| 🌐 Live Application | [https://frame-frontend.onrender.com](https://frame-frontend.onrender.com) |
| 🐳 Docker Hub Image | [https://hub.docker.com/r/maazk31/frame](https://hub.docker.com/r/maazk31/frame) |

---

## 📜 Scripts Reference

### Backend (`backend/package.json`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend with Nodemon (auto-reload on file changes) |
| `npm start` | Start backend in production mode (`node src/app.js`) |

### Frontend (`frontend/package.json`)

| Command | Description |
|---------|-------------|
| `npm start` | Start React development server on port 3000 |
| `npm run build` | Create optimized production build in `/build` |
| `npm test` | Run Jest test suite |

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 👨‍💻 Author

**Maaz-21**  
GitHub: [https://github.com/Maaz-21](https://github.com/Maaz-21)  
Repository: [https://github.com/Maaz-21/Frame](https://github.com/Maaz-21/Frame)
