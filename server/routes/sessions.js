const express = require('express');
const FocusSession = require('../models/FocusSession');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

// POST /api/sessions/start - Start a focus session
router.post('/start', async (req, res) => {
  try {
    const { taskId, plannedDuration, type = 'work' } = req.body;

    if (!plannedDuration || plannedDuration < 60) {
      return res.status(400).json({ error: 'Planned duration must be at least 60 seconds.' });
    }

    let taskTitle = '';
    // Validate task if provided
    if (taskId) {
      const task = await Task.findOne({ _id: taskId, userId: req.userId });
      if (!task) {
        return res.status(404).json({ error: 'Task not found.' });
      }
      taskTitle = task.title;
    }

    // Check for existing active session
    const activeSession = await FocusSession.findOne({
      userId: req.userId,
      endTime: null
    });
    if (activeSession) {
      return res.status(409).json({ 
        error: 'You already have an active session. End it before starting a new one.',
        activeSession 
      });
    }

    const session = new FocusSession({
      userId: req.userId,
      taskId: taskId || null,
      taskTitle: taskTitle || '',
      plannedDuration,
      type,
      startTime: new Date()
    });

    await session.save();

    // Mark task as in-progress if linked
    if (taskId) {
      await Task.findOneAndUpdate(
        { _id: taskId, userId: req.userId, status: 'todo' },
        { status: 'in-progress' }
      );
    }

    res.status(201).json({ message: 'Focus session started.', session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session.' });
  }
});

// PUT /api/sessions/:id/end - End a focus session
router.put('/:id/end', async (req, res) => {
  try {
    const { notes, completed = false } = req.body;

    const session = await FocusSession.findOne({ _id: req.params.id, userId: req.userId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    if (session.endTime) {
      return res.status(400).json({ error: 'Session already ended.' });
    }

    session.endTime = new Date();
    session.completed = completed;
    if (notes) session.notes = notes;

    await session.save();

    // Update task's actual time and daily quota if linked
    if (session.taskId && session.type === 'work') {
      const durationMinutes = Math.round(session.duration / 60);
      const today = new Date().toISOString().split('T')[0];

      const task = await Task.findById(session.taskId);
      if (task) {
        task.actualMinutes = (task.actualMinutes || 0) + durationMinutes;
        task.todayFocusMinutes = (task.todayFocusMinutes || 0) + durationMinutes;

        if (!task.dailyQuotaHistory) task.dailyQuotaHistory = [];
        const existingEntry = task.dailyQuotaHistory.find(h => h.date === today);
        if (existingEntry) {
          existingEntry.minutesLogged += durationMinutes;
          existingEntry.quotaTarget = task.dailyQuotaMinutes;
        } else {
          task.dailyQuotaHistory.push({
            date: today,
            minutesLogged: durationMinutes,
            quotaTarget: task.dailyQuotaMinutes
          });
        }
        await task.save();
      }
    }

    res.json({ message: 'Session ended.', session });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session.' });
  }
});

// POST /api/sessions/distraction - Log blacklisted site distraction attempt
router.post('/distraction', async (req, res) => {
  try {
    const { site, url, sessionId, action = 'blocked' } = req.body;
    if (!site) {
      return res.status(400).json({ error: 'Distraction site/domain is required.' });
    }

    // Find active session or provided sessionId
    let session = null;
    if (sessionId) {
      session = await FocusSession.findOne({ _id: sessionId, userId: req.userId });
    } else {
      session = await FocusSession.findOne({ userId: req.userId, endTime: null });
    }

    const distractionRecord = {
      site: site.trim().toLowerCase(),
      url: url || site,
      timestamp: new Date(),
      action
    };

    if (session) {
      session.distractions.push(distractionRecord);
      session.distractionCount = (session.distractionCount || 0) + 1;
      await session.save();

      if (session.taskId) {
        await Task.findByIdAndUpdate(session.taskId, {
          $inc: { distractionCount: 1 }
        });
      }
    }

    res.json({
      message: 'Distraction attempt intercepted.',
      distraction: distractionRecord,
      warning: `Stay focused! Wavering from your task will break your focus streak.`,
      activeSessionId: session?._id || null,
      taskTitle: session?.taskTitle || 'Current Focus Goal'
    });
  } catch (error) {
    console.error('Log distraction error:', error);
    res.status(500).json({ error: 'Failed to record distraction attempt.' });
  }
});

// GET /api/sessions/distractions/recent - List recent intercepted distractions
router.get('/distractions/recent', async (req, res) => {
  try {
    const sessions = await FocusSession.find({
      userId: req.userId,
      'distractions.0': { $exists: true }
    })
      .sort('-startTime')
      .limit(10)
      .select('taskTitle distractions distractionCount startTime');

    const allDistractions = [];
    sessions.forEach(s => {
      s.distractions.forEach(d => {
        allDistractions.push({
          ...d.toObject(),
          sessionId: s._id,
          taskTitle: s.taskTitle || 'General Focus'
        });
      });
    });

    allDistractions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ distractions: allDistractions.slice(0, 20) });
  } catch (error) {
    console.error('Fetch recent distractions error:', error);
    res.status(500).json({ error: 'Failed to fetch distractions.' });
  }
});

// GET /api/sessions/active - Get active session
router.get('/active', async (req, res) => {
  try {
    const session = await FocusSession.findOne({
      userId: req.userId,
      endTime: null
    }).populate('taskId', 'title category');

    res.json({ session: session || null });
  } catch (error) {
    console.error('Active session error:', error);
    res.status(500).json({ error: 'Failed to fetch active session.' });
  }
});

// GET /api/sessions - List sessions with date filtering
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, type, limit = 50 } = req.query;

    const filter = { userId: req.userId, endTime: { $ne: null } };

    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }
    if (type) filter.type = type;

    const sessions = await FocusSession.find(filter)
      .sort('-startTime')
      .limit(Math.min(Number(limit), 200))
      .populate('taskId', 'title category');

    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions.' });
  }
});

// GET /api/sessions/stats - Session statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '24h': startDate.setDate(startDate.getDate() - 1); break;
      case '7d': startDate.setDate(startDate.getDate() - 7); break;
      case '30d': startDate.setDate(startDate.getDate() - 30); break;
      default: startDate.setDate(startDate.getDate() - 7);
    }

    const stats = await FocusSession.aggregate([
      {
        $match: {
          userId: req.userId,
          endTime: { $ne: null },
          type: 'work',
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          completedSessions: {
            $sum: { $cond: ['$completed', 1, 0] }
          },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    const result = stats[0] || {
      totalSessions: 0,
      totalDuration: 0,
      completedSessions: 0,
      avgDuration: 0
    };

    res.json({
      stats: {
        totalSessions: result.totalSessions,
        totalMinutes: Math.round(result.totalDuration / 60),
        completedSessions: result.completedSessions,
        completionRate: result.totalSessions > 0
          ? Math.round((result.completedSessions / result.totalSessions) * 100)
          : 0,
        avgMinutes: Math.round(result.avgDuration / 60)
      }
    });
  } catch (error) {
    console.error('Session stats error:', error);
    res.status(500).json({ error: 'Failed to fetch session stats.' });
  }
});

module.exports = router;
