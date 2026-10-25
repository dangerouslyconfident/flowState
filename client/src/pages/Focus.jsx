import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { sessionsApi, tasksApi } from '../utils/api';
import { 
  playSound, 
  sendBrowserNotification, 
  flashDocumentTitle, 
  setAmbientSound 
} from '../utils/notifications';
import { 
  HiOutlinePlay, 
  HiOutlinePause, 
  HiOutlineRefresh, 
  HiOutlineCheck,
  HiOutlineShieldCheck,
  HiOutlineExclamation,
  HiOutlineClipboardList,
  HiOutlineVolumeUp,
  HiOutlineSparkles
} from 'react-icons/hi';

export default function Focus() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();

  const pomoDuration = (user?.settings?.pomoDuration || 25) * 60;
  const shortBreakDuration = (user?.settings?.shortBreak || 5) * 60;
  const longBreakDuration = (user?.settings?.longBreak || 15) * 60;

  const [mode, setMode] = useState('work'); // 'work' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(pomoDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionStats, setSessionStats] = useState({ totalSessions: 0, totalMinutes: 0 });
  const [completedCount, setCompletedCount] = useState(0);
  const [ambientMode, setAmbientMode] = useState('none'); // 'none' | 'rain' | 'whitenoise' | 'zen_drone'
  const [distractionCount, setDistractionCount] = useState(0);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [simulatedDistractionSite, setSimulatedDistractionSite] = useState('');

  const timerRef = useRef(null);

  // Parse taskId from query if navigated with ?taskId=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryTaskId = params.get('taskId');
    if (queryTaskId) {
      setSelectedTaskId(queryTaskId);
    }
  }, [location.search]);

  // Load pending tasks, recent stats, and rehydrate any active session
  useEffect(() => {
    async function loadData() {
      try {
        const [taskList, statsData, activeData] = await Promise.all([
          tasksApi.list({ status: 'pending' }),
          sessionsApi.stats('today').catch(() => null),
          sessionsApi.getActive().catch(() => null)
        ]);
        setTasks(taskList.tasks || []);
        if (statsData) {
          const totalSessions = statsData?.stats?.totalSessions ?? statsData?.totalSessions ?? 0;
          const totalMinutes = statsData?.stats?.totalMinutes ?? statsData?.totalMinutes ?? 0;
          setSessionStats({ totalSessions, totalMinutes });
        }

        // Rehydrate active session if still within planned duration
        if (activeData?.session && !activeData.session.endTime && activeData.session.type === 'work') {
          const sess = activeData.session;
          const elapsed = Math.floor((Date.now() - new Date(sess.startTime).getTime()) / 1000);
          const remaining = (sess.plannedDuration || pomoDuration) - elapsed;
          if (remaining > 5) {
            setCurrentSessionId(sess._id);
            if (sess.taskId?._id || sess.taskId) {
              setSelectedTaskId(sess.taskId?._id || sess.taskId);
            }
            setTimeLeft(remaining);
          } else {
            sessionsApi.cancelActive().catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error fetching tasks or stats:', err);
      }
    }
    loadData();
  }, [pomoDuration]);

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
    // Stop extension focus if switching to break
    if (newMode !== 'work') {
      window.dispatchEvent(new CustomEvent('flowstate:focus_stop'));
    }
  };

  const selectedTask = tasks.find(t => t._id === selectedTaskId);

  // Start timer & session
  const startTimer = async () => {
    playSound('tick');
    setIsRunning(true);

    const taskTitle = selectedTask?.title || 'Deep Focus Session';

    // Broadcast event to companion Chrome extension
    window.dispatchEvent(new CustomEvent('flowstate:focus_start', {
      detail: { taskId: selectedTaskId, taskTitle }
    }));

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
    window.dispatchEvent(new CustomEvent('flowstate:focus_stop'));
  };

  // Reset timer & cancel active session
  const resetTimer = async () => {
    setIsRunning(false);
    clearInterval(timerRef.current);
    setTimeLeft(getTotalDuration(mode));
    window.dispatchEvent(new CustomEvent('flowstate:focus_stop'));

    if (currentSessionId) {
      try {
        await sessionsApi.cancelActive();
      } catch (err) {
        console.warn('Failed to cancel active session on reset:', err);
      }
      setCurrentSessionId(null);
    }
  };

  // Complete / Finish Session
  const completeSession = useCallback(async () => {
    playSound('chime');
    setIsRunning(false);
    clearInterval(timerRef.current);
    window.dispatchEvent(new CustomEvent('flowstate:focus_stop'));

    const isWork = mode === 'work';
    const durationMinutes = Math.round(getTotalDuration(mode) / 60);

    addToast(
      isWork 
        ? '🎉 Focus sprint finished! Great job. Time for a well-deserved break.'
        : '⚡ Break over! Ready to get back into the flow?',
      'success'
    );

    sendBrowserNotification(
      isWork ? '🎉 FlowState: Focus Sprint Complete!' : '⚡ FlowState: Break Finished!',
      { body: isWork ? 'Take a quick breather before your next sprint.' : 'Ready to resume focus?' }
    );

    if (currentSessionId) {
      try {
        await sessionsApi.end(currentSessionId, {
          completed: true,
          notes: sessionNotes,
          actualMinutes: durationMinutes
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
        totalMinutes: prev.totalMinutes + durationMinutes
      }));

      // Update local task quota if linked
      if (selectedTaskId) {
        setTasks(prev => prev.map(t => {
          if (t._id === selectedTaskId) {
            return {
              ...t,
              todayFocusMinutes: (t.todayFocusMinutes || 0) + durationMinutes,
              actualMinutes: (t.actualMinutes || 0) + durationMinutes
            };
          }
          return t;
        }));
      }

      if (nextCount % 4 === 0) {
        handleModeSwitch('longBreak');
      } else {
        handleModeSwitch('shortBreak');
      }
    } else {
      handleModeSwitch('work');
    }
  }, [mode, currentSessionId, sessionNotes, completedCount, getTotalDuration, addToast, selectedTaskId]);

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

  // Tab Blur / Wavering Guard
  // When user switches tabs or wavers away during active work session
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && mode === 'work') {
        flashDocumentTitle('⚠️ STAY ON TASK!', 10000);
      } else if (!document.hidden && isRunning && mode === 'work') {
        // User returned after wavering
        setDistractionCount(prev => prev + 1);
        playSound('warning');
        addToast('⚠️ Stay on task! Wavering breaks deep focus.', 'warning');
        sessionsApi.logDistraction({
          site: 'external_browser_tab',
          action: 'tab_blur',
          sessionId: currentSessionId
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, mode, currentSessionId, addToast]);

  // Ambient sound handler
  const handleAmbientChange = (type) => {
    setAmbientMode(type);
    setAmbientSound(type, 0.25);
  };

  // Test Blacklist Simulation
  const handleSimulateDistraction = (site) => {
    setSimulatedDistractionSite(site);
    setShowInterventionModal(true);
    playSound('warning');
    setDistractionCount(prev => prev + 1);
    sessionsApi.logDistraction({
      site,
      url: `https://${site}`,
      action: 'blocked',
      sessionId: currentSessionId
    }).catch(() => {});
  };

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

  return (
    <div className="focus-container">
      {/* Top Banner: Guardian Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '580px', marginBottom: '8px' }}>
        <div className={`guardian-badge-pill ${isRunning && mode === 'work' ? 'guardian-badge-active' : ''}`}>
          <HiOutlineShieldCheck style={{ fontSize: '16px' }} />
          <span>{isRunning && mode === 'work' ? 'Focus Guardian Armed & Guarding' : 'Guardian Ready'}</span>
        </div>

        {distractionCount > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HiOutlineExclamation /> {distractionCount} Wavering Warning{distractionCount > 1 ? 's' : ''} Logged
          </span>
        )}
      </div>

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

      {/* Ambient Soundscapes Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--glass-border)' }}>
        <HiOutlineVolumeUp style={{ color: 'var(--text-tertiary)' }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Soundscape:</span>
        {[
          { key: 'none', label: 'Off' },
          { key: 'rain', label: '🌧️ Rain' },
          { key: 'whitenoise', label: '🌊 Noise' },
          { key: 'zen_drone', label: '🧘 10Hz Alpha' }
        ].map(item => (
          <button
            key={item.key}
            className={`btn btn-sm ${ambientMode === item.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleAmbientChange(item.key)}
            style={{ padding: '3px 10px', fontSize: '11px', borderRadius: 'var(--radius-full)' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Linked Task Selector & Daily Quota Widget */}
      <div className="timer-task-link glass" style={{ width: '100%', maxWidth: '480px', padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span className="linked-task-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HiOutlineClipboardList /> Linked Task & Quota:
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
              {task.title} {task.dailyQuotaMinutes ? `(${task.dailyQuotaMinutes}m daily quota)` : ''}
            </option>
          ))}
        </select>

        {/* Selected Task Daily Quota Bar */}
        {selectedTask && selectedTask.dailyQuotaMinutes > 0 && (
          <div style={{ marginTop: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
              <span className="text-secondary">Today's Focus Quota:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                {selectedTask.todayFocusMinutes || 0} / {selectedTask.dailyQuotaMinutes}m
              </span>
            </div>
            <div className="quota-bar-wrapper">
              <div 
                className="quota-bar-fill" 
                style={{ width: `${Math.min(100, Math.round(((selectedTask.todayFocusMinutes || 0) / selectedTask.dailyQuotaMinutes) * 100))}%` }} 
              />
            </div>
          </div>
        )}

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

      {/* Focus Guardian Blacklist Distraction Simulator Test Bench */}
      <div className="glass" style={{ width: '100%', maxWidth: '480px', padding: '14px 18px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
            <HiOutlineShieldCheck style={{ color: 'var(--danger)' }} />
            <span>Blacklist Guardian Test Bench</span>
          </div>
          <span className="text-xs text-secondary">Evaluator Demo</span>
        </div>
        <p className="text-xs text-secondary" style={{ marginBottom: '10px' }}>
          Test the anti-wavering blacklist detector right here (or install the companion extension in <code>extension/</code>):
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['youtube.com', 'reddit.com', 'twitter.com', 'netflix.com'].map(site => (
            <button
              key={site}
              className="btn btn-sm btn-secondary"
              onClick={() => handleSimulateDistraction(site)}
              style={{ fontSize: '11px', padding: '4px 10px' }}
            >
              Test {site}
            </button>
          ))}
        </div>
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

      {/* Focus Guardian Full-Screen Anti-Wavering Intervention Modal */}
      {showInterventionModal && (
        <div className="guardian-modal-overlay" onClick={() => setShowInterventionModal(false)}>
          <div className="guardian-modal" onClick={e => e.stopPropagation()}>
            <div className="guardian-shield">🛡️</div>
            <h2 className="guardian-title">DO NOT WAVER FROM YOUR TASK</h2>
            <p className="guardian-desc">
              Focus Guardian detected an attempt to navigate to <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{simulatedDistractionSite}</span> during an active focus session.
            </p>

            <div className="guardian-task-card">
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.8px' }}>
                Current Scheduled Task
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#FFF', marginTop: '4px' }}>
                {selectedTask?.title || 'Active Deep Work Session'}
              </div>
              {selectedTask?.dailyQuotaMinutes > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Daily Quota: {selectedTask.todayFocusMinutes || 0} / {selectedTask.dailyQuotaMinutes}m
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setShowInterventionModal(false);
                  addToast('Focus resumed! Keep the streak alive! ⚡', 'success');
                }}
              >
                ⚡ Return to Focus & Resume Sprint
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowInterventionModal(false)}
              >
                Close Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
