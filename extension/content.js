// FlowState Focus Guardian - Content Script

// If running on FlowState web app (localhost:5173 or localhost:5000), sync auth token and focus state
if (window.location.hostname === 'localhost' && (window.location.port === '5173' || window.location.port === '5000')) {
  function syncAuthToken() {
    const token = localStorage.getItem('flowstate_token');
    if (token) {
      chrome.runtime.sendMessage({ type: 'SYNC_TOKEN', token });
    }
  }

  // Initial sync
  syncAuthToken();

  // Listen for storage changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'flowstate_token') {
      syncAuthToken();
    }
  });

  // Listen for custom events dispatched by FlowState web app
  window.addEventListener('flowstate:focus_start', (e) => {
    chrome.runtime.sendMessage({
      type: 'START_FOCUS',
      taskId: e.detail?.taskId,
      taskTitle: e.detail?.taskTitle
    });
  });

  window.addEventListener('flowstate:focus_stop', () => {
    chrome.runtime.sendMessage({ type: 'STOP_FOCUS' });
  });
}
