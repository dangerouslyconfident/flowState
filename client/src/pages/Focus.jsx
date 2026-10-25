import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { sessionsApi, tasksApi } from '../utils/api';
import { 
  HiOutlinePlay, 
  HiOutlinePause, 
  HiOutlineRefresh, 
  HiOutlineCheck,
  HiOutlineBell,
  HiOutlineSparkles,
  HiOutlineClipboardList
} from 'react-icons/hi';

// Pleasant chime synthesizer using Web Audio API
function playChime(type = 'complete') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'complete') {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.6);
      });
    } else {
      // Gentle tick / start sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch (err) {
    console.warn('Audio chime unsupported:', err);
  }
}

export default function Focus() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();

  const pomoDuration = (user?.settings?.pomoDuration || 25) * 60;
  const shortBreakDuration = (user?.settings?.shortBreakDuration || 5) * 60;
  const longBreakDuration = (user?.settings?.longBreakDuration || 15) * 60;

  const [mode, setMode] = useState('work'); // 'work' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(pomoDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState({ totalSessions: 0, totalMinutes: 0 });
  const [completedCount, setCompletedCount] = useState(0);

  const timerRef = useRef(null);

  // Parse taskId from query if navigated with ?taskId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryTaskId = params.get('taskId');
    if (queryTaskId) {
      setSelectedTaskId(queryTaskId);
    }
  }, [location.search]);

  // Load pending tasks and recent stats
  useEffect(() => {
    async function loadData() {
      try {
        const [taskList, statsData] = await Promise.all([
          tasksApi.list({ status: 'todo' }),
          sessionsApi.stats('today').catch(() => ({ totalSessions: 0, totalMinutes: 0 }))
        ]);
        setTasks(taskList.tasks || []);
        if (statsData) {
          setSessionStats({
            totalSessions: statsData.totalSessions || 0,
            totalMinutes: statsData.totalMinutes || 0
          });
        }
      } catch (err) {
        console.error('Error fetching tasks or stats:', err);
      }
    }
    loadData();
  }, []);

  // Update total duration when mode changes
  const getTotalDuration = useCallback((m) => {
    if (m === 'work') return pomoDuration;
    if (m === 'shortBreak') return shortBreakDuration;
    return longBreakDuration;
  }, [pomoDuration, shortBreakDuration, longBreakDuration]);

  // Switch modes
  const handleModeSwitch = (newMode) => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setMode(newMode);
    setTimeLeft(getTotalDuration(newMode));
  };

  // Start timer & session
  const startTimer = async () => {
    playChime('tick');
    setIsRunning(true);

    if (!currentSessionId && mode === 'work') {
      try {
        const res = await sessionsApi.start({
          taskId: selectedTaskId || undefined,
          type: 'work',
          plannedDuration: pomoDuration
        });
        const sessId = res?.session?._id || res?._id;
        if (sessId) {
          setCurrentSessionId(sessId);
        }
      } catch (err) {
        console.warn('Could not record session start:', err);
      }
    }
  };

  // Pause timer
  const pauseTimer = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setTimeLeft(getTotalDuration(mode));
  };

  // End / complete session
  const completeSession = useCallback(async () => {
    playChime('complete');
    setIsRunning(false);
    clearInterval(timerRef.current);

    const isWork = mode === 'work';
    addToast(
      isWork 
        ? '🎉 Focus session finished! Great job. Time for a well-deserved break.'
        : '⚡ Break over! Ready to get back into the flow?',
      'success'
    );

    if (currentSessionId) {
      try {
        await sessionsApi.end(currentSessionId, {
          completed: true,
          notes: sessionNotes,
          actualMinutes: Math.round(getTotalDuration(mode) / 60)
        });
      } catch (err) {
        console.error('Failed to update session:', err);
      }
      setCurrentSessionId(null);
      setSessionNotes('');
    }

    if (isWork) {
      const nextCount = completedCount + 1;
      setCompletedCount(nextCount);
      setSessionStats(prev => ({
        totalSessions: prev.totalSessions + 1,
        totalMinutes: prev.totalMinutes + Math.round(pomoDuration / 60)
      }));

      // If finished 4 cycles, recommend long break
      if (nextCount % 4 === 0) {
        handleModeSwitch('longBreak');
      } else {
        handleModeSwitch('shortBreak');
      }
    } else {
      handleModeSwitch('work');
    }
  }, [mode, currentSessionId, sessionNotes, completedCount, getTotalDuration, pomoDuration, addToast]);

  // Main countdown tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, completeSession]);

  // Format time mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Circle progress calculation (circumference: 2 * pi * 130 ~ 816.8)
  const totalDuration = getTotalDuration(mode);
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDuration > 0 ? (totalDuration - timeLeft) / totalDuration : 0;
  const strokeDashoffset = circumference - (circumference * progressRatio);

  const selectedTask = tasks.find(t => t._id === selectedTaskId);

  return (
    <div className="focus-container">
      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '8px', background: 'var(--glass-bg)', padding: '6px', borderRadius: 'var(--radius-full)', border: '1px solid var(--glass-border)' }}>
        <button
          className={`btn btn-sm ${mode === 'work' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px' }}
          onClick={() => handleModeSwitch('work')}
        >
          ⚡ Focus ({Math.round(pomoDuration / 60)}m)
        </button>
        <button
          className={`btn btn-sm ${mode === 'shortBreak' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px' }}
          onClick={() => handleModeSwitch('shortBreak')}
        >
          ☕ Short Break ({Math.round(shortBreakDuration / 60)}m)
        </button>
        <button
          className={`btn btn-sm ${mode === 'longBreak' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px' }}
          onClick={() => handleModeSwitch('longBreak')}
        >
          🌿 Long Break ({Math.round(longBreakDuration / 60)}m)
        </button>
      </div>

      {/* SVG Circular Timer */}
      <div className="timer-circle">
        <svg viewBox="0 0 280 280">
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6C63FF" />
              <stop offset="100%" stopColor="#00D4FF" />
            </linearGradient>
          </defs>
          <circle
            className="timer-track"
            cx="140"
            cy="140"
            r={radius}
          />
          <circle
            className="timer-progress"
            cx="140"
            cy="140"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: strokeDashoffset
            }}
          />
        </svg>

        <div className="timer-display">
          <div className="timer-time">{formatTime(timeLeft)}</div>
          <div className="timer-label">
            {mode === 'work' ? 'Deep Work' : mode === 'shortBreak' ? 'Rest & Recharge' : 'Extended Pause'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="timer-controls">
        <button 
          className="btn btn-secondary btn-timer"
          onClick={resetTimer}
          title="Reset timer"
        >
          <HiOutlineRefresh />
        </button>

        {isRunning ? (
          <button 
            className="btn btn-primary btn-timer"
            onClick={pauseTimer}
            title="Pause"
          >
            <HiOutlinePause />
          </button>
        ) : (
          <button 
            className="btn btn-primary btn-timer"
            onClick={startTimer}
            title="Start"
          >
            <HiOutlinePlay style={{ marginLeft: '4px' }} />
          </button>
        )}

        <button 
          className="btn btn-secondary btn-timer"
          onClick={completeSession}
          title="Finish / Skip"
        >
          <HiOutlineCheck />
        </button>
      </div>

      {/* Linked Task Selector */}
      <div className="timer-task-link glass" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="linked-task-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HiOutlineClipboardList /> Linked Task:
          </span>
          {selectedTask && (
            <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
              {selectedTask.category || 'General'}
            </span>
          )}
        </div>

        <select
          className="input"
          style={{ padding: '8px 12px', fontSize: '0.9rem' }}
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
        >
          <option value="">-- No specific task (General Focus) --</option>
          {tasks.map((task) => (
            <option key={task._id} value={task._id}>
              {task.title} {task.deadline ? `(Due ${new Date(task.deadline).toLocaleDateString()})` : ''}
            </option>
          ))}
        </select>

        {/* Quick session reflection note */}
        {isRunning && (
          <div style={{ marginTop: '12px' }}>
            <input
              type="text"
              className="input"
              placeholder="Session notes (e.g. Completed section 2)..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
            />
          </div>
        )}
      </div>

      {/* Today's Focus Stats */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)', marginTop: 'var(--space-sm)' }}>
        <div className="glass" style={{ padding: '12px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
            {sessionStats.totalSessions}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Sessions Completed
          </div>
        </div>

        <div className="glass" style={{ padding: '12px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {sessionStats.totalMinutes}m
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Focused Today
          </div>
        </div>

        <div className="glass" style={{ padding: '12px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>
            {completedCount % 4}/4
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Cycle Progress
          </div>
        </div>
      </div>
    </div>
  );
}
