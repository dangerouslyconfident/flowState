// FlowState Focus Guardian - Background Service Worker (Manifest V3)

const API_BASE = 'http://localhost:5000/api';

const DEFAULT_BLACKLIST = [
  'youtube.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'netflix.com',
  'twitch.tv',
  'discord.com'
];

let guardianState = {
  isFocusActive: false,
  activeTaskId: null,
  activeTaskTitle: 'Deep Focus Session',
  activeSessionId: null,
  blacklistedSites: DEFAULT_BLACKLIST,
  token: null
};

// Initialize state from storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ guardianState });
  console.log('FlowState Focus Guardian Installed.');
});

// Load stored state on startup
chrome.storage.local.get(['guardianState'], (res) => {
  if (res.guardianState) {
    guardianState = { ...guardianState, ...res.guardianState };
  }
});

// Sync with FlowState backend
async function syncWithBackend() {
  try {
    const storage = await chrome.storage.local.get(['flowstate_token']);
    const token = storage.flowstate_token || guardianState.token;
    if (!token) return;

    // Check active session
    const sessionRes = await fetch(`${API_BASE}/sessions/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (sessionRes.ok) {
      const data = await sessionRes.json();
      if (data.session) {
        guardianState.isFocusActive = true;
        guardianState.activeSessionId = data.session._id;
        guardianState.activeTaskTitle = data.session.taskTitle || data.session.taskId?.title || 'Active Focus Sprint';
        guardianState.activeTaskId = data.session.taskId?._id || data.session.taskId;
      } else {
        guardianState.isFocusActive = false;
        guardianState.activeSessionId = null;
      }
    }

    // Check blacklist
    const blacklistRes = await fetch(`${API_BASE}/auth/blacklist`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (blacklistRes.ok) {
      const bData = await blacklistRes.json();
      if (bData.blacklistedSites && bData.blacklistedSites.length > 0) {
        guardianState.blacklistedSites = bData.blacklistedSites;
      }
    }

    chrome.storage.local.set({ guardianState });
  } catch (err) {
    // Backend offline or localhost not reachable right now
  }
}

// Periodic sync alarm every 1 minute
chrome.alarms.create('syncFlowState', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncFlowState') {
    syncWithBackend();
  }
});

// Helper: check if a URL matches blacklisted sites
function isUrlBlacklisted(urlStr) {
  if (!urlStr || urlStr.startsWith('chrome://') || urlStr.startsWith('chrome-extension://')) {
    return null;
  }
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const sites = guardianState.blacklistedSites || DEFAULT_BLACKLIST;
    const match = sites.find(site => {
      const cleanSite = site.toLowerCase().replace(/^www\./, '').trim();
      return hostname === cleanSite || hostname.endsWith('.' + cleanSite);
    });
    return match ? hostname : null;
  } catch {
    return null;
  }
}

// Monitor tab navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url) return;

  const blacklistedDomain = isUrlBlacklisted(changeInfo.url);
  if (blacklistedDomain && guardianState.isFocusActive) {
    interceptDistraction(tabId, changeInfo.url, blacklistedDomain);
  }
});

// Intercept attempted distraction
async function interceptDistraction(tabId, url, domain) {
  const taskName = guardianState.activeTaskTitle || 'Your Current Goal';

  // 1. Redirect to Glassmorphic Intervention Screen
  const interveneUrl = chrome.runtime.getURL(
    `intervene.html?url=${encodeURIComponent(url)}&site=${encodeURIComponent(domain)}&task=${encodeURIComponent(taskName)}`
  );
  chrome.tabs.update(tabId, { url: interveneUrl });

  // 2. Trigger native OS notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="30" fill="%236C63FF"/><text x="32" y="42" font-size="32" text-anchor="middle" fill="white">⚡</text></svg>',
    title: '⚠️ FlowState: Wavering Intercepted!',
    message: `You opened ${domain} while scheduled to focus on "${taskName}". Stay on task!`,
    priority: 2
  });

  // 3. Report incident to FlowState MERN backend
  try {
    const storage = await chrome.storage.local.get(['flowstate_token']);
    const token = storage.flowstate_token || guardianState.token;
    if (token) {
      await fetch(`${API_BASE}/sessions/distraction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          site: domain,
          url,
          sessionId: guardianState.activeSessionId,
          action: 'blocked'
        })
      });
    }
  } catch (err) {
    console.warn('Could not report distraction to backend:', err);
  }
}

// Handle messages from popup or web client
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_FOCUS') {
    guardianState.isFocusActive = true;
    guardianState.activeTaskTitle = request.taskTitle || 'Deep Focus Session';
    guardianState.activeTaskId = request.taskId || null;
    chrome.storage.local.set({ guardianState });
    sendResponse({ success: true, guardianState });
  } else if (request.type === 'STOP_FOCUS') {
    guardianState.isFocusActive = false;
    chrome.storage.local.set({ guardianState });
    sendResponse({ success: true, guardianState });
  } else if (request.type === 'GET_STATE') {
    sendResponse({ guardianState });
  } else if (request.type === 'SYNC_TOKEN') {
    guardianState.token = request.token;
    chrome.storage.local.set({ flowstate_token: request.token, guardianState });
    syncWithBackend();
    sendResponse({ success: true });
  }
  return true;
});
