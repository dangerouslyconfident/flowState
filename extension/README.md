# 🛡️ FlowState Focus Guardian — Chrome / Edge Extension

> Companion browser extension for FlowState that detects when users navigate to blacklisted distraction websites during active focus sessions, intercepts them with anti-wavering interventions, and records distraction resistance metrics.

---

## 🚀 How to Install in 15 Seconds (No Build Required)

1. Open **Google Chrome**, **Microsoft Edge**, or **Brave**.
2. Navigate to:
   - Chrome / Brave: `chrome://extensions`
   - Edge: `edge://extensions`
3. Toggle **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the `extension/` directory inside this project:
   ```text
   C:\Users\Aakash\.gemini\antigravity-ide\scratch\flowstate\extension
   ```
6. That's it! The **FlowState Focus Guardian** icon will appear in your browser toolbar.

---

## ⚡ How It Works

1. **Automatic Synchronization**:
   - When you log into the FlowState web application (`http://localhost:5173`), the extension automatically synchronizes your authentication token, current active task, and custom blacklist settings.
2. **Real-time Navigation Interception**:
   - When a Focus Session is running in FlowState and you open a blacklisted site (e.g. `youtube.com`, `reddit.com`, `twitter.com`, `x.com`, `instagram.com`, `tiktok.com`, `netflix.com`, etc.):
     - The extension immediately redirects the tab to the glassmorphic **"DO NOT WAVER FROM YOUR TASK"** intervention screen.
     - Displays the active task and remaining daily quota.
     - Triggers an OS-level desktop notification reminding you to get back in the zone.
3. **Productivity Analytics Logging**:
   - Every intercepted distraction is reported to `POST /api/sessions/distraction` on the MERN backend.
   - Your Analytics dashboard tracks **Distraction Resistance Score** and **Thwarted Distractions**.
