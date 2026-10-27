# 🚀 FlowState — Production Cloud Deployment Guide

A step-by-step guide to deploying the **FlowState** productivity suite (React 18 + Vite Frontend, Node.js/Express REST API, MongoDB database, and Manifest V3 Chrome Extension) online for public access.

---

## 📋 Table of Contents
1. [Architecture Overview & Deployment Models](#-architecture-overview--deployment-models)
2. [Prerequisites & External Cloud Services](#-prerequisites--external-cloud-services)
   - [MongoDB Atlas (Free Cloud Database)](#1-mongodb-atlas-setup)
   - [Google Gemini API Key (Optional AI Features)](#2-google-gemini-api-key-optional)
   - [Generating a Secure JWT Secret](#3-generate-a-secure-jwt-secret)
3. [Deployment Option 1: Unified Monorepo on Render (Recommended)](#-deployment-option-1-unified-monorepo-on-render-recommended)
4. [Deployment Option 2: Unified Monorepo on Railway](#-deployment-option-2-unified-monorepo-on-railway)
5. [Deployment Option 3: Split Architecture (Vercel Frontend + Render Backend)](#-deployment-option-3-split-architecture-vercel--render)
6. [Deployment Option 4: Docker & Docker Compose](#-deployment-option-4-docker--containerized-deployment)
7. [Companion Chrome Extension Cloud Configuration](#-companion-chrome-extension-cloud-configuration)
8. [Production Verification & Testing Checklist](#-production-verification--testing-checklist)
9. [Troubleshooting & Common Pitfalls](#-troubleshooting--common-pitfalls)

---

## 🏗️ Architecture Overview & Deployment Models

FlowState is engineered to support two distinct cloud deployment topographies:

| Model | Frontend | Backend | Database | Best For | Key Benefits |
|---|---|---|---|---|---|
| **A. Unified Monorepo (Recommended)** | Served static via Express (`client/dist`) | Node.js Express (`server/`) | MongoDB Atlas | Fast, free tier, zero hassle | **Zero CORS issues**, single public URL, single free container on Render/Railway. |
| **B. Decoupled Split Architecture** | Vercel / Netlify (Edge CDN) | Render / Railway API Web Service | MongoDB Atlas | High-traffic scale | Instant edge CDN delivery for static assets, decoupled scaling. |

---

## 🔑 Prerequisites & External Cloud Services

### 1. MongoDB Atlas Setup (Free 512MB M0 Cluster)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Click **Create a Deployment** and select the **M0 Free Shared Cluster**.
3. Choose your nearest cloud provider region (e.g., AWS / Google Cloud).
4. **Security & Authentication**:
   - Go to **Security > Database Access** > click **Add New Database User**.
   - Choose **Password** authentication.
   - Username: `flowstate_admin`
   - Password: `<generate-a-strong-password>` (save this!).
   - Role: `Read and write to any database`.
5. **Network Access**:
   - Go to **Security > Network Access** > click **Add IP Address**.
   - Select **Allow Access From Anywhere** (`0.0.0.0/0`) so cloud platforms (Render, Railway, AWS) can connect.
6. **Get Connection String**:
   - Go to **Deployment > Database**.
   - Click **Connect** > select **Drivers** (Node.js).
   - Copy your connection string:
     ```text
     mongodb+srv://flowstate_admin:<password>@cluster0.abcde.mongodb.net/flowstate?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password, and change the database name from `test` or `myFirstDatabase` to `flowstate`.

### 2. Google Gemini API Key (Optional)
> ℹ️ **Zero-Crash Heuristic Fallback**: If you do not supply a Gemini API key, FlowState automatically activates built-in heuristic subtask decomposition and coach algorithms. All features continue to function seamlessly.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account and click **Create API Key**.
3. Copy the generated key for use in your backend environment variables (`GEMINI_API_KEY`).

### 3. Generate a Secure JWT Secret
Run this command in any terminal to generate a cryptographically strong 256-bit secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Example output: `f7a29e4d1b8c3e6a0d2f5e8b7c9a1d4f3e2a5c8b1d9f4e6a7b8c2d3e4f5a6b7c`

---

## 🌟 Deployment Option 1: Unified Monorepo on Render (Recommended)

In this approach, Render builds the React Vite frontend into `client/dist`, and the Express server serves both the REST API at `/api` and the glassmorphic React app on all other routes.

### Step 1: Push Code to GitHub
Ensure all your project files are pushed to a GitHub repository:
```powershell
git add .
git commit -m "feat: prepare FlowState for cloud deployment"
git push origin master
```

### Step 2: Create Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > select **Web Service**.
3. Connect your GitHub repository.
4. Fill in the following fields:

| Configuration Field | Value |
|---|---|
| **Name** | `flowstate-app` (or custom name) |
| **Region** | Select nearest region (e.g., Singapore, Frankfurt, Oregon) |
| **Branch** | `master` or `main` |
| **Root Directory** | *(Leave blank — builds from repository root)* |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### Step 3: Configure Environment Variables
Under the **Environment Variables** section, add:

| Key | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations & static asset serving |
| `PORT` | `5000` | Port for Express (Render binds automatically) |
| `MONGODB_URI` | `mongodb+srv://flowstate_admin:...@cluster0.../flowstate` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `<your-generated-256-bit-secret>` | Secret token encryption key |
| `CLIENT_URL` | `*` (or your Render URL once generated) | Allowed CORS origins |
| `GEMINI_API_KEY` | `<your-gemini-api-key>` | *(Optional)* Google Gemini AI Flash key |

### Step 4: Deploy & Verify
1. Click **Create Web Service**.
2. Render will run `npm run build`, install dependencies, compile the Vite React bundle, and start Express.
3. Once the status shows **Live**, visit your Render URL (e.g., `https://flowstate-app.onrender.com`).
4. Log in with the default demo credentials or register a new account:
   - **Email**: `aakash@flowstate.dev`
   - **Password**: `password123`

---

## 🚂 Deployment Option 2: Unified Monorepo on Railway

Railway offers fast, containerized Nixpacks deployments with zero configuration:

1. Sign up at [Railway.app](https://railway.app/).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select your `flowstate` repository.
4. Go to **Settings > Build & Deploy**:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Go to the **Variables** tab and add:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb+srv://flowstate_admin:...@cluster0.../flowstate
   JWT_SECRET=your_jwt_secret_here
   CLIENT_URL=*
   GEMINI_API_KEY=your_gemini_api_key
   ```
6. Go to **Settings > Networking** > click **Generate Domain**.
7. Railway will provide a public HTTPS URL (e.g. `https://flowstate-production.up.railway.app`).

---

## ⚡ Deployment Option 3: Split Architecture (Vercel + Render)

Deploy the React frontend globally on Vercel's Edge Network, and host the Express API on Render.

### Phase 1: Deploy Backend API on Render
1. In Render, create a **Web Service** with:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
2. Environment Variables:
   - `NODE_ENV=production`
   - `MONGODB_URI=<your_atlas_uri>`
   - `JWT_SECRET=<your_jwt_secret>`
   - `CLIENT_URL=https://your-flowstate-frontend.vercel.app`
3. Deploy and copy your backend URL: e.g. `https://flowstate-api.onrender.com`.

### Phase 2: Deploy Frontend on Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New... > Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://flowstate-api.onrender.com/api`
5. Click **Deploy**.
6. The included [`client/vercel.json`](file:///c:/Users/Aakash/.gemini/antigravity-ide/scratch/flowstate/client/vercel.json) ensures client-side routing (`/tasks`, `/focus`, `/analytics`, `/settings`) rewrites cleanly without 404 errors.

---

## 🐳 Deployment Option 4: Docker & Containerized Deployment

To deploy on AWS ECS, DigitalOcean App Platform, Fly.io, or your own VPS, create a `Dockerfile`:

### 1. Root `Dockerfile`
```dockerfile
# Stage 1: Build Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server source code & built client bundle
COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 5000
CMD ["node", "server/server.js"]
```

### 2. Local Container Test with `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongo:27017/flowstate
      - JWT_SECRET=flowstate_docker_secret_key_2026
      - CLIENT_URL=*
    depends_on:
      - mongo

  mongo:
    image: mongo:7-jammy
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```
Run locally:
```bash
docker compose up --build
```

---

## 🧩 Companion Chrome Extension Cloud Configuration

The **FlowState Focus Guardian** browser extension (`extension/`) intercepts blacklisted websites and keeps users focused. To connect it to your live cloud deployment:

### 1. Update API URL in `extension/background.js`
Open [`extension/background.js`](file:///c:/Users/Aakash/.gemini/antigravity-ide/scratch/flowstate/extension/background.js#L3) and change line 3 from `localhost:5000` to your live domain:
```javascript
// Local Development:
// const API_BASE = 'http://localhost:5000/api';

// Live Production Cloud:
const API_BASE = 'https://flowstate-app.onrender.com/api';
```

### 2. Install / Distribute in Chrome or Edge
1. Open Google Chrome, Microsoft Edge, or Brave.
2. Navigate to `chrome://extensions` (or `edge://extensions`).
3. Toggle **Developer mode** in the top right.
4. Click **Load unpacked** and select the `extension/` folder.
5. The extension will automatically sync with your online FlowState account and guard against distraction sites!

### 3. Packaging for Chrome Web Store
To distribute to colleagues or users via the Chrome Web Store:
1. Select all files inside the `extension/` directory (manifest.json, background.js, content.js, intervene.html, popup.html, popup.js, icons).
2. Compress into a `.zip` file: `flowstate-guardian-v1.0.0.zip`.
3. Submit the zip via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## ✅ Production Verification & Testing Checklist

After your deployment goes live, run through this verification checklist:

| Verification Step | Target Endpoint / Action | Expected Result | Status |
|---|---|---|---|
| **Health Check** | `GET /api/health` | Returns `{"status":"ok", "timestamp":"..."}` with status 200 | [ ] |
| **Static App Load** | `GET /` | Loads glassmorphic landing / login screen | [ ] |
| **User Authentication** | `POST /api/auth/login` | Returns JWT token and user profile | [ ] |
| **SPA Route Refresh** | Refresh `/tasks` or `/focus` | Loads page properly without 404 error | [ ] |
| **Task Creation** | Create task in Task modal | Task saved to MongoDB Atlas and appears in matrix | [ ] |
| **AI Subtask Breakdown** | Click "AI Breakdown" on a task | Generates 4 actionable subtasks with time estimates | [ ] |
| **Daily Quota Engine** | Switch to Quota Planner view | Displays allocated focus minutes and progress bar | [ ] |
| **Focus Room Audio** | Toggle Rain / White Noise / Alpha | Synthesized audio plays cleanly without loading external files | [ ] |
| **Notification Engine** | Click Notification Bell drawer | Bell drawer opens, audio chime sounds on test alert | [ ] |
| **Focus Guardian** | Settings > Test Interception | Displays glassmorphic "DO NOT WAVER" modal and logs blocked event | [ ] |

---

## 🛠️ Troubleshooting & Common Pitfalls

### 1. MongoDB Connection Timeout (`MongooseServerSelectionError`)
- **Cause**: MongoDB Atlas Network Access has not whitelisted all IP addresses (`0.0.0.0/0`).
- **Fix**: In MongoDB Atlas, go to **Network Access** > **Add IP Address** > choose **Allow Access from Anywhere** (`0.0.0.0/0`).
- **Check Credentials**: Ensure your username, password, and database name are correct in `MONGODB_URI`. If your password contains special characters (e.g. `@`, `#`, `/`), URL-encode them (`@` -> `%40`).

### 2. CORS Error (`Access-Control-Allow-Origin`)
- **Cause**: The frontend URL does not match `CLIENT_URL` configured on the backend.
- **Fix**: Update the `CLIENT_URL` environment variable on your backend server:
  - For single-origin: `CLIENT_URL=https://your-frontend.vercel.app`
  - For wildcard/open access: `CLIENT_URL=*`

### 3. React Router 404 on Refresh (Split Architecture)
- **Cause**: The web server tries to serve `/tasks` as a physical file on the server.
- **Fix**: Ensure [`client/vercel.json`](file:///c:/Users/Aakash/.gemini/antigravity-ide/scratch/flowstate/client/vercel.json) is present in the `client/` directory with rewrite rules mapping `/(.*)` to `/index.html`.

### 4. Audio Chimes Not Playing
- **Cause**: Modern browsers require user interaction (a click) before playing Web Audio API soundscapes.
- **Fix**: Simply click any button (e.g., "Start Focus" or "Play Soundscape") to grant browser audio context permission.

### 5. Render Free Tier Spin-Down Delay
- **Behavior**: Free instances on Render spin down after 15 minutes of inactivity and take ~45 seconds to spin up on cold requests.
- **Tip**: You can use a free pinging service (like [UptimeRobot](https://uptimerobot.com/)) pointing to `https://your-app.onrender.com/api/health` every 10 minutes to keep your free instance active 24/7!
