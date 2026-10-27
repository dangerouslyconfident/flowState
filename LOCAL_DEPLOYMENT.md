# 💻 FlowState — Local Deployment & Developer Setup Guide

A complete step-by-step guide to installing, configuring, running, and verifying the **FlowState** productivity suite on your local development machine (Windows, macOS, or Linux).

---

## 📋 Table of Contents
1. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
2. [Architecture of Local Setup](#-architecture-of-local-setup)
3. [⚡ 60-Second Quickstart](#-60-second-quickstart)
4. [Step-by-Step Installation](#-step-by-step-installation)
   - [Step 1: Clone the Repository](#step-1-clone-the-repository)
   - [Step 2: Install Dependencies](#step-2-install-dependencies)
   - [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
   - [Step 4: Database Setup (Zero-Config or Local MongoDB)](#step-4-database-setup-options)
   - [Step 5: Start the Backend API](#step-5-start-the-backend-api)
   - [Step 6: Start the Frontend Client](#step-6-start-the-frontend-client)
5. [Loading the Companion Browser Extension](#-loading-the-companion-browser-extension)
6. [Testing the New Feature: `inFlowState` vs `!inFlowState`](#-testing-inflowstate-vs-inflowstate)
7. [Running the Automated Verification Suite](#-running-the-automated-verification-suite)
8. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🖥️ Prerequisites & System Requirements

Before running FlowState locally, ensure you have:
- **Node.js**: `v18.x`, `v20.x`, or `v22+` recommended ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.x` or higher (bundled with Node.js)
- **Git**: Installed and available in your PATH
- **Web Browser**: Google Chrome, Microsoft Edge, Brave, or Mozilla Firefox
- **OS**: Windows 10/11 (PowerShell / Command Prompt), macOS, or Linux

Verify your versions:
```bash
node -v   # Should be >= 18.0.0
npm -v    # Should be >= 9.0.0
git --version
```

---

## 🏗️ Architecture of Local Setup

When running locally, FlowState comprises:
```text
┌────────────────────────────────────────────────────────┐
│                   Local Machine                        │
└────────────────────────────────────────────────────────┘
    ┌──────────────────────┐        ┌──────────────────┐
    │ React 18 + Vite Dev  │        │ Chrome Extension │
    │   http://localhost   │        │ (Focus Guardian) │
    │        :5173         │        │  (Manifest V3)   │
    └──────────┬───────────┘        └────────┬─────────┘
               │ Proxy (/api)                │ REST API
               ▼                             ▼
    ┌──────────────────────────────────────────────────┐
    │          Node.js + Express REST API              │
    │             http://localhost:5000                │
    └──────────────────────────┬───────────────────────┘
                               │
                               ▼
    ┌──────────────────────────────────────────────────┐
    │             MongoDB Database Engine              │
    │  • Option A: Zero-Config MongoMemoryServer       │
    │  • Option B: Local mongod (127.0.0.1:27017)      │
    │  • Option C: Remote MongoDB Atlas Cloud URI      │
    └──────────────────────────────────────────────────┘
```

---

## ⚡ 60-Second Quickstart

If you want to get up and running immediately with zero configuration:

```powershell
# 1. Install all dependencies across monorepo
npm run install:all

# 2. Run the automated 32-test verification suite
npm test

# 3. Start development servers:
# Terminal 1 (Backend API):
npm run server

# Terminal 2 (Frontend Client):
npm run client
```

Now open your browser and navigate to:
👉 **`http://localhost:5173`**

Log in using the pre-seeded demo user:
- **Email**: `aakash@flowstate.dev`
- **Password**: `password123`

---

## 🛠️ Step-by-Step Installation

### Step 1: Clone the Repository
Open a terminal in your workspace directory:
```bash
git clone https://github.com/your-username/flowstate.git
cd flowstate
```

### Step 2: Install Dependencies
FlowState uses clean, isolated dependencies for the client, server, and root monorepo scripts:
```powershell
# Root monorepo command: installs both server and client packages
npm run install:all

# Alternatively, install manually:
cd server && npm install
cd ../client && npm install
cd ..
```

### Step 3: Configure Environment Variables
A default `.env` file is already provided inside `server/.env`. You can verify or customize it:

Open [`server/.env`](file:///c:/Users/Aakash/.gemini/antigravity-ide/scratch/flowstate/server/.env):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/flowstate
JWT_SECRET=flowstate_super_secure_jwt_dev_secret_key_2026_antigravity
CLIENT_URL=http://localhost:5173
NODE_ENV=development

# Optional: Google Gemini API Key for live AI subtask breakdown:
# GEMINI_API_KEY=your_gemini_api_key_here
```

> 💡 **Gemini Key Note**: If `GEMINI_API_KEY` is commented out or omitted, FlowState automatically activates its built-in offline heuristic breakdown and productivity coaching algorithms. It will never crash or fail.

### Step 4: Database Setup Options

FlowState offers **three flexible database engines**:

#### Option A: Zero-Config In-Memory MongoDB (Default Fallback)
- **Requires zero database installation.**
- If you don't have MongoDB installed locally, FlowState's [`server/config/db.js`](file:///c:/Users/Aakash/.gemini/antigravity-ide/scratch/flowstate/server/config/db.js) automatically starts an in-memory `mongodb-memory-server` engine and automatically seeds the demo user and tasks.

#### Option B: Local MongoDB Community Server
- If you have MongoDB installed locally (`mongod` running on port 27017), FlowState connects automatically.
- Data persists across server restarts in your local MongoDB data directory.

#### Option C: MongoDB Atlas Cloud
- Put your Atlas connection string in `server/.env`:
  ```env
  MONGODB_URI=mongodb+srv://user:pass@cluster0.abcde.mongodb.net/flowstate?retryWrites=true&w=majority
  ```

### Step 5: Start the Backend API
In your terminal:
```powershell
cd server
npm start
```
You will see:
```text
✨ FlowState API running on port 5000
🚀 In-Memory MongoDB engine active (127.0.0.1). Zero-config instant local dev enabled!
🌱 Seeding demo user and initial productivity data...
✅ Demo user (aakash@flowstate.dev / password123) and sample tasks seeded successfully.
```
Health check endpoint: `http://localhost:5000/api/health`

### Step 6: Start the Frontend Client
In a second terminal window:
```powershell
cd client
npm run dev
```
You will see:
```text
  VITE v5.4.21  ready in 290 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🧩 Loading the Companion Browser Extension

The companion **Manifest V3 Focus Guardian** extension runs in Google Chrome, Microsoft Edge, or Brave:

1. Open your browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Toggle **Developer mode** on (switch located in the top-right corner).
3. Click the **Load unpacked** button.
4. Browse to and select the `extension/` directory:
   ```text
   flowstate/extension
   ```
5. The **FlowState Focus Guardian** extension icon (`⚡`) will appear in your browser toolbar!
6. Open FlowState at `http://localhost:5173`. When you start a focus sprint, the extension automatically guards your tabs against distraction domains (`youtube.com`, `reddit.com`, `twitter.com`, etc.).

---

## ⚡ Testing `inFlowState` vs `!inFlowState`

FlowState features dynamic atmospheric states that visually and acoustically transform the application based on your focus condition:

### 1. In Tranquil Flow (`inFlowState`)
- **Visuals**: Calming Apple glassmorphism, deep sapphire/indigo background blobs, cyan and soft violet glow accents.
- **Brand Title**: Displays `inFlowState` with a pulsing emerald status dot (`● inFlowState`).
- **Sidebar**: Glows with a violet-cyan `⚡` lightning logo.
- **Document Title**: `⚡ inFlowState — Productivity & Focus Guardian`.

### 2. When Distracted (`!inFlowState`)
- **Trigger**:
  - Switching tabs away from the active focus sprint (tab blur guard).
  - Attempting to visit blacklisted websites (`youtube.com`, `reddit.com`, etc.).
  - Clicking **Simulate !inFlowState (Wavering)** in Settings or clicking the topbar pill.
- **Visual Transformation**:
  - The entire UI shifts from tranquil indigo to **cautionary crimson & amber warning tones**.
  - Animated background blobs pulse with warning red and orange glows.
  - Brand dynamically flips to **`!inFlowState`** with an alert icon `!`.
  - An amber-rose alert banner slides in from the topbar:
    > `⚠️ !inFlowState — Wavering Intercepted! You stepped away from your deep focus session.`
  - Document Title updates to: `⚠️ !inFlowState — Wavering Intercepted!`.
- **Refocusing**:
  - Click the **`⚡ Return to inFlowState`** button on the banner or topbar pill.
  - A gentle harmonic chime sounds, and the interface smoothly returns to tranquil sapphire `inFlowState`.

---

## 🧪 Running the Automated Verification Suite

Run the comprehensive 32-test end-to-end verification suite anytime to confirm your local environment is functioning with 100% fidelity:

```powershell
npm test
```
Or directly with Node:
```powershell
node scripts/test_comprehensive_api.js
```

Expected output:
```text
====================================================
   FLOWSTATE COMPREHENSIVE END-TO-END API TEST SUITE  
====================================================

Testing: Health check... ✅ PASSED
Testing: User Registration... ✅ PASSED
Testing: Reject Duplicate Email Registration (409 Conflict)... ✅ PASSED
Testing: Reject Invalid Login Password... ✅ PASSED
Testing: Valid User Login... ✅ PASSED
Testing: Fetch Authenticated User Profile... ✅ PASSED
Testing: Update User Settings & Blacklist via PUT /auth/profile... ✅ PASSED
Testing: Fetch Blacklist via /auth/blacklist... ✅ PASSED
Testing: Change User Password via PUT /auth/password... ✅ PASSED
Testing: Login with New Password... ✅ PASSED
Testing: Create Task with Quotas & Eisenhower Matrix... ✅ PASSED
Testing: AI Task Breakdown Decomposition (with Heuristic Fallback)... ✅ PASSED
Testing: Add Manual Subtask to Task... ✅ PASSED
Testing: Toggle Subtask Completion Status... ✅ PASSED
Testing: AI Next Task Recommendation... ✅ PASSED
Testing: AI Productivity Insights Generation... ✅ PASSED
Testing: Update Task Status to in-progress... ✅ PASSED
Testing: Direct Quick Log Quota Minutes (POST /tasks/:id/log-quota)... ✅ PASSED
Testing: Daily Quotas Today Calculation... ✅ PASSED
Testing: Pending Notification Reminders Ticker... ✅ PASSED
Testing: Start Focus Session Sprint... ✅ PASSED
Testing: Query Active Focus Session... ✅ PASSED
Testing: Log Blacklist Distraction Intervention... ✅ PASSED
Testing: Conclude Focus Session & Log History... ✅ PASSED
Testing: Fetch Focus Sessions List (GET /sessions)... ✅ PASSED
Testing: Fetch Recent Distractions List... ✅ PASSED
Testing: Fetch Session Statistics... ✅ PASSED
Testing: Fetch Analytics Overview... ✅ PASSED
Testing: Fetch Analytics Trends (GET /analytics/trends)... ✅ PASSED
Testing: Fetch Analytics Categories (GET /analytics/categories)... ✅ PASSED
Testing: Fetch Focus & Completion Streak... ✅ PASSED
Testing: Delete Task by ID... ✅ PASSED

====================================================
   TOTAL TESTS: 32 | PASSED: 32 | FAILED: 0
====================================================
```

---

## 🛠️ Troubleshooting & FAQs

### 1. Port 5000 or 5173 is already in use (`EADDRINUSE`)
If a previous Node process is still running:
- **Windows (PowerShell)**:
  ```powershell
  Get-NetTCPConnection -LocalPort 5000,5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  ```
- **macOS / Linux**:
  ```bash
  kill -9 $(lsof -t -i:5000 -i:5173)
  ```

### 2. Windows PowerShell Execution Policy Error
If running `npm` or `.ps1` scripts gives `execution of scripts is disabled on this system`:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 3. Web Audio Not Playing
Modern browsers restrict audio playback until the user has interacted with the document (clicked anywhere on the page). Simply click the timer, soundscape button, or anywhere in the app to initialize the Web Audio context.

### 4. Running a Production Build Locally
To test how FlowState runs as a compiled single-service application locally:
```powershell
# 1. Build client bundle
npm run build:client

# 2. Run Express server
npm start
```
Express will serve both the compiled React frontend and the API simultaneously at:
👉 **`http://localhost:5000`**
