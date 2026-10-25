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

// POST /api/tasks - Create task
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, urgency, category, tags, deadline, estimatedMinutes, subtasks } = req.body;

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
      subtasks: subtasks || []
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
    const allowedFields = ['title', 'description', 'priority', 'urgency', 'category', 'tags', 'status', 'deadline', 'estimatedMinutes', 'actualMinutes', 'subtasks'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Use findOne + save to trigger pre-save hooks (quadrant computation)
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
