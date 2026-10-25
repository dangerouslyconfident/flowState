const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  settings: {
    pomoDuration: { type: Number, default: 25 },    // minutes
    shortBreak: { type: Number, default: 5 },       // minutes
    longBreak: { type: Number, default: 15 },       // minutes
    longBreakInterval: { type: Number, default: 4 }, // sessions before long break
    dailyGoalMinutes: { type: Number, default: 120 },
    dailyFocusQuota: { type: Number, default: 180 }, // total minutes per day
    theme: { type: String, default: 'dark', enum: ['dark', 'light'] },
    notificationsEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    reminderLeadMinutes: { type: Number, default: 15 },
    distractionMode: { type: String, default: 'warning', enum: ['warning', 'strict', 'zen'] },
    distractionAlertMessage: { 
      type: String, 
      default: 'Stay on task! Wavering is not an option when greatness is being built.' 
    },
    blacklistedSites: {
      type: [String],
      default: [
        'youtube.com',
        'reddit.com',
        'twitter.com',
        'x.com',
        'instagram.com',
        'facebook.com',
        'tiktok.com',
        'netflix.com',
        'twitch.tv',
        'discord.com'
      ]
    }
  }
}, {
  timestamps: true
});

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
