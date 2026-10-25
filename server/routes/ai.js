const express = require('express');
const Task = require('../models/Task');
const FocusSession = require('../models/FocusSession');
const auth = require('../middleware/auth');
const { breakdownTask, generateInsights, suggestNextTask } = require('../utils/gemini');
const router = express.Router();

router.use(auth);

// POST /api/ai/breakdown - AI task breakdown
router.post('/breakdown', async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required.' });
    }

    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (task.subtasks.length > 0) {
      return res.status(400).json({ error: 'Task already has subtasks. Remove them first to regenerate.' });
    }

    const subtasks = await breakdownTask(task.title, task.description);

    // Add subtasks to the task
    task.subtasks = subtasks;
    // Set estimated time as sum of subtask estimates
    task.estimatedMinutes = subtasks.reduce((sum, st) => sum + (st.estimatedMinutes || 0), 0);
    await task.save();

    res.json({
      message: 'Task broken down successfully.',
      task,
      subtasks
    });
  } catch (error) {
    console.error('AI breakdown error:', error);
    if (error.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'AI service not configured. Set GEMINI_API_KEY.' });
    }
    res.status(500).json({ error: 'Failed to break down task. AI service may be unavailable.' });
  }
});

// POST /api/ai/suggest-next - Suggest next task
router.post('/suggest-next', async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: req.userId,
      status: { $in: ['todo', 'in-progress'] }
    }).sort({ priority: 1, urgency: 1 }).limit(10);

    if (tasks.length === 0) {
      return res.json({
        suggestion: null,
        message: 'No pending tasks found. Create some tasks first!'
      });
    }

    const suggestion = await suggestNextTask(tasks);

    res.json({ suggestion });
  } catch (error) {
    console.error('AI suggest error:', error);
    if (error.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'AI service not configured. Set GEMINI_API_KEY.' });
    }
    res.status(500).json({ error: 'Failed to generate suggestion.' });
  }
});

// POST /api/ai/insights - Generate productivity insights
router.post('/insights', async (req, res) => {
  try {
    const userId = req.userId;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Gather user data for AI analysis
    const [
      tasksCompleted,
      tasksPending,
      overdueTasks,
      focusStats,
      categories,
      totalTasks
    ] = await Promise.all([
      Task.countDocuments({ userId, status: 'done', completedAt: { $gte: weekStart } }),
      Task.countDocuments({ userId, status: { $in: ['todo', 'in-progress'] } }),
      Task.countDocuments({ userId, status: { $ne: 'done' }, deadline: { $lt: new Date(), $ne: null } }),
      FocusSession.aggregate([
        {
          $match: {
            userId,
            type: 'work',
            endTime: { $ne: null },
            startTime: { $gte: weekStart }
          }
        },
        {
          $group: {
            _id: null,
            totalMinutes: { $sum: { $divide: ['$duration', 60] } }
          }
        }
      ]),
      Task.aggregate([
        { $match: { userId, status: 'done', completedAt: { $gte: weekStart } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 }
      ]),
      Task.countDocuments({ userId })
    ]);

    const focusMinutes = Math.round(focusStats[0]?.totalMinutes || 0);
    const completionRate = totalTasks > 0 ? Math.round(((await Task.countDocuments({ userId, status: 'done' })) / totalTasks) * 100) : 0;

    // Get streak
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const taskDates = await Task.aggregate([
      { $match: { userId, status: 'done', completedAt: { $gte: sixtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } } } }
    ]);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeDates = new Set(taskDates.map(d => d._id));
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (activeDates.has(d.toISOString().split('T')[0])) streak++;
      else if (i > 0) break;
    }

    const userData = {
      tasksCompleted,
      tasksPending,
      focusMinutes,
      avgDailyFocus: Math.round(focusMinutes / 7),
      topCategory: categories[0]?._id || null,
      streak,
      completionRate,
      overdueTasks
    };

    const insights = await generateInsights(userData);

    res.json({ insights, userData });
  } catch (error) {
    console.error('AI insights error:', error);
    if (error.message?.includes('GEMINI_API_KEY')) {
      return res.status(503).json({ error: 'AI service not configured. Set GEMINI_API_KEY.' });
    }
    res.status(500).json({ error: 'Failed to generate insights.' });
  }
});

module.exports = router;
