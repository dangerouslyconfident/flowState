import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { tasksApi, aiApi } from '../utils/api';
import { 
  HiOutlinePlus, 
  HiOutlineSparkles, 
  HiOutlineTrash, 
  HiOutlineSearch, 
  HiOutlineViewGrid, 
  HiOutlineViewList,
  HiOutlineClock,
  HiOutlineCalendar,
  HiOutlineLightningBolt,
  HiOutlineBell,
  HiOutlineRefresh,
  HiOutlineCheckCircle
} from 'react-icons/hi';

const QUADRANT_CONFIG = {
  do: { title: '🔥 Do First', subtitle: 'Urgent & Important', className: 'quadrant-do' },
  schedule: { title: '📅 Schedule', subtitle: 'Important, Not Urgent', className: 'quadrant-schedule' },
  delegate: { title: '⚡ Delegate', subtitle: 'Urgent, Not Important', className: 'quadrant-delegate' },
  eliminate: { title: '🗑️ Eliminate', subtitle: 'Neither', className: 'quadrant-eliminate' },
};

const PRIORITY_LABELS = { 1: 'Critical', 2: 'High', 3: 'Medium', 4: 'Low' };
const URGENCY_LABELS = { 1: 'Immediate', 2: 'Soon', 3: 'Normal', 4: 'Whenever' };

export default function Tasks() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('matrix'); // 'matrix' | 'list' | 'quota'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(null);
  const [quotaSummary, setQuotaSummary] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const [data, quotaData] = await Promise.all([
        tasksApi.list(params),
        tasksApi.getTodayQuotas().catch(() => null)
      ]);
      setTasks(data.tasks);
      if (quotaData) setQuotaSummary(quotaData);
    } catch {
      addToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, addToast]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await tasksApi.update(task._id, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus, completedAt: newStatus === 'done' ? new Date().toISOString() : null } : t));
      addToast(newStatus === 'done' ? 'Task completed! 🎉' : 'Task reopened', 'success');
    } catch {
      addToast('Failed to update task', 'error');
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      setShowDetailModal(null);
      addToast('Task deleted', 'success');
    } catch {
      addToast('Failed to delete task', 'error');
    }
  };

  const handleAIBreakdown = async (taskId) => {
    setBreakdownLoading(taskId);
    try {
      const data = await aiApi.breakdown(taskId);
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
      if (showDetailModal?._id === taskId) setShowDetailModal(data.task);
      addToast(`Task broken into ${data.subtasks.length} subtasks ✨`, 'success');
    } catch (err) {
      addToast(err.message || 'AI breakdown failed', 'error');
    } finally {
      setBreakdownLoading(null);
    }
  };

  const handleToggleSubtask = async (taskId, subId, done) => {
    try {
      const data = await tasksApi.toggleSubtask(taskId, subId, { done: !done });
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
      if (showDetailModal?._id === taskId) setShowDetailModal(data.task);
    } catch {
      addToast('Failed to update subtask', 'error');
    }
  };

  const handleLogQuota = async (taskId, minutes = 25) => {
    try {
      const data = await tasksApi.logQuota(taskId, minutes);
      setTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
      if (showDetailModal?._id === taskId) setShowDetailModal(data.task);
      const updatedQuota = await tasksApi.getTodayQuotas().catch(() => null);
      if (updatedQuota) setQuotaSummary(updatedQuota);
      addToast(`Logged ${minutes}m focus to task quota! ⚡`, 'success');
    } catch {
      addToast('Failed to log quota', 'error');
    }
  };

  const getQuadrantTasks = (quadrant) => {
    return tasks.filter(t => {
      if (t.quadrant !== quadrant) return false;
      if (filterStatus === 'done') return t.status === 'done';
      if (filterStatus === 'all' || filterStatus === '') return t.status !== 'done';
      return t.status === filterStatus;
    });
  };

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>📋 Task Management</h1>
          <p className="text-secondary text-sm" style={{ marginTop: '4px' }}>
            Organize priorities, configure daily focus quotas, and schedule completion times
          </p>
        </div>

        <div className="page-actions">
          <div style={{ position: 'relative' }}>
            <HiOutlineSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '180px' }}
              id="search-tasks"
            />
          </div>

          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '130px' }} id="filter-status">
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>

          {/* View Mode Selectors */}
          <button 
            className={`btn btn-sm ${view === 'matrix' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setView('matrix')} 
            title="Eisenhower Matrix View" 
            id="btn-matrix-view"
          >
            <HiOutlineViewGrid /> Matrix
          </button>
          <button 
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setView('list')} 
            title="List View" 
            id="btn-list-view"
          >
            <HiOutlineViewList /> List
          </button>
          <button 
            className={`btn btn-sm ${view === 'quota' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setView('quota')} 
            title="Daily Quota & Time Allocation Planner" 
            id="btn-quota-view"
          >
            <HiOutlineClock /> Daily Quota
          </button>

          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="btn-create-task">
            <HiOutlinePlus /> New Task
          </button>
        </div>
      </div>

      {/* 1. Daily Quota Planner View */}
      {view === 'quota' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Quota Summary Stats */}
          <div className="stats-grid">
            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
                <HiOutlineClock />
              </div>
              <div className="stat-value">
                {quotaSummary?.totalQuotaAllocated || 0}
                <span className="text-sm text-secondary">m</span>
              </div>
              <div className="stat-label">Total Daily Quota Allocated</div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }}>
                <HiOutlineCheckCircle />
              </div>
              <div className="stat-value">
                {quotaSummary?.totalMinutesCompleted || 0}
                <span className="text-sm text-secondary">m</span>
              </div>
              <div className="stat-label">Focus Logged Today</div>
            </div>

            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}>
                <HiOutlineLightningBolt />
              </div>
              <div className="stat-value">
                {quotaSummary?.complianceRate || 0}%
              </div>
              <div className="stat-label">Today's Quota Adherence</div>
            </div>
          </div>

          {/* Quota Task Cards */}
          <div className="glass-card-static">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem' }}>⏱️ Daily Focus Quotas & Time Allocations</h3>
                <p className="text-secondary text-sm">Tasks with daily time budgets scheduled for today</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadTasks}>
                <HiOutlineRefresh /> Refresh
              </button>
            </div>

            {(!quotaSummary?.quotas || quotaSummary.quotas.length === 0) ? (
              <div className="empty-state">
                <div className="empty-icon">⏱️</div>
                <div className="empty-title">No daily quotas set yet</div>
                <div className="empty-desc">When creating or editing a task, allocate a daily focus quota (e.g., 45 mins/day)</div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  <HiOutlinePlus /> Create Quota Task
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-md)' }}>
                {quotaSummary.quotas.map(item => (
                  <div key={item._id} className="task-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</div>
                        <span className="task-tag" style={{ marginTop: '4px' }}>{item.category}</span>
                      </div>
                      <span className="badge badge-neutral">{PRIORITY_LABELS[item.priority]}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="quota-progress-container">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span className="text-secondary">Today's Progress</span>
                        <span style={{ fontWeight: 700, color: item.percent >= 100 ? 'var(--success)' : 'var(--accent-primary)' }}>
                          {item.minutesLoggedToday} / {item.dailyQuotaMinutes}m ({item.percent}%)
                        </span>
                      </div>
                      <div className="quota-bar-wrapper">
                        <div 
                          className={`quota-bar-fill ${item.percent >= 100 ? 'quota-bar-complete' : ''}`}
                          style={{ width: `${Math.min(100, item.percent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Focus Slot Info */}
                    {item.focusSlots && item.focusSlots.length > 0 && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HiOutlineCalendar style={{ color: 'var(--accent-primary)' }} />
                        <span>Scheduled Slot: {item.focusSlots[0].startTime} - {item.focusSlots[0].endTime}</span>
                      </div>
                    )}

                    {item.targetCompletionTime && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <HiOutlineClock style={{ color: 'var(--warning)' }} />
                        <span>Target Completion: {item.targetCompletionTime}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/focus?taskId=${item._id}`)}
                        style={{ flex: 1 }}
                      >
                        <HiOutlineLightningBolt /> Start Focus
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleLogQuota(item._id, 25)}
                        title="Quick Log 25m Focus"
                      >
                        +25m
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Matrix View */}
      {view === 'matrix' && (
        <div className="matrix-grid">
          {Object.entries(QUADRANT_CONFIG).map(([key, config]) => {
            const qTasks = getQuadrantTasks(key);
            return (
              <div key={key} className={`matrix-quadrant glass-card-static ${config.className}`}>
                <div className="quadrant-header">
                  <div>
                    <div className="quadrant-title">{config.title}</div>
                    <div className="text-xs text-secondary">{config.subtitle}</div>
                  </div>
                  <span className="quadrant-count">{qTasks.length}</span>
                </div>
                <div className="quadrant-tasks">
                  {qTasks.length === 0 ? (
                    <div className="quadrant-empty">No tasks here</div>
                  ) : (
                    qTasks.map(task => (
                      <div key={task._id} className="task-card" onClick={() => setShowDetailModal(task)}>
                        <div className="task-title">
                          <div
                            className={`task-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(task); }}
                          >
                            {task.status === 'done' && '✓'}
                          </div>
                          <span>{task.title}</span>
                        </div>
                        <div className="task-meta">
                          <span className="task-tag">{task.category}</span>
                          {task.dailyQuotaMinutes > 0 && (
                            <span className="quota-stat-pill" title="Daily Focus Quota">
                              ⚡ {task.todayFocusMinutes || 0}/{task.dailyQuotaMinutes}m
                            </span>
                          )}
                          {task.targetCompletionTime && (
                            <span className="text-xs text-secondary" title="Target completion time">
                              ⏰ {task.targetCompletionTime}
                            </span>
                          )}
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
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. List View */}
      {view === 'list' && (
        <div className="glass-card-static">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No tasks yet</div>
              <div className="empty-desc">Create your first task to get organized</div>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <HiOutlinePlus /> Create Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {tasks.map(task => (
                <div key={task._id} className={`task-card ${task.status === 'done' ? 'completed' : ''}`} onClick={() => setShowDetailModal(task)}>
                  <div className="task-title">
                    <div
                      className={`task-checkbox ${task.status === 'done' ? 'checked' : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(task); }}
                    >
                      {task.status === 'done' && '✓'}
                    </div>
                    <span>{task.title}</span>
                  </div>
                  <div className="task-meta">
                    <span className={`priority-dot priority-${task.priority}`} />
                    <span>{PRIORITY_LABELS[task.priority]}</span>
                    <span className="task-tag">{task.category}</span>
                    <span className="badge badge-neutral">{task.quadrant}</span>
                    {task.dailyQuotaMinutes > 0 && (
                      <span className="quota-stat-pill">
                        ⚡ {task.todayFocusMinutes || 0}/{task.dailyQuotaMinutes}m
                      </span>
                    )}
                    {task.targetCompletionTime && (
                      <span className="text-xs text-secondary">
                        ⏰ {task.targetCompletionTime}
                      </span>
                    )}
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
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(task) => {
            setTasks(prev => [task, ...prev]);
            setShowCreateModal(false);
            addToast('Task created successfully! ⚡', 'success');
          }}
        />
      )}

      {/* Task Detail Modal */}
      {showDetailModal && (
        <TaskDetailModal
          task={showDetailModal}
          onClose={() => setShowDetailModal(null)}
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t._id === updatedTask._id ? updatedTask : t));
            setShowDetailModal(updatedTask);
          }}
          onDelete={handleDelete}
          onAIBreakdown={handleAIBreakdown}
          onToggleSubtask={handleToggleSubtask}
          onLogQuota={handleLogQuota}
          breakdownLoading={breakdownLoading}
        />
      )}
    </div>
  );
}

/* ---- Versatile Create Task Modal ---- */
function CreateTaskModal({ onClose, onCreated }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 3,
    urgency: 3,
    category: 'Work',
    deadline: '',
    targetCompletionTime: '',
    dailyQuotaMinutes: 45,
    slotStart: '09:30',
    slotEnd: '10:30',
    reminderLeadTime: 15,
    recurringFrequency: 'none',
    estimatedMinutes: 60
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      addToast('Task title is required', 'warning');
      return;
    }
    setLoading(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: Number(form.priority),
        urgency: Number(form.urgency),
        category: form.category.trim() || 'General',
        deadline: form.deadline || null,
        targetCompletionTime: form.targetCompletionTime || '',
        dailyQuotaMinutes: Number(form.dailyQuotaMinutes) || 0,
        focusSlots: form.dailyQuotaMinutes > 0 ? [{
          startTime: form.slotStart,
          endTime: form.slotEnd,
          dayOfWeek: 'all'
        }] : [],
        reminderLeadTime: Number(form.reminderLeadTime) || 15,
        recurring: {
          enabled: form.recurringFrequency !== 'none',
          frequency: form.recurringFrequency
        },
        estimatedMinutes: form.estimatedMinutes ? Number(form.estimatedMinutes) : null
      };

      const data = await tasksApi.create(body);
      onCreated(data.task);
    } catch (err) {
      addToast(err.message || 'Failed to create task', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2>Create Versatile Task</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Title & Description */}
            <div className="input-group">
              <label>Task Title *</label>
              <input 
                className="input" 
                placeholder="What objective do you want to accomplish?" 
                value={form.title} 
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
                autoFocus 
                id="input-task-title" 
              />
            </div>

            <div className="input-group">
              <label>Description & Context</label>
              <textarea 
                className="input" 
                placeholder="Key outcomes, reference links, deliverables..." 
                value={form.description} 
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} 
                id="input-task-desc"
                style={{ minHeight: '70px' }}
              />
            </div>

            {/* Priority & Urgency */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Priority (Impact)</label>
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} id="input-task-priority">
                  <option value={1}>1 — Critical Impact</option>
                  <option value={2}>2 — High Impact</option>
                  <option value={3}>3 — Medium Impact</option>
                  <option value={4}>4 — Low Impact</option>
                </select>
              </div>

              <div className="input-group">
                <label>Urgency</label>
                <select className="input" value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: Number(e.target.value) }))} id="input-task-urgency">
                  <option value={1}>1 — Immediate Action</option>
                  <option value={2}>2 — Soon</option>
                  <option value={3}>3 — Normal</option>
                  <option value={4}>4 — Whenever</option>
                </select>
              </div>
            </div>

            {/* Category & Deadlines */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Category</label>
                <input className="input" placeholder="e.g. Work, Study, Health" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} id="input-task-category" />
              </div>

              <div className="input-group">
                <label>Due Date (Deadline)</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} id="input-task-deadline" />
              </div>
            </div>

            {/* Target Completion Time & Reminder Alarm */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Target Completion Time</label>
                <input 
                  className="input" 
                  type="time" 
                  value={form.targetCompletionTime} 
                  onChange={e => setForm(p => ({ ...p, targetCompletionTime: e.target.value }))} 
                  id="input-task-target-time" 
                />
              </div>

              <div className="input-group">
                <label>Reminder Notification</label>
                <select className="input" value={form.reminderLeadTime} onChange={e => setForm(p => ({ ...p, reminderLeadTime: Number(e.target.value) }))} id="input-task-reminder">
                  <option value={0}>At due time</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
            </div>

            {/* Daily Time Quota Section (Core Requirement) */}
            <div style={{ background: 'rgba(99, 102, 241, 0.07)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#818CF8' }}>
                  ⚡ Daily Focus Quota Allocation
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {form.dailyQuotaMinutes} minutes / day
                </span>
              </div>
              <p className="text-secondary text-xs" style={{ marginBottom: '12px' }}>
                Allocate dedicated daily focus sprints to protect your time and build consistent velocity.
              </p>

              {/* Quick Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[0, 15, 30, 45, 60, 90, 120].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    className={`btn btn-sm ${form.dailyQuotaMinutes === mins ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(p => ({ ...p, dailyQuotaMinutes: mins }))}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    {mins === 0 ? 'No Quota' : `${mins}m`}
                  </button>
                ))}
              </div>

              {/* Focus Slot Window */}
              {form.dailyQuotaMinutes > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: '10px' }}>
                  <div className="input-group">
                    <label style={{ fontSize: '0.78rem' }}>Preferred Focus Slot Start</label>
                    <input className="input" type="time" value={form.slotStart} onChange={e => setForm(p => ({ ...p, slotStart: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label style={{ fontSize: '0.78rem' }}>Focus Slot End</label>
                    <input className="input" type="time" value={form.slotEnd} onChange={e => setForm(p => ({ ...p, slotEnd: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>

            {/* Recurring Quota Schedule */}
            <div className="input-group">
              <label>Recurring Quota Rule</label>
              <select className="input" value={form.recurringFrequency} onChange={e => setForm(p => ({ ...p, recurringFrequency: e.target.value }))}>
                <option value="none">One-off Task</option>
                <option value="daily">Daily Habit (Resets quota every morning)</option>
                <option value="weekdays">Weekdays Only (Mon - Fri)</option>
                <option value="weekly">Weekly Goal</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="btn-submit-task">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---- Task Detail Modal ---- */
function TaskDetailModal({ task, onClose, onUpdate, onDelete, onAIBreakdown, onToggleSubtask, onLogQuota, breakdownLoading }) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    urgency: task.urgency,
    category: task.category,
    status: task.status,
    deadline: task.deadline ? task.deadline.split('T')[0] : '',
    targetCompletionTime: task.targetCompletionTime || '',
    dailyQuotaMinutes: task.dailyQuotaMinutes || 0
  });

  const handleSave = async () => {
    try {
      const body = { ...form };
      if (!body.deadline) body.deadline = null;
      body.dailyQuotaMinutes = Number(body.dailyQuotaMinutes) || 0;
      const data = await tasksApi.update(task._id, body);
      onUpdate(data.task);
      setEditing(false);
      addToast('Task updated successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update task', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>{editing ? 'Edit Task' : 'Task Details'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!editing && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)} id="btn-edit-task">Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => onDelete(task._id)} id="btn-delete-task">
                  <HiOutlineTrash />
                </button>
              </>
            )}
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          </div>
        </div>

        {editing ? (
          <div className="modal-body">
            <div className="input-group">
              <label>Title</label>
              <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea className="input" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Priority</label>
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))}>
                  {[1,2,3,4].map(v => <option key={v} value={v}>{PRIORITY_LABELS[v]}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Urgency</label>
                <select className="input" value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: Number(e.target.value) }))}>
                  {[1,2,3,4].map(v => <option key={v} value={v}>{URGENCY_LABELS[v]}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Category</label>
                <input className="input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Due Date</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Target Completion Time</label>
                <input className="input" type="time" value={form.targetCompletionTime} onChange={e => setForm(p => ({ ...p, targetCompletionTime: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Daily Quota (Minutes)</label>
                <input className="input" type="number" min="0" value={form.dailyQuotaMinutes} onChange={e => setForm(p => ({ ...p, dailyQuotaMinutes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer" style={{ border: 'none', marginTop: 'var(--space-sm)' }}>
              <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div>
              <h3 style={{ marginBottom: 'var(--space-sm)' }}>{task.title}</h3>
              {task.description && <p className="text-secondary text-sm">{task.description}</p>}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
              <span className={`badge ${task.status === 'done' ? 'badge-success' : task.status === 'in-progress' ? 'badge-info' : 'badge-neutral'}`}>
                {task.status}
              </span>
              <span className="badge badge-neutral">{PRIORITY_LABELS[task.priority]} priority</span>
              <span className="badge badge-neutral">{URGENCY_LABELS[task.urgency]}</span>
              <span className="task-tag">{task.category}</span>
            </div>

            {/* Daily Quota Progress Card */}
            {task.dailyQuotaMinutes > 0 && (
              <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  <span>⚡ Today's Focus Quota</span>
                  <span>{task.todayFocusMinutes || 0} / {task.dailyQuotaMinutes}m</span>
                </div>
                <div className="quota-bar-wrapper">
                  <div 
                    className="quota-bar-fill" 
                    style={{ width: `${Math.min(100, Math.round(((task.todayFocusMinutes || 0) / task.dailyQuotaMinutes) * 100))}%` }} 
                  />
                </div>
              </div>
            )}

            {/* Deadlines and Targets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem' }}>
              {task.deadline && (
                <div>
                  <span className="text-secondary">Due: </span>
                  <span className={new Date(task.deadline) < new Date() && task.status !== 'done' ? 'text-danger' : ''}>
                    📅 {new Date(task.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}
              {task.targetCompletionTime && (
                <div>
                  <span className="text-secondary">Target Time: </span>
                  <span>⏰ {task.targetCompletionTime}</span>
                </div>
              )}
              {task.distractionCount > 0 && (
                <div>
                  <span className="text-secondary">Distractions Thwarted: </span>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>🛡️ {task.distractionCount}</span>
                </div>
              )}
            </div>

            {/* Direct Focus Launcher */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  navigate(`/focus?taskId=${task._id}`);
                }}
                style={{ flex: 1 }}
              >
                <HiOutlineLightningBolt /> Launch Focus Block
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => onLogQuota(task._id, 25)}
              >
                +25m Focus
              </button>
            </div>

            {/* Subtasks */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '0.9rem' }}>Subtasks</h4>
                {(!task.subtasks || task.subtasks.length === 0) && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onAIBreakdown(task._id)}
                    disabled={breakdownLoading === task._id}
                    id="btn-ai-breakdown"
                  >
                    <HiOutlineSparkles />
                    {breakdownLoading === task._id ? 'Breaking down...' : 'AI Breakdown'}
                  </button>
                )}
              </div>

              {task.subtasks?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {task.subtasks.map(sub => (
                    <div
                      key={sub._id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                        padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
                        opacity: sub.done ? 0.5 : 1
                      }}
                      onClick={() => onToggleSubtask(task._id, sub._id, sub.done)}
                    >
                      <div className={`task-checkbox ${sub.done ? 'checked' : ''}`} style={{ width: '16px', height: '16px', fontSize: '0.6rem' }}>
                        {sub.done && '✓'}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.85rem', textDecoration: sub.done ? 'line-through' : 'none' }}>
                        {sub.title}
                      </span>
                      {sub.estimatedMinutes && (
                        <span className="text-xs text-secondary">{sub.estimatedMinutes}m</span>
                      )}
                    </div>
                  ))}
                  <div className="text-xs text-secondary" style={{ marginTop: 'var(--space-xs)' }}>
                    {task.subtasks.filter(s => s.done).length}/{task.subtasks.length} completed
                  </div>
                </div>
              ) : (
                <p className="text-sm text-secondary" style={{ fontStyle: 'italic' }}>
                  No subtasks yet. Click AI Breakdown to generate an actionable execution plan.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
