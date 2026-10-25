const User = require('../models/User');
const Task = require('../models/Task');
const FocusSession = require('../models/FocusSession');

async function seedDefaultData() {
  try {
    const existingUser = await User.findOne({ email: 'aakash@flowstate.dev' });
    if (existingUser) return;

    console.log('🌱 Seeding demo user and initial productivity data...');

    const user = new User({
      name: 'Aakash Verma',
      email: 'aakash@flowstate.dev',
      password: 'password123',
      settings: {
        pomoDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        dailyGoalMinutes: 120,
        dailyFocusQuota: 180,
        notificationsEnabled: true,
        soundEnabled: true,
        distractionMode: 'warning',
        distractionAlertMessage: 'Stay on task! Wavering from your task breaks your focus streak.',
        blacklistedSites: [
          'youtube.com',
          'reddit.com',
          'twitter.com',
          'x.com',
          'instagram.com',
          'facebook.com',
          'tiktok.com',
          'netflix.com'
        ]
      }
    });

    await user.save();

    const today = new Date().toISOString().split('T')[0];
    const deadlineToday = new Date();
    deadlineToday.setHours(20, 0, 0, 0);

    const task1 = new Task({
      userId: user._id,
      title: 'Finalize End-Term Project Architecture & Demo',
      description: 'Review end-to-end MERN stack implementation, daily quotas, and blacklist guardian interventions.',
      priority: 1,
      urgency: 1,
      category: 'Engineering',
      status: 'in-progress',
      deadline: deadlineToday,
      targetCompletionTime: '20:00',
      dailyQuotaMinutes: 60,
      todayFocusMinutes: 25,
      actualMinutes: 25,
      reminderLeadTime: 15,
      focusSlots: [{ startTime: '09:00', endTime: '10:00', dayOfWeek: 'all' }],
      subtasks: [
        { title: 'Test Daily Quota Planner and time allocations', done: true, estimatedMinutes: 20 },
        { title: 'Verify Blacklist Guardian distraction interception', done: true, estimatedMinutes: 15 },
        { title: 'Confirm synthesized audio chimes and web notifications', done: false, estimatedMinutes: 15 }
      ],
      dailyQuotaHistory: [{
        date: today,
        minutesLogged: 25,
        quotaTarget: 60
      }]
    });

    const task2 = new Task({
      userId: user._id,
      title: 'Review System Design & Extension Companion',
      description: 'Ensure Manifest V3 extension syncs seamlessly with FlowState web portal.',
      priority: 2,
      urgency: 1,
      category: 'Testing',
      status: 'todo',
      dailyQuotaMinutes: 45,
      todayFocusMinutes: 0,
      reminderLeadTime: 15,
      focusSlots: [{ startTime: '14:00', endTime: '15:00', dayOfWeek: 'all' }]
    });

    await Promise.all([task1.save(), task2.save()]);

    // Seed an initial focus session with a blocked distraction
    const session = new FocusSession({
      userId: user._id,
      taskId: task1._id,
      taskTitle: task1.title,
      plannedDuration: 1500,
      duration: 1500,
      type: 'work',
      completed: true,
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() - 2100000),
      notes: 'Completed architecture review and verified daily quota tracking',
      distractionCount: 1,
      distractions: [{
        site: 'youtube.com',
        url: 'https://youtube.com',
        timestamp: new Date(Date.now() - 3000000),
        action: 'blocked'
      }]
    });

    await session.save();

    console.log('✅ Demo user (aakash@flowstate.dev / password123) and sample tasks seeded successfully.');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

module.exports = seedDefaultData;
