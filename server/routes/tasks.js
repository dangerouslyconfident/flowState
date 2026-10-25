const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(auth);

// GET /api/tasks - List tasks with filtering
router.get('/', async (req, res) => {
  try {
    const { status, quadrant, category, search, sort = '-createdAt', limit = 100 } = req.query;

    const filter = { userId: req.userId };

    if (status) filter.status = status;
    if (quadrant) filter.quadrant = quadrant;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const tasks = await Task.find(filter)
      .sort(sort)
      .limit(Math.min(Number(limit), 200));

    res.json({ tasks, count: tasks.length });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
});

// GET /api/tasks/quotas/today - Get today's daily focus quotas summary
router.get('/quotas/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await Task.find({
      userId: req.userId,
      status: { $ne: 'done' },
      dailyQuotaMinutes: { $gt: 0 }
    }).sort('-priority');

    let totalQuotaAllocated = 0;
    let totalMinutesCompleted = 0;

    const quotaList = tasks.map(task => {
      const todayEntry = task.dailyQuotaHistory?.find(h => h.date === today);
      const minutesLoggedToday = todayEntry ? todayEntry.minutesLogged : (task.todayFocusMinutes || 0);
      totalQuotaAllocated += task.dailyQuotaMinutes || 0;
      totalMinutesCompleted += minutesLoggedToday;

      return {
        _id: task._id,
        title: task.title,
        priority: task.priority,
        category: task.category,
        dailyQuotaMinutes: task.dailyQuotaMinutes,
        focusSlots: task.focusSlots || [],
        targetCompletionTime: task.targetCompletionTime,
        minutesLoggedToday,
        percent: task.dailyQuotaMinutes > 0 
          ? Math.min(100, Math.round((minutesLoggedToday / task.dailyQuotaMinutes) * 100))
          : 0,
        status: task.status
      };
    });

    res.json({
      today,
      totalQuotaAllocated,
      totalMinutesCompleted,
      complianceRate: totalQuotaAllocated > 0 
        ? Math.round((totalMinutesCompleted / totalQuotaAllocated) * 100) 
        : 100,
      quotas: quotaList
    });
  } catch (error) {
    console.error('Get daily quotas error:', error);
    res.status(500).json({ error: 'Failed to fetch daily quota progress.' });
  }
});

// GET /api/tasks/reminders/pending - Get tasks requiring active notifications
router.get('/reminders/pending', async (req, res) => {
  try {
    const now = new Date();
    const tasks = await Task.find({
      userId: req.userId,
      status: { $ne: 'done' }
    });

    const pendingReminders = [];
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    tasks.forEach(task => {
      // 1. Check Deadline Reminders
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const diffMinutes = Math.round((deadlineDate.getTime() - now.getTime()) / (1000 * 60));
        const lead = task.reminderLeadTime || 15;

        if (diffMinutes >= 0 && diffMinutes <= lead) {
          pendingReminders.push({
            taskId: task._id,
            title: task.title,
            type: 'deadline_approaching',
            message: `Task "${task.title}" is due in ${diffMinutes} minutes!`,
            urgency: 'high',
            dueAt: task.deadline
          });
        } else if (diffMinutes < 0 && Math.abs(diffMinutes) <= 120) {
          pendingReminders.push({
            taskId: task._id,
            title: task.title,
            type: 'overdue',
            message: `Task "${task.title}" is overdue! Please complete or reschedule.`,
            urgency: 'critical',
            dueAt: task.deadline
          });
        }
      }

      // 2. Check Daily Focus Slots
      if (task.focusSlots && task.focusSlots.length > 0) {
        task.focusSlots.forEach(slot => {
          if (slot.startTime === currentTimeStr) {
            pendingReminders.push({
              taskId: task._id,
              title: task.title,
              type: 'focus_slot_start',
              message: `Your scheduled focus slot for "${task.title}" is starting now (${slot.startTime} - ${slot.endTime})!`,
              urgency: 'medium',
              slot
            });
          }
        });
      }

      // 3. Check Daily Quota reminder if quota is unmet and past mid-day
      if (task.dailyQuotaMinutes > 0 && now.getHours() >= 14) {
        const today = now.toISOString().split('T')[0];
        const todayEntry = task.dailyQuotaHistory?.find(h => h.date === today);
        const logged = todayEntry ? todayEntry.minutesLogged : (task.todayFocusMinutes || 0);
        if (logged < task.dailyQuotaMinutes) {
          const remaining = task.dailyQuotaMinutes - logged;
          pendingReminders.push({
            taskId: task._id,
            title: task.title,
            type: 'daily_quota_unmet',
            message: `You have ${remaining} min remaining on today's focus quota for "${task.title}".`,
            urgency: 'low',
            remainingMinutes: remaining
          });
        }
      }
    });

    res.json({ reminders: pendingReminders, count: pendingReminders.length });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reminders.' });
  }
});

// POST /api/tasks - Create task
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority, 
      urgency, 
      category, 
      tags, 
      deadline, 
      estimatedMinutes, 
      subtasks,
      dailyQuotaMinutes,
      focusSlots,
      targetCompletionTime,
      reminderLeadTime,
      recurring
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const task = new Task({
      userId: req.userId,
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 3,
      urgency: urgency || 3,
      category: category?.trim() || 'General',
      tags: tags || [],
      deadline: deadline || null,
      estimatedMinutes: estimatedMinutes || null,
      subtasks: subtasks || [],
      dailyQuotaMinutes: Number(dailyQuotaMinutes) || 0,
      focusSlots: Array.isArray(focusSlots) ? focusSlots : [],
      targetCompletionTime: targetCompletionTime || '',
      reminderLeadTime: Number(reminderLeadTime) || 15,
      recurring: recurring || { enabled: false, frequency: 'none' }
    });

    await task.save();
    res.status(201).json({ message: 'Task created.', task });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = [
      'title', 
      'description', 
      'priority', 
      'urgency', 
      'category', 
      'tags', 
      'status', 
      'deadline', 
      'estimatedMinutes', 
      'actualMinutes', 
      'subtasks',
      'dailyQuotaMinutes',
      'focusSlots',
      'targetCompletionTime',
      'reminderLeadTime',
      'recurring',
      'todayFocusMinutes'
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    Object.assign(task, updates);
    await task.save();

    res.json({ message: 'Task updated.', task });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// POST /api/tasks/:id/log-quota - Log focus minutes to daily quota
router.post('/:id/log-quota', async (req, res) => {
  try {
    const { minutes } = req.body;
    const addMins = Math.max(1, Number(minutes) || 0);

    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (!task.dailyQuotaHistory) task.dailyQuotaHistory = [];

    const existingEntry = task.dailyQuotaHistory.find(h => h.date === today);
    if (existingEntry) {
      existingEntry.minutesLogged += addMins;
      existingEntry.quotaTarget = task.dailyQuotaMinutes;
    } else {
      task.dailyQuotaHistory.push({
        date: today,
        minutesLogged: addMins,
        quotaTarget: task.dailyQuotaMinutes
      });
    }

    task.todayFocusMinutes = (task.todayFocusMinutes || 0) + addMins;
    task.actualMinutes = (task.actualMinutes || 0) + addMins;

    await task.save();
    res.json({ message: 'Focus quota logged.', task });
  } catch (error) {
    console.error('Log quota error:', error);
    res.status(500).json({ error: 'Failed to log quota.' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    res.json({ message: 'Task deleted.' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// PUT /api/tasks/:id/subtasks/:subId - Toggle subtask
router.put('/:id/subtasks/:subId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const subtask = task.subtasks.id(req.params.subId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found.' });
    }

    subtask.done = req.body.done !== undefined ? req.body.done : !subtask.done;
    if (req.body.title) subtask.title = req.body.title;

    await task.save();
    res.json({ message: 'Subtask updated.', task });
  } catch (error) {
    console.error('Update subtask error:', error);
    res.status(500).json({ error: 'Failed to update subtask.' });
  }
});

// POST /api/tasks/:id/subtasks - Add subtask
router.post('/:id/subtasks', async (req, res) => {
  try {
    const { title, estimatedMinutes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Subtask title is required.' });
    }

    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    task.subtasks.push({ title: title.trim(), estimatedMinutes: estimatedMinutes || null, done: false });
    await task.save();

    res.status(201).json({ message: 'Subtask added.', task });
  } catch (error) {
    console.error('Add subtask error:', error);
    res.status(500).json({ error: 'Failed to add subtask.' });
  }
});

// DELETE /api/tasks/:id/subtasks/:subId - Remove subtask
router.delete('/:id/subtasks/:subId', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    task.subtasks = task.subtasks.filter(st => st._id.toString() !== req.params.subId);
    await task.save();

    res.json({ message: 'Subtask removed.', task });
  } catch (error) {
    console.error('Remove subtask error:', error);
    res.status(500).json({ error: 'Failed to remove subtask.' });
  }
});

module.exports = router;
