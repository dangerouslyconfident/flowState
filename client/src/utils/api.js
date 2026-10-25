const API_BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function getToken() {
  return localStorage.getItem('flowstate_token');
}

function setToken(token) {
  localStorage.setItem('flowstate_token', token);
}

function removeToken() {
  localStorage.removeItem('flowstate_token');
}

async function request(endpoint, options = {}) {
  const { method = 'GET', body, headers: extraHeaders = {} } = options;
  
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    // Auto-logout on 401
    if (response.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    throw new ApiError(data.error || 'Something went wrong', response.status);
  }

  return data;
}

// Auth API
export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  getProfile: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
  changePassword: (data) => request('/auth/password', { method: 'PUT', body: data }),
  getBlacklist: () => request('/auth/blacklist')
};

// Tasks API
export const tasksApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tasks${query ? '?' + query : ''}`);
  },
  get: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks', { method: 'POST', body: data }),
  update: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  addSubtask: (id, data) => request(`/tasks/${id}/subtasks`, { method: 'POST', body: data }),
  toggleSubtask: (taskId, subId, data) => request(`/tasks/${taskId}/subtasks/${subId}`, { method: 'PUT', body: data }),
  removeSubtask: (taskId, subId) => request(`/tasks/${taskId}/subtasks/${subId}`, { method: 'DELETE' }),
  getTodayQuotas: () => request('/tasks/quotas/today'),
  getPendingReminders: () => request('/tasks/reminders/pending'),
  logQuota: (id, minutes) => request(`/tasks/${id}/log-quota`, { method: 'POST', body: { minutes } })
};

// Sessions API
export const sessionsApi = {
  start: (data) => request('/sessions/start', { method: 'POST', body: data }),
  end: (id, data) => request(`/sessions/${id}/end`, { method: 'PUT', body: data }),
  getActive: () => request('/sessions/active'),
  cancelActive: () => request('/sessions/active', { method: 'DELETE' }),
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sessions${query ? '?' + query : ''}`);
  },
  stats: (period = '7d') => request(`/sessions/stats?period=${period}`),
  logDistraction: (data) => request('/sessions/distraction', { method: 'POST', body: data }),
  getRecentDistractions: () => request('/sessions/distractions/recent')
};

// Analytics API
export const analyticsApi = {
  overview: () => request('/analytics/overview'),
  trends: (days = 14) => request(`/analytics/trends?days=${days}`),
  categories: () => request('/analytics/categories'),
  streak: () => request('/analytics/streak')
};

// AI API
export const aiApi = {
  breakdown: (taskId) => request('/ai/breakdown', { method: 'POST', body: { taskId } }),
  suggestNext: () => request('/ai/suggest-next', { method: 'POST' }),
  insights: () => request('/ai/insights', { method: 'POST' })
};

export { getToken, setToken, removeToken, ApiError };
