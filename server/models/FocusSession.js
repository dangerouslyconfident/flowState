const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  plannedDuration: {
    type: Number, // in seconds
    required: true
  },
  type: {
    type: String,
    enum: ['work', 'short-break', 'long-break'],
    default: 'work'
  },
  completed: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  }
}, {
  timestamps: true
});

// Compute duration on end
focusSessionSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Indexes
focusSessionSchema.index({ userId: 1, startTime: -1 });
focusSessionSchema.index({ userId: 1, type: 1 });
focusSessionSchema.index({ userId: 1, taskId: 1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
