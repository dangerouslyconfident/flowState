// FlowState Focus Guardian - Popup Logic

document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const taskName = document.getElementById('task-name');
  const sitesList = document.getElementById('sites-list');
  const blacklistCount = document.getElementById('blacklist-count');
  const btnOpenApp = document.getElementById('btn-open-app');
  const btnToggleTest = document.getElementById('btn-toggle-test');

  function renderState(state) {
    if (state.isFocusActive) {
      statusPill.className = 'status-pill status-active';
      statusText.textContent = 'Guarding';
      taskName.textContent = state.activeTaskTitle || 'Deep Focus Sprint';
    } else {
      statusPill.className = 'status-pill status-idle';
      statusText.textContent = 'Idle';
      taskName.textContent = 'No active focus session';
    }

    const sites = state.blacklistedSites || [];
    blacklistCount.textContent = sites.length;
    sitesList.innerHTML = '';
    sites.forEach(site => {
      const tag = document.createElement('div');
      tag.className = 'site-tag';
      tag.textContent = site;
      sitesList.appendChild(tag);
    });
  }

  // Request state from background service worker
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response?.guardianState) {
      renderState(response.guardianState);
    }
  });

  // Open Web App
  btnOpenApp.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/focus' });
  });

  // Toggle Test Guard Mode
  btnToggleTest.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
      const current = res?.guardianState?.isFocusActive;
      if (current) {
        chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, (r) => {
          renderState(r.guardianState);
        });
      } else {
        chrome.runtime.sendMessage({
          type: 'START_FOCUS',
          taskTitle: 'Test Focus Block: End-Term Demo'
        }, (r) => {
          renderState(r.guardianState);
        });
      }
    });
  });
});
