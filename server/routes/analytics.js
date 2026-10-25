const express = require('express');
const Task = require('../models/Task');
const FocusSession = require('../models/FocusSession');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// GET /api/analytics/overview - Dashboard overview stats
router.get('/overview', async (req, res) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

    // Task counts
    const [totalTasks, completedTasks, inProgressTasks, todoTasks, overdueTasks] = await Promise.all([
      Task.countDocuments({ userId }),
      Task.countDocuments({ userId, status: 'done' }),
      Task.countDocuments({ userId, status: 'in-progress' }),
      Task.countDocuments({ userId, status: 'todo' }),
      Task.countDocuments({ userId, status: { $ne: 'done' }, deadline: { $lt: now, $ne: null } })
    ]);

    // Today's completed tasks
    const todayCompleted = await Task.countDocuments({
      userId,
      status: 'done',
      completedAt: { $gte: todayStart }
    });

    // Today's focus time
    const todayFocus = await FocusSession.aggregate([
      {
        $match: {
          userId,
          type: 'work',
          endTime: { $ne: null },
          startTime: { $gte: todayStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);

    // Weekly focus time
    const weekFocus = await FocusSession.aggregate([
      {
        $match: {
          userId,
          type: 'work',
          endTime: { $ne: null },
          startTime: { $gte: weekStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ]);

    // Daily Quotas calculation
    const quotaTasks = await Task.find({
      userId,
      status: { $ne: 'done' },
      dailyQuotaMinutes: { $gt: 0 }
    });
    const todayStr = todayStart.toISOString().split('T')[0];
    let totalQuotaAllocatedToday = 0;
    let totalQuotaLoggedToday = 0;
    quotaTasks.forEach(t => {
      totalQuotaAllocatedToday += t.dailyQuotaMinutes || 0;
      const h = t.dailyQuotaHistory?.find(e => e.date === todayStr);
      totalQuotaLoggedToday += h ? h.minutesLogged : (t.todayFocusMinutes || 0);
    });

    // Distraction Interceptions
    const todayDistractions = await FocusSession.aggregate([
      {
        $match: {
          userId,
          startTime: { $gte: todayStart }
        }
      },
      { $unwind: '$distractions' },
      { $count: 'total' }
    ]);

    const totalDistractions = await FocusSession.aggregate([
      { $match: { userId } },
      { $unwind: '$distractions' },
      { $count: 'total' }
    ]);

    const totalWorkSessions = await FocusSession.countDocuments({
      userId,
      type: 'work',
      endTime: { $ne: null }
    });

    const cleanSessions = await FocusSession.countDocuments({
      userId,
      type: 'work',
      endTime: { $ne: null },
      distractionCount: { $eq: 0 }
    });

    const distractionResistance = totalWorkSessions > 0
      ? Math.round((cleanSessions / totalWorkSessions) * 100)
      : 100;

    res.json({
      overview: {
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          todo: todoTasks,
          overdue: overdueTasks,
          todayCompleted,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        focus: {
          todayMinutes: Math.round((todayFocus[0]?.total || 0) / 60),
          weekMinutes: Math.round((weekFocus[0]?.total || 0) / 60)
        },
        dailyQuota: {
          allocatedMinutes: totalQuotaAllocatedToday,
          loggedMinutes: totalQuotaLoggedToday,
          complianceRate: totalQuotaAllocatedToday > 0 
            ? Math.min(100, Math.round((totalQuotaLoggedToday / totalQuotaAllocatedToday) * 100))
            : 100
        },
        distractions: {
          todayBlocked: todayDistractions[0]?.total || 0,
          totalBlocked: totalDistractions[0]?.total || 0,
          resistanceScore: distractionResistance
        }
      }
    });
  } catch (error) {
    console.error('Overview error:', error);
    res.status(500).json({ error: 'Failed to fetch overview.' });
  }
});

// GET /api/analytics/trends - Daily trends for charts
router.get('/trends', async (req, res) => {
  try {
    const { days = 14 } = req.query;
    const userId = req.userId;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    startDate.setHours(0, 0, 0, 0);

    // Tasks completed per day
    const taskTrends = await Task.aggregate([
      {
        $match: {
          userId,
          status: 'done',
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Focus minutes per day
    const focusTrends = await FocusSession.aggregate([
      {
        $match: {
          userId,
          type: 'work',
          endTime: { $ne: null },
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
          },
          totalMinutes: { $sum: { $divide: ['$duration', 60] } },
          sessions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing dates with zeros
    const numDays = Number(days);
    const filledData = [];
    for (let i = 0; i < numDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const taskDay = taskTrends.find(t => t._id === dateStr);
      const focusDay = focusTrends.find(f => f._id === dateStr);

      filledData.push({
        date: dateStr,
        tasksCompleted: taskDay?.count || 0,
        focusMinutes: Math.round(focusDay?.totalMinutes || 0),
        sessions: focusDay?.sessions || 0
      });
    }

    res.json({ trends: filledData });
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({ error: 'Failed to fetch trends.' });
  }
});

// GET /api/analytics/categories - Task breakdown by category
router.get('/categories', async (req, res) => {
  try {
    const categories = await Task.aggregate([
      { $match: { userId: req.userId } },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          totalMinutes: { $sum: { $ifNull: ['$actualMinutes', 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json({
      categories: categories.map(c => ({
        name: c._id || 'Uncategorized',
        total: c.total,
        completed: c.completed,
        completionRate: c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0,
        totalMinutes: c.totalMinutes
      }))
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// GET /api/analytics/streak - Compute productivity streak
router.get('/streak', async (req, res) => {
  try {
    const userId = req.userId;

    // Get dates with completed tasks or focus sessions in the last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [taskDates, sessionDates] = await Promise.all([
      Task.aggregate([
        { $match: { userId, status: 'done', completedAt: { $gte: sixtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } } } }
      ]),
      FocusSession.aggregate([
        { $match: { userId, type: 'work', endTime: { $ne: null }, startTime: { $gte: sixtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } } } }
      ])
    ]);

    // Merge unique dates
    const activeDates = new Set([
      ...taskDates.map(d => d._id),
      ...sessionDates.map(d => d._id)
    ]);

    // Calculate current streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (activeDates.has(dateStr)) {
        streak++;
      } else if (i === 0) {
        // Today hasn't had activity yet, continue checking from yesterday
        continue;
      } else {
        break;
      }
    }

    // Calculate longest streak
    const sortedDates = Array.from(activeDates).sort();
    let longestStreak = 0;
    let currentRun = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        currentRun++;
      } else {
        longestStreak = Math.max(longestStreak, currentRun);
        currentRun = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentRun);

    res.json({
      streak: {
        current: streak,
        longest: sortedDates.length > 0 ? longestStreak : 0,
        activeDays: activeDates.size
      }
    });
  } catch (error) {
    console.error('Streak error:', error);
    res.status(500).json({ error: 'Failed to compute streak.' });
  }
});

module.exports = router;
