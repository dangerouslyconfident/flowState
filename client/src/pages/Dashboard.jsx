import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { analyticsApi, tasksApi, aiApi } from '../utils/api';
import { HiOutlineCheckCircle, HiOutlineClock, HiOutlineFire, HiOutlineExclamation, HiOutlineLightningBolt, HiOutlineSparkles } from 'react-icons/hi';

export default function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [streak, setStreak] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [overviewData, streakData, tasksData] = await Promise.all([
        analyticsApi.overview(),
        analyticsApi.streak(),
        tasksApi.list({ status: 'todo', sort: '-priority', limit: 5 })
      ]);
      setOverview(overviewData.overview);
      setStreak(streakData.streak);
      setRecentTasks(tasksData.tasks);
    } catch (err) {
      addToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestNext = async () => {
    setSuggestLoading(true);
    try {
      const data = await aiApi.suggestNext();
      setSuggestion(data.suggestion);
    } catch (err) {
      addToast(err.message || 'AI suggestion failed', 'error');
    } finally {
      setSuggestLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  const stats = overview?.tasks || {};
  const focus = overview?.focus || {};

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>{getGreeting()}, <span className="text-gradient">{user?.name?.split(' ')[0]}</span></h1>
          <p className="text-secondary text-sm" style={{ marginTop: '4px' }}>
            Here's your productivity snapshot for today
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/tasks')} id="btn-new-task-dash">
          + New Task
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card glass-card" id="stat-completed">
          <div className="stat-icon" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--success)' }}>
            <HiOutlineCheckCircle />
          </div>
          <div className="stat-value">{stats.todayCompleted || 0}</div>
          <div className="stat-label">Completed Today</div>
        </div>

        <div className="stat-card glass-card" id="stat-focus">
          <div className="stat-icon" style={{ background: 'rgba(108, 99, 255, 0.15)', color: 'var(--accent-primary)' }}>
            <HiOutlineClock />
          </div>
          <div className="stat-value">{focus.todayMinutes || 0}<span className="text-sm text-secondary">m</span></div>
          <div className="stat-label">Focus Time Today</div>
        </div>

        <div className="stat-card glass-card" id="stat-streak">
          <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--warning)' }}>
            <HiOutlineFire />
          </div>
          <div className="stat-value">{streak?.current || 0}</div>
          <div className="stat-label">Day Streak</div>
        </div>

        <div className="stat-card glass-card" id="stat-pending">
          <div className="stat-icon" style={{ background: 'rgba(248, 113, 113, 0.15)', color: 'var(--danger)' }}>
            <HiOutlineExclamation />
          </div>
          <div className="stat-value">{stats.overdue || 0}</div>
          <div className="stat-label">Overdue Tasks</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        {/* Pending Tasks */}
        <div className="glass-card-static" id="pending-tasks-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineLightningBolt style={{ color: 'var(--accent-primary)' }} />
              Up Next
            </h3>
            <span className="badge badge-neutral">{stats.todo || 0} pending</span>
          </div>
          
          {recentTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <div className="empty-icon">🎯</div>
              <div className="empty-title">All clear!</div>
              <div className="empty-desc">No pending tasks. Create one to get started.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {recentTasks.map(task => (
                <div key={task._id} className="task-card" onClick={() => navigate('/tasks')}>
                  <div className="task-title">
                    <div className={`priority-dot priority-${task.priority}`} />
                    <span>{task.title}</span>
                  </div>
                  <div className="task-meta">
                    <span className="task-tag">{task.category}</span>
                    {task.deadline && (
                      <span className={`task-deadline${new Date(task.deadline) < new Date() ? ' overdue' : ''}`}>
                        📅 {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                    {task.subtasks?.length > 0 && (
                      <span className="task-subtask-count">
                        ✓ {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Suggestion */}
        <div className="glass-card-static" id="ai-suggestion-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineSparkles style={{ color: 'var(--accent-secondary)' }} />
              AI Suggestion
            </h3>
          </div>

          {suggestion ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="insight-card">
                <span className="insight-icon">🎯</span>
                <div className="insight-content">
                  <div className="insight-title">Work on: {suggestion.task?.title}</div>
                  <div className="insight-desc">{suggestion.reason}</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/focus')} id="btn-start-suggested">
                Start Focus Session →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-lg) 0' }}>
              <p className="text-secondary text-sm" style={{ textAlign: 'center' }}>
                Let AI analyze your tasks and suggest what to work on next
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSuggestNext}
                disabled={suggestLoading}
                id="btn-ai-suggest"
              >
                {suggestLoading ? 'Analyzing...' : '✨ What should I do next?'}
              </button>
            </div>
          )}

          {/* Quick Stats */}
          <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--glass-border)' }}>
            <div className="text-xs text-secondary" style={{ marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekly Progress
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
              <span className="text-sm">{focus.weekMinutes || 0}m focused this week</span>
              <span className="text-sm text-secondary">{stats.completionRate || 0}% done</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${Math.min(stats.completionRate || 0, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
