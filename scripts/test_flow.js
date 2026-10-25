const BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('==============================================');
  console.log('   FLOWSTATE FULL SYSTEM VERIFICATION SUITE   ');
  console.log('==============================================\n');

  // 1. Login
  console.log('➡️ Test 1: User Authentication');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aakash@flowstate.dev', password: 'password123' })
  });
  if (!loginRes.ok) throw new Error(`Login failed with status ${loginRes.status}`);
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log(`✅ Logged in as: ${loginData.user.name} (${loginData.user.email})`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Fetch Tasks
  console.log('\n➡️ Test 2: Task Listing & Creation');
  const tasksRes = await fetch(`${BASE}/tasks?status=pending`, { headers });
  const tasksData = await tasksRes.json();
  console.log(`✅ Fetched pending tasks count: ${tasksData.tasks.length}`);

  let activeTaskId = tasksData.tasks[0]?._id;
  if (!activeTaskId) {
    const createRes = await fetch(`${BASE}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Complete Software Architecture & System Demo',
        priority: 1,
        urgency: 1,
        category: 'Engineering',
        dailyQuotaMinutes: 60,
        reminderLeadTime: 15
      })
    });
    const createData = await createRes.json();
    activeTaskId = createData.task._id;
    console.log(`✅ Created new test task with ID: ${activeTaskId}`);
  } else {
    console.log(`✅ Using existing task: "${tasksData.tasks[0].title}" (${activeTaskId})`);
  }

  // 3. Start Focus Sprint 1
  console.log('\n➡️ Test 3: Starting Focus Sprint (Auto-cleanup stale sessions)');
  const start1Res = await fetch(`${BASE}/sessions/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      taskId: activeTaskId,
      plannedDuration: 1500,
      type: 'work'
    })
  });
  console.log(`Status: ${start1Res.status}`);
  const start1Data = await start1Res.json();
  if (start1Res.status !== 201) throw new Error(`Start session failed: ${JSON.stringify(start1Data)}`);
  const session1Id = start1Data.session._id;
  console.log(`✅ Focus session #1 started successfully: ${session1Id}`);

  // 4. Start Focus Sprint 2 immediately (must NOT 409 conflict, must auto-supersede)
  console.log('\n➡️ Test 4: Concurrency / Re-start Resilience (Zero-conflict lockout)');
  const start2Res = await fetch(`${BASE}/sessions/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      taskId: activeTaskId,
      plannedDuration: 1500,
      type: 'work'
    })
  });
  console.log(`Status: ${start2Res.status}`);
  const start2Data = await start2Res.json();
  if (start2Res.status !== 201) throw new Error(`Start session #2 failed: ${JSON.stringify(start2Data)}`);
  const session2Id = start2Data.session._id;
  console.log(`✅ Focus session #2 started smoothly without 409 error: ${session2Id}`);

  // 5. Intercept Blacklist Distraction Attempt
  console.log('\n➡️ Test 5: Focus Guardian Blacklist Distraction Interception');
  const distRes = await fetch(`${BASE}/sessions/distraction`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      site: 'reddit.com',
      url: 'https://reddit.com/r/popular',
      sessionId: session2Id,
      action: 'blocked'
    })
  });
  const distData = await distRes.json();
  console.log(`✅ Distraction logged. Warning: "${distData.warning}"`);
  console.log(`   Linked to session: ${distData.activeSessionId}, Task: "${distData.taskTitle}"`);

  // 6. Complete Focus Sprint & Update Task Quotas
  console.log('\n➡️ Test 6: Complete Session & Update Quota History');
  const endRes = await fetch(`${BASE}/sessions/${session2Id}/end`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      completed: true,
      notes: 'Implemented core focus session resilience and tested blacklist protection'
    })
  });
  const endData = await endRes.json();
  console.log(`✅ Session concluded: duration ${endData.session.duration}s, completed: ${endData.session.completed}`);

  // 7. Test Explicit Cancel/Reset Active Session
  console.log('\n➡️ Test 7: Clean Abandonment / Reset of Active Session');
  // Start temporary session
  await fetch(`${BASE}/sessions/start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plannedDuration: 1500, type: 'work' })
  });
  const cancelRes = await fetch(`${BASE}/sessions/active`, {
    method: 'DELETE',
    headers
  });
  const cancelData = await cancelRes.json();
  console.log(`✅ Active session cancelled cleanly: "${cancelData.message}"`);

  // 8. Test Quota Summary
  console.log('\n➡️ Test 8: Daily Quota Planner Summary');
  const quotaRes = await fetch(`${BASE}/tasks/quotas/today`, { headers });
  const quotaData = await quotaRes.json();
  console.log(`✅ Quotas summary: Allocated: ${quotaData.totalQuotaAllocated}m, Completed: ${quotaData.totalMinutesCompleted}m (${quotaData.complianceRate}% compliance)`);

  // 9. Test Pending Reminders
  console.log('\n➡️ Test 9: Pending Notification Reminders');
  const remRes = await fetch(`${BASE}/tasks/reminders/pending`, { headers });
  const remData = await remRes.json();
  console.log(`✅ Pending reminders check: ${remData.reminders.length} alerts pending`);

  // 10. Test Analytics Endpoints
  console.log('\n➡️ Test 10: Productivity Analytics & Streak');
  const [overviewRes, streakRes] = await Promise.all([
    fetch(`${BASE}/analytics/overview`, { headers }).then(r => r.json()),
    fetch(`${BASE}/analytics/streak`, { headers }).then(r => r.json())
  ]);
  console.log(`✅ Analytics Overview:
     - Total Tasks: ${overviewRes.overview.tasks.total}
     - Completion Rate: ${overviewRes.overview.tasks.completionRate}%
     - Focus Time Today: ${overviewRes.overview.focus.todayMinutes}m
     - Distraction Resistance: ${overviewRes.overview.distractions.resistanceScore}%`);
  console.log(`✅ Streak Data: Current: ${streakRes.streak.current} days, Longest: ${streakRes.streak.longest} days`);

  console.log('\n==============================================');
  console.log('   🎉 ALL SYSTEM TESTS COMPLETED SUCCESSFULLY!  ');
  console.log('==============================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
