# FlowState — AI-Powered Productivity Dashboard

> An intelligent, Apple-glassmorphic productivity management platform combining the **Eisenhower Decision Matrix**, **Adaptive Pomodoro Focus Sessions**, **Predictive AI Task Breakdown**, and **Productivity Analytics powered by Google Gemini**.

---

## 🌟 Executive Summary & Problem Statement

Modern professionals and students face significant cognitive overload. Typical productivity applications force a false choice: they are either rudimentary to-do lists lacking context and prioritization, or heavyweight enterprise project management suites that introduce friction.

**FlowState** bridges this gap:
1. **Prioritization Intelligence**: Implements the battle-tested **Eisenhower Matrix** (Do First, Schedule, Delegate, Don't Do) to visually segregate tasks based on urgency and impact.
2. **AI Action Plan Generation**: Uses Google Gemini to decompose ambiguous, high-level objectives into granular subtasks with estimated completion minutes.
3. **Deep Work Flow Timer**: A customized Pomodoro engine with synthesized Web Audio chimes, task-linking, and session reflection logs.
4. **Holistic Analytics**: Visualizes activity trends, completion ratios, category breakdowns via Recharts, and generates personalized productivity coaching insights.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│                   React 18 + Vite                      │
│             Glassmorphism Apple Glass UI               │
│                                                        │
│   ┌────────┐   ┌────────┐   ┌─────────┐   ┌────────┐   │
│   │ Auth   │   │ Tasks  │   │ Focus   │   │ Stats  │   │
│   │ Pages  │   │ Board  │   │ Timer   │   │ & AI   │   │
│   └────────┘   └────────┘   └─────────┘   └────────┘   │
└───────────────────────────┬────────────────────────────┘
                            │ REST API (JWT Auth)
┌───────────────────────────┴────────────────────────────┐
│                  Express.js Backend                    │
│                                                        │
│   ┌────────┐   ┌────────┐   ┌─────────┐   ┌────────┐   │
│   │ Auth   │   │ Tasks  │   │ Focus   │   │ AI     │   │
│   │ Engine │   │ Router │   │ Tracker │   │ Engine │   │
│   └────────┘   └────────┘   └─────────┘   └────────┘   │
└───────────────┬────────────────────────────┬───────────┘
                │                            │
      ┌─────────┴─────────┐        ┌─────────┴─────────┐
      │  MongoDB / Mongoose│        │ Google Gemini API │
      │  Atlas Storage    │        │ 1.5 Flash Model   │
      └───────────────────┘        └───────────────────┘
```

---

## 🔑 5 Core Workflows

### 1. Smart Task Management (Eisenhower Matrix)
- Categorizes work items into four quadrants:
  - **Q1 (Do First)**: Urgent & Important (`#F87171`)
  - **Q2 (Schedule)**: Not Urgent but Important (`#60A5FA`)
  - **Q3 (Delegate)**: Urgent but Less Important (`#FBBF24`)
  - **Q4 (Eliminate)**: Neither Urgent nor Important (translucent glass)
- Dual view support: 2x2 Matrix view or searchable/filterable List view.
- Subtask checklists with progress tracking and estimated vs. actual minutes.

### 2. AI-Powered Task Breakdown (Google Gemini)
- Complex goals can be broken down with a single click.
- Prompts Gemini 1.5 Flash to generate 3–7 actionable subtasks (starting with verbs) and realistic time estimates.
- Includes an intelligent offline fallback engine ensuring full functionality even when external network access is restricted.

### 3. Focus Sessions (Pomodoro+ Engine)
- Customizable sprint intervals: Work (default 25m), Short Break (5m), Long Break (15m).
- Real-time SVG circular timer with dynamic stroke offset animations.
- Synthesized Web Audio API harmonic chimes (no missing external audio files).
- Links focus sprints directly to tasks to automatically compute actual time spent.

### 4. Productivity Analytics
- Daily focus minutes and completed tasks charted over 7, 14, and 30-day windows via Recharts.
- Category distribution donut chart.
- Consecutive daily productivity streak tracking and completion rate percentage.

### 5. AI Productivity Coach & Task Recommender
- "Suggest Next Task" analyzes priorities, deadlines, and urgency to recommend the single most impactful item to tackle.
- "Generate AI Insights" evaluates user velocity, overdue items, and focus duration to provide customized praise, warnings, and optimization tips.

---

## 🛠️ Technology Stack

| Layer | Technologies | Key Highlights |
|---|---|---|
| **Frontend** | React 18, Vite, React Router 6, Recharts, React Icons | Fast HMR, zero-bundle bloat, responsive layout |
| **Styling** | Vanilla CSS Glassmorphism Design System | Curated CSS custom properties, backdrop filters, animated glowing background blobs |
| **Backend** | Node.js, Express 4.x, Helmet, CORS, Express-Rate-Limit | RESTful API, structured error handling, security hardening |
| **Database** | MongoDB Atlas, Mongoose ODM | Relational user references, compound indexing, aggregation pipelines |
| **Security** | JWT (JSON Web Tokens), bcryptjs | Stateless authorization, password hashing (10 salt rounds) |
| **AI Integration** | `@google/generative-ai` (Gemini 1.5 Flash) | Structured JSON output parsing, prompt engineering, heuristic fallback |

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### 1. Clone & Directory Navigation
```bash
cd scratch/flowstate
```

### 2. Backend Setup
```bash
cd server
npm install
```

Configure your environment file `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/flowstate?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
# Optional: Set Gemini API key for live AI generation
GEMINI_API_KEY=your_gemini_api_key
```

Start the backend server:
```bash
npm run dev
# Or for production:
npm start
```
The API server will listen on `http://localhost:5000`.

### 3. Frontend Setup
Open a separate terminal:
```bash
cd client
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📡 API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| `GET` | `/api/auth/me` | Fetch active user profile | Yes |
| `PUT` | `/api/auth/profile` | Update display name and timer preferences | Yes |
| `PUT` | `/api/auth/password` | Change user password | Yes |

### Tasks (`/api/tasks`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/tasks` | List tasks (supports `status`, `quadrant`, `category`, `search`) | Yes |
| `POST` | `/api/tasks` | Create a new task | Yes |
| `GET` | `/api/tasks/:id` | Get specific task details | Yes |
| `PUT` | `/api/tasks/:id` | Update task fields (status, priority, deadline) | Yes |
| `DELETE` | `/api/tasks/:id` | Delete task | Yes |
| `POST` | `/api/tasks/:id/subtasks` | Append a subtask | Yes |
| `PUT` | `/api/tasks/:id/subtasks/:subId` | Toggle subtask completion status | Yes |
| `DELETE` | `/api/tasks/:id/subtasks/:subId`| Remove subtask | Yes |

### Focus Sessions (`/api/sessions`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/sessions/start` | Record start of focus session | Yes |
| `PUT` | `/api/sessions/:id/end` | Finish session, log actual duration & notes | Yes |
| `GET` | `/api/sessions/active` | Get currently running session | Yes |
| `GET` | `/api/sessions/stats` | Aggregate focus statistics (`today`, `7d`, `30d`) | Yes |

### Analytics & Insights (`/api/analytics`, `/api/ai`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | High-level metrics for dashboard cards | Yes |
| `GET` | `/api/analytics/trends` | Time-series data points for charts | Yes |
| `GET` | `/api/analytics/categories` | Breakdown of tasks by category | Yes |
| `GET` | `/api/analytics/streak` | Current and longest daily streaks | Yes |
| `POST` | `/api/ai/breakdown` | AI subtask breakdown for a specific task | Yes |
| `POST` | `/api/ai/suggest-next` | Recommend single best next task | Yes |
| `POST` | `/api/ai/insights` | Generate personalized productivity coaching tips | Yes |

---

## 🎨 Design Philosophy

- **Dark Mode by Default**: `#06060f` deep canvas reduces eye fatigue during extended focus sessions.
- **Glassmorphism**: Layered semi-transparent backdrops (`backdrop-filter: blur(20px)`) create visual depth.
- **Micro-Animations**: Keyframe animated floating background blobs, tab transitions, and hover scale responses.
- **Accessible & High-Contrast Typography**: Inter typeface with tabular numerical alignment for the countdown clock.

---

## 📄 License
MIT License. Built for the End-Term Software Engineering Project.
