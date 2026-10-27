# FlowState — MERN Productivity Platform, Daily Quota Engine & Focus Guardian

> A full-stack **MERN (MongoDB, Express.js, React, Node.js)** productivity suite engineered for deep focus, versatile task time-blocking, daily time quota allocation, real-time desktop reminders, and an intelligent **Focus Guardian** that detects blacklisted distraction websites and keeps users on task.

---

## 🌟 Executive Summary & Problem Statement

Modern students, developers, and knowledge workers face three acute productivity challenges:
1. **Unrealistic & Vague Planning**: To-do apps often capture tasks without completion deadlines, time estimates, or daily time quotas, resulting in chronic backlog buildup and decision fatigue.
2. **Context Switching & Wavering**: When working on cognitively demanding tasks, opening a new browser tab frequently leads to reflexive visits to blacklisted distraction sites (e.g. YouTube, Reddit, Twitter/X, Instagram, TikTok), derailing deep work.
3. **Passive Reminders**: Standard notification systems are either missing or purely reactive, failing to notify users of impending deadlines, active focus slots, or daily quota deficits.

**FlowState** provides an engineered end-to-end solution:
- **Versatile Task Creation & Time-Blocking**: Log tasks with target completion times, due dates, priorities, urgency (Eisenhower matrix), subtasks, and reminder triggers.
- **Daily Time Quotas**: Allocate specific daily focus budgets (e.g., 45m or 90m per day) with visual progress bars, quota adherence rates, and dedicated time slots.
- **Real-Time Notification Engine**: Combines native HTML5 Web Notifications, synthesized Web Audio harmonic chimes, and a background reminder ticker.
- **Focus Guardian & Blacklist Detector**: A dual-layer protection system (companion **Manifest V3 Chrome/Edge Extension** + in-app tab blur guard) that intercepts blacklisted URLs in real time and presents an anti-wavering intervention screen.
- **Deep Work Soundscapes**: Self-contained Web Audio ambient noise generator (Rain, White Noise, and 10Hz Alpha-wave binaural beats) with zero external media dependencies.
- **Productivity & Distraction Analytics**: Track daily focus minutes, quota compliance percentage, and distraction resistance scores.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   FlowState MERN Architecture                          │
└────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────┐    ┌───────────────────────────┐
    │       React 18 + Vite Frontend    │    │  Manifest V3 Extension    │
    │   Apple Glassmorphic Design UI    │    │  (FlowState Guardian)     │
    │                                   │    │                           │
    │  • Dashboard & Analytics          │    │ • Tab URL Interceptor     │
    │  • Versatile Tasks & Matrix       │    │ • Blacklist Domain Match  │
    │  • Daily Quota Planner            │◄───┼─• Real-time Session Sync  │
    │  • Focus Room & Soundscapes       │    │ • Wavering Intervention   │
    │  • Notification Center Drawer     │    │ • Chrome Notifications    │
    └─────────────────┬─────────────────┘    └─────────────┬─────────────┘
                      │                                    │
                      │ REST API + JWT Auth                │ REST API
                      ▼                                    ▼
    ┌────────────────────────────────────────────────────────────────────┐
    │                      Node.js + Express Backend                     │
    │                                                                    │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │
    │  │  Auth Router │  │ Tasks Router │  │Sessions Router│ │Analytics│ │
    │  │  & Blacklist │  │ & Quotas     │  │& Distraction │  │ Router  │ │
    │  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘ │
    └─────────────────┬──────────────────────────────────┬───────────────┘
                      │                                  │
                      ▼                                  ▼
    ┌───────────────────────────────────┐    ┌───────────────────────────┐
    │   MongoDB (Atlas / Memory Server) │    │ Google Gemini API / AI    │
    │   • Users (settings & blacklists) │    │ • Subtask Decomposition   │
    │   • Tasks (quotas & history)      │    │ • Next Task Recommender   │
    │   • FocusSessions & Distractions  │    │ • Productivity Insights   │
    └───────────────────────────────────┘    └───────────────────────────┘
```

---

## 🔑 Core Workflows

### 1. Versatile Task Planning & Time Allocation
- **Rich Task Metadata**: Configure title, context description, category, tags, priority (1–4), and urgency (1–4).
- **Eisenhower Quadrants**: Automatically segregates tasks into **Do First**, **Schedule**, **Delegate**, and **Eliminate**.
- **Target Completion Times & Due Dates**: Specify exact due dates and target times of day (e.g. `18:00`).
- **Reminder Offsets**: Set scheduled alerts (At due time, 15m before, 30m before, 1h before).
- **Subtask Checklist with AI Decomposition**: Break complex objectives into actionable subtasks with time estimates via Gemini 1.5 Flash (with offline heuristic fallback).

### 2. Daily Time Quota Engine
- **Dedicated Daily Budgets**: Allocate daily focus minutes (e.g. 15m, 30m, 45m, 60m, 90m, 120m) to specific tasks.
- **Focus Slots**: Schedule specific time windows (e.g. `09:30 - 11:00`).
- **Quota Planner View**: A dedicated view showing total daily quota allocated, minutes completed today, and adherence percentages with color-coded progress bars.
- **One-Click Launch**: Launch any task directly into the Focus Timer with pre-loaded quota.
- **Quick Logging**: Log 25m focus blocks directly towards quotas.

### 3. Focus Guardian & Blacklist Anti-Wavering Protection
- **Configurable Blacklist**: Manage blacklisted distraction websites (YouTube, Reddit, Twitter/X, Instagram, TikTok, Netflix, Twitch, Discord, or any custom domain) in Settings.
- **Companion Browser Extension (`extension/`)**:
  - Manifest V3 background service worker monitors tab navigations.
  - Automatically synchronizes with the active focus session from FlowState.
  - When user navigates to a blacklisted site, immediately intercepts the tab with the glassmorphic **"DO NOT WAVER FROM YOUR TASK"** screen.
  - Displays the active task, daily quota progress, and triggers an OS notification.
  - Automatically logs the distraction attempt to `POST /api/sessions/distraction`.
- **In-App Tab Blur Guard**:
  - If the user switches away from the FlowState tab while a focus timer is running, the tab title flashes `⚠️ STAY ON TASK!`.
  - When the user returns, an anti-wavering warning buzz sounds, a reminder toast appears, and a distraction incident is recorded.
- **Interactive Evaluator Test Bench**:
  - Test blacklist detection with 1-click test buttons (`youtube.com`, `reddit.com`, etc.) right in the web app.

### 4. Smart Notification & Alert Engine
- **HTML5 Web Notifications API**: Real OS-level desktop notifications even when the browser tab is in the background.
- **Synthesized Web Audio Engine**: Zero external mp3 dependencies; generates pleasant multi-tone arpeggio chimes for session completion, clean bell alerts for upcoming deadlines, and warning buzzers for distractions.
- **Background Reminder Ticker**: Continuously monitors upcoming task deadlines, scheduled focus slots, and daily quota deficits.
- **Notification Center Drawer**: Bell icon in the topbar with live unread badge, flyout drawer with dismiss actions, and 1-click "Focus Now" triggers.

### 5. Deep Work Focus Room & Soundscapes
- **Adaptive Circular Timer**: Animated SVG circular progress ring for Work (default 25m), Short Break (5m), and Long Break (15m).
- **Synthesized Ambient Soundscapes**:
  - 🌧️ Synthesized Pink-filtered Rain soundscape
  - 🌊 White noise generator
  - 🧘 10Hz Binaural Alpha-wave Zen drone
- **Session Reflection Logs**: Capture session outcomes upon sprint completion.

### 6. Productivity Analytics & Distraction Shield Metrics
- **Daily Trends**: Recharts visualization of focus minutes and task completions over 7, 14, and 30-day windows.
- **Daily Quota Compliance**: Tracks daily quota adherence over time.
- **Focus Shield & Distraction Resistance**: Computes the percentage of focus sessions completed without wavering, plus total distractions thwarted.
- **Category Distribution**: Donut charts showing focus distribution across categories.

---

## 🛠️ Technology Stack

| Layer | Technologies | Engineering Highlights |
|---|---|---|
| **Frontend** | React 18, Vite, React Router 6, Recharts, React Icons | Fast HMR, component modularity, zero bundle bloat |
| **Styling** | Vanilla CSS Glassmorphism Design System | Custom CSS tokens, backdrop filters, responsive layout, animated glowing blobs |
| **Backend** | Node.js, Express 4.x, Helmet, CORS, Express-Rate-Limit | RESTful API, structured error handling, rate limiting |
| **Database** | MongoDB / Mongoose ODM (Atlas or MongoMemoryServer) | Automatic zero-config fallback via MongoMemoryServer for instant evaluation |
| **Security** | JWT (JSON Web Tokens), bcryptjs (12 salt rounds) | Stateless bearer authentication, password hashing |
| **Browser Extension** | Manifest V3, Chrome Tabs, Alarms, Storage & Notifications APIs | Cross-tab blacklist interception & anti-wavering overlay |
| **Audio Engine** | HTML5 Web Audio API | Synthesized harmonic chimes, warning buzzers, and ambient soundscapes |

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)

### 1. Start the Backend API Server
```powershell
cd server
npm install
npm run start
```
*Note: The server includes zero-config in-memory MongoDB support. If no local or remote MongoDB instance is detected, it automatically starts an in-memory MongoDB engine.*

The API will start at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### 2. Start the Frontend Client
```powershell
cd client
npm install
npm run dev
```
The web application will open at: `http://localhost:5173`

### 3. Load the Companion Browser Extension (Optional, 15 seconds)
1. Open Google Chrome, Microsoft Edge, or Brave.
2. Navigate to `chrome://extensions` (or `edge://extensions`).
3. Toggle **Developer mode** in the top right.
4. Click **Load unpacked** and select the `extension/` directory:
   ```text
   flowstate/extension
   ```
5. The **FlowState Focus Guardian** will now guard your browser against blacklisted distraction sites whenever you focus on a task!

---

## 📁 Repository Structure

```text
flowstate/
├── client/                     # React 18 + Vite Frontend
│   ├── public/                 # Static assets & SVG icons
│   ├── src/
│   │   ├── components/         # Layout, Sidebar, NotificationCenter
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # Dashboard, Tasks, Focus, Analytics, Settings, Login, Register
│   │   ├── utils/              # api.js, notifications.js (Web Audio & Web Notifications)
│   │   ├── App.jsx             # React Router setup
│   │   ├── index.css           # Glassmorphism design system & token definitions
│   │   └── main.jsx            # Application entrypoint
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Node.js + Express REST API
│   ├── config/                 # db.js (MongoDB Atlas & MongoMemoryServer fallback)
│   ├── middleware/             # auth.js (JWT validation)
│   ├── models/                 # User.js, Task.js, FocusSession.js
│   ├── routes/                 # auth.js, tasks.js, sessions.js, analytics.js, ai.js
│   ├── utils/                  # gemini.js (AI decomposition & coaching)
│   ├── .env.example            # Environment template
│   ├── package.json
│   └── server.js               # Express server entrypoint
│
├── extension/                  # Companion Manifest V3 Browser Extension
│   ├── manifest.json           # Manifest V3 specification
│   ├── background.js           # Background service worker (tab monitoring & API sync)
│   ├── content.js              # Token synchronization content script
│   ├── intervene.html          # Glassmorphic "DO NOT WAVER" intervention screen
│   ├── popup.html & popup.js   # Extension toolbar popup
│   └── README.md               # 15-second extension installation guide
│
├── .gitignore
└── README.md                   # Complete project documentation
```

---

## 🛡️ Security & Reliability

- **Stateless Authorization**: Protected API endpoints require JWT Bearer tokens signed with a 256-bit secret.
- **Input Sanitization**: Mongoose schemas enforce validation on all inputs, time values, and allowed enum fields.
- **Credential Protection**: Passwords are encrypted with bcrypt using 12 salt rounds; passwords are never returned in JSON responses (`toJSON` hook).
- **Environment Confidentiality**: Secret keys, database connection strings, and API tokens are managed via `.env` files; `.env` is ignored by Git.
- **Zero-Crash Fallback**: The AI task breakdown and coach includes heuristic offline fallbacks so the application functions seamlessly even without external API keys.

---

## 📝 End-Term Project Submission Information

```text
Project Name: FlowState — MERN Productivity Suite, Focus Guardian & Daily Quota Engine
Problem Statement: Digital distraction, lack of structured daily time quotas, and passive to-do lists that fail to prevent task wavering or keep users in deep work.
Tech Stack: MongoDB, Express.js, React 18, Node.js, Web Audio API, Web Notifications API, Chrome Extension (Manifest V3)
Major Features:
  1. Versatile Task Planning (Due dates, target completion times, Eisenhower quadrants)
  2. Daily Focus Quota Engine (Target minutes/day, progress bars, streaks, scheduled slots)
  3. Real-Time Reminder & Notification Engine (Web Notifications + synthesized audio chimes)
  4. Focus Guardian & Blacklist Detector (Extension + in-app tab guard + anti-wavering interventions)
  5. Deep Work Focus Room with Ambient Synthesized Soundscapes (Rain, White Noise, Alpha Waves)
  6. Productivity Analytics & Distraction Shield Metrics
```

---

## 🌐 Deployment & Repository Guides

- 🐙 **GitHub Push & Version Control Guide**: 👉 **[GITHUB_PUSH_GUIDE.md](GITHUB_PUSH_GUIDE.md)**
- 💻 **Local Development & Setup Guide**: 👉 **[LOCAL_DEPLOYMENT.md](LOCAL_DEPLOYMENT.md)**
- ☁️ **Online Cloud Deployment Guide (Render, Railway, Vercel, Docker)**: 👉 **[DEPLOYMENT.md](DEPLOYMENT.md)**



