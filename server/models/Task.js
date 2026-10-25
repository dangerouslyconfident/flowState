const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  done: { type: Boolean, default: false },
  estimatedMinutes: { type: Number, default: null }
}, { _id: true });

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
    default: 3
    // 1 = Critical, 2 = High, 3 = Medium, 4 = Low
  },
  urgency: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
    default: 3
    // 1 = Immediate, 2 = Soon, 3 = Normal, 4 = Whenever
  },
  // Eisenhower Matrix Quadrant (computed from priority + urgency)
  quadrant: {
    type: String,
    enum: ['do', 'schedule', 'delegate', 'eliminate'],
    default: 'schedule'
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo',
    index: true
  },
  deadline: {
    type: Date,
    default: null
  },
  estimatedMinutes: {
    type: Number,
    default: null,
    min: 0
  },
  actualMinutes: {
    type: Number,
    default: 0,
    min: 0
  },
  subtasks: [subtaskSchema],
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Auto-compute Eisenhower quadrant before save
taskSchema.pre('save', function(next) {
  this.quadrant = computeQuadrant(this.priority, this.urgency);
  if (this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.status !== 'done') {
    this.completedAt = null;
  }
  next();
});

function computeQuadrant(priority, urgency) {
  const isImportant = priority <= 2; // 1-2 = important
  const isUrgent = urgency <= 2;     // 1-2 = urgent

  if (isImportant && isUrgent) return 'do';        // Q1: Do First
  if (isImportant && !isUrgent) return 'schedule';  // Q2: Schedule
  if (!isImportant && isUrgent) return 'delegate';  // Q3: Delegate
  return 'eliminate';                                // Q4: Eliminate
}

// Indexes for common queries
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, quadrant: 1 });
taskSchema.index({ userId: 1, deadline: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
