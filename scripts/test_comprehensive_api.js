const BASE = 'http://localhost:5000/api';

async function testComprehensive() {
  console.log('====================================================');
  console.log('   FLOWSTATE COMPREHENSIVE END-TO-END API TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    try {
      process.stdout.write(`Testing: ${desc}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED:', err.message);
      failed++;
    }
  }

  // 1. Health
  await assert('Health check', async () => {
    const res = await fetch(`${BASE}/health`);
    const data = await res.json();
    if (res.status !== 200 || data.status !== 'ok') throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  });

  // 2. Register New User
  const randomEmail = `test_${Date.now()}@flowstate.dev`;
  let userToken = '';
  let userId = '';

  await assert('User Registration', async () => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Tester Flow',
        email: randomEmail,
        password: 'Password123!',
        dailyGoalMinutes: 90
      })
    });
    const data = await res.json();
    if (res.status !== 201 || !data.token) throw new Error(`Registration failed: ${JSON.stringify(data)}`);
    userToken = data.token;
    userId = data.user.id || data.user._id;
  });

  // 3. Prevent duplicate registration (409 Conflict)
  await assert('Reject Duplicate Email Registration (409 Conflict)', async () => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: randomEmail,
        password: 'Password123!'
      })
    });
    if (res.status !== 409) throw new Error(`Expected status 409, got ${res.status}`);
  });

  // 4. Reject invalid login
  await assert('Reject Invalid Login Password', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'WrongPassword!'
      })
    });
    if (res.status !== 400 && res.status !== 401) throw new Error(`Expected 400 or 401, got ${res.status}`);
  });

  // 5. Valid Login
  await assert('Valid User Login', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'Password123!'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
    userToken = data.token;
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  };

  // 6. User Profile Retrieval
  await assert('Fetch Authenticated User Profile', async () => {
    const res = await fetch(`${BASE}/auth/me`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || data.user.email !== randomEmail) throw new Error(`Fetch profile failed: ${JSON.stringify(data)}`);
  });

  // 7. Update User Settings & Blacklist
  await assert('Update User Settings & Blacklist via PUT /auth/profile', async () => {
    const res = await fetch(`${BASE}/auth/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Updated Tester',
        settings: {
          pomoDuration: 30,
          shortBreak: 6,
          longBreak: 20,
          dailyGoalMinutes: 150,
          dailyFocusQuota: 200,
          notificationsEnabled: true,
          soundEnabled: true,
          blacklistedSites: ['youtube.com', 'reddit.com', 'facebook.com', 'customdistraction.com']
        }
      })
    });
    const data = await res.json();
    if (res.status !== 200 || data.user.settings?.pomoDuration !== 30) throw new Error(`Update settings failed: ${JSON.stringify(data)}`);
  });

  // 8. Fetch Blacklist Endpoint (for extension sync)
  await assert('Fetch Blacklist via /auth/blacklist', async () => {
    const res = await fetch(`${BASE}/auth/blacklist`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !data.blacklistedSites.includes('customdistraction.com')) {
      throw new Error(`Blacklist fetch failed: ${JSON.stringify(data)}`);
    }
  });

  // 9. Change Password
  await assert('Change User Password via PUT /auth/password', async () => {
    const res = await fetch(`${BASE}/auth/password`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!'
      })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Password change failed: ${JSON.stringify(data)}`);
  });

  // 10. Login with New Password
  await assert('Login with New Password', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'NewPassword456!'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.token) throw new Error(`Login with new password failed: ${JSON.stringify(data)}`);
    userToken = data.token;
    authHeaders['Authorization'] = `Bearer ${userToken}`;
  });

  // 11. Create Rich Task with Quota & Eisenhower attributes
  let createdTaskId = '';
  await assert('Create Task with Quotas & Eisenhower Matrix', async () => {
    const res = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Master Full-Stack Microservices & Cloud Deployments',
        description: 'Deploy MERN stack to production cloud environment with zero downtime.',
        priority: 1,
        urgency: 1,
        category: 'Engineering',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        targetCompletionTime: '17:00',
        dailyQuotaMinutes: 60,
        reminderLeadTime: 30,
        focusSlots: [{ startTime: '10:00', endTime: '11:00', dayOfWeek: 'all' }]
      })
    });
    const data = await res.json();
    if (res.status !== 201 || !data.task?._id) throw new Error(`Create task failed: ${JSON.stringify(data)}`);
    createdTaskId = data.task._id;
  });

  // 12. AI Subtask Decomposition
  await assert('AI Task Breakdown Decomposition (with Heuristic Fallback)', async () => {
    const res = await fetch(`${BASE}/ai/breakdown`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ taskId: createdTaskId })
    });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.subtasks) || data.subtasks.length === 0) {
      throw new Error(`AI breakdown failed: ${JSON.stringify(data)}`);
    }
  });

  // 13. Add manual subtask
  let subtaskId = '';
  await assert('Add Manual Subtask to Task', async () => {
    const res = await fetch(`${BASE}/tasks/${createdTaskId}/subtasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Verify TLS certificate and HTTPS redirect',
        estimatedMinutes: 10
      })
    });
    const data = await res.json();
    if (res.status !== 200 && res.status !== 201) throw new Error(`Add subtask failed: ${JSON.stringify(data)}`);
    const added = data.task.subtasks.find(s => s.title.includes('TLS certificate'));
    if (!added) throw new Error('Subtask not found in task');
    subtaskId = added._id;
  });

  // 14. Toggle subtask
  await assert('Toggle Subtask Completion Status', async () => {
    const res = await fetch(`${BASE}/tasks/${createdTaskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ done: true })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Toggle subtask failed: ${JSON.stringify(data)}`);
  });

  // 15. AI Next Task Suggestion
  await assert('AI Next Task Recommendation', async () => {
    const res = await fetch(`${BASE}/ai/suggest-next`, {
      method: 'POST',
      headers: authHeaders
    });
    const data = await res.json();
    if (res.status !== 200 || !data.suggestion?.task) throw new Error(`AI suggestion failed: ${JSON.stringify(data)}`);
  });

  // 16. AI Productivity Insights
  await assert('AI Productivity Insights Generation', async () => {
    const res = await fetch(`${BASE}/ai/insights`, {
      method: 'POST',
      headers: authHeaders
    });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.insights)) throw new Error(`AI insights failed: ${JSON.stringify(data)}`);
  });

  // 17. Update Task Status
  await assert('Update Task Status to in-progress', async () => {
    const res = await fetch(`${BASE}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'in-progress'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || data.task.status !== 'in-progress') throw new Error(`Update task failed: ${JSON.stringify(data)}`);
  });

  // 18. Quick Log Quota Minutes to Task
  await assert('Direct Quick Log Quota Minutes (POST /tasks/:id/log-quota)', async () => {
    const res = await fetch(`${BASE}/tasks/${createdTaskId}/log-quota`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ minutes: 25 })
    });
    const data = await res.json();
    if (res.status !== 200 || data.task.todayFocusMinutes < 25) throw new Error(`Log quota failed: ${JSON.stringify(data)}`);
  });

  // 19. Check Today Quota Planner API
  await assert('Daily Quotas Today Calculation', async () => {
    const res = await fetch(`${BASE}/tasks/quotas/today`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || typeof data.totalQuotaAllocated !== 'number' || data.totalMinutesCompleted < 25) {
      throw new Error(`Quota calc failed: ${JSON.stringify(data)}`);
    }
  });

  // 20. Check Pending Reminders API
  await assert('Pending Notification Reminders Ticker', async () => {
    const res = await fetch(`${BASE}/tasks/reminders/pending`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.reminders)) throw new Error(`Reminders check failed: ${JSON.stringify(data)}`);
  });

  // 21. Start Focus Session
  let activeSessionId = '';
  await assert('Start Focus Session Sprint', async () => {
    const res = await fetch(`${BASE}/sessions/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        taskId: createdTaskId,
        plannedDuration: 1800,
        type: 'work'
      })
    });
    const data = await res.json();
    if (res.status !== 201 || !data.session?._id) throw new Error(`Start session failed: ${JSON.stringify(data)}`);
    activeSessionId = data.session._id;
  });

  // 22. Verify Get Active Session
  await assert('Query Active Focus Session', async () => {
    const res = await fetch(`${BASE}/sessions/active`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !data.session || data.session._id !== activeSessionId) {
      throw new Error(`Active session fetch failed: ${JSON.stringify(data)}`);
    }
  });

  // 23. Intercept and Log Blacklist Distraction
  await assert('Log Blacklist Distraction Intervention', async () => {
    const res = await fetch(`${BASE}/sessions/distraction`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        site: 'customdistraction.com',
        url: 'https://customdistraction.com/feed',
        sessionId: activeSessionId,
        action: 'blocked'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.warning) throw new Error(`Distraction log failed: ${JSON.stringify(data)}`);
  });

  // 24. Conclude Focus Session
  await assert('Conclude Focus Session & Log History', async () => {
    const res = await fetch(`${BASE}/sessions/${activeSessionId}/end`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        completed: true,
        notes: 'Great 30-minute sprint, stayed focused.'
      })
    });
    const data = await res.json();
    if (res.status !== 200 || !data.session.completed) throw new Error(`End session failed: ${JSON.stringify(data)}`);
  });

  // 25. Fetch Sessions List
  await assert('Fetch Focus Sessions List (GET /sessions)', async () => {
    const res = await fetch(`${BASE}/sessions?limit=10`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.sessions) || data.sessions.length === 0) {
      throw new Error(`Sessions list failed: ${JSON.stringify(data)}`);
    }
  });

  // 26. Fetch Recent Distractions List
  await assert('Fetch Recent Distractions List', async () => {
    const res = await fetch(`${BASE}/sessions/distractions/recent`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.distractions) || data.distractions.length === 0) {
      throw new Error(`Recent distractions failed: ${JSON.stringify(data)}`);
    }
  });

  // 27. Fetch Session Stats
  await assert('Fetch Session Statistics', async () => {
    const res = await fetch(`${BASE}/sessions/stats?period=7d`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || typeof data.stats?.totalSessions !== 'number') {
      throw new Error(`Session stats failed: ${JSON.stringify(data)}`);
    }
  });

  // 28. Analytics Overview
  await assert('Fetch Analytics Overview', async () => {
    const res = await fetch(`${BASE}/analytics/overview`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !data.overview?.tasks) throw new Error(`Overview fetch failed: ${JSON.stringify(data)}`);
  });

  // 29. Analytics Trends
  await assert('Fetch Analytics Trends (GET /analytics/trends)', async () => {
    const res = await fetch(`${BASE}/analytics/trends?days=7`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.trends)) throw new Error(`Daily trends failed: ${JSON.stringify(data)}`);
  });

  // 30. Analytics Categories
  await assert('Fetch Analytics Categories (GET /analytics/categories)', async () => {
    const res = await fetch(`${BASE}/analytics/categories`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || !Array.isArray(data.categories)) throw new Error(`Category breakdown failed: ${JSON.stringify(data)}`);
  });

  // 31. Analytics Streak
  await assert('Fetch Focus & Completion Streak', async () => {
    const res = await fetch(`${BASE}/analytics/streak`, { headers: authHeaders });
    const data = await res.json();
    if (res.status !== 200 || typeof data.streak?.current !== 'number') throw new Error(`Streak failed: ${JSON.stringify(data)}`);
  });

  // 32. Delete Task
  await assert('Delete Task by ID', async () => {
    const res = await fetch(`${BASE}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: authHeaders
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Delete task failed: ${JSON.stringify(data)}`);
  });

  console.log('\n====================================================');
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

testComprehensive().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
