import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { tasksApi, aiApi } from '../utils/api';
import { HiOutlinePlus, HiOutlineSparkles, HiOutlineTrash, HiOutlineSearch, HiOutlineFilter, HiOutlineViewGrid, HiOutlineViewList } from 'react-icons/hi';

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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('matrix'); // matrix | list
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [breakdownLoading, setBreakdownLoading] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const data = await tasksApi.list(params);
      setTasks(data.tasks);
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      addToast('Failed to update subtask', 'error');
    }
  };

  const getQuadrantTasks = (quadrant) => tasks.filter(t => t.quadrant === quadrant && t.status !== 'done');

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>📋 Tasks</h1>
        <div className="page-actions">
          <div style={{ position: 'relative' }}>
            <HiOutlineSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input"
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '200px' }}
              id="search-tasks"
            />
          </div>
          <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: '140px' }} id="filter-status">
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <button className={`btn btn-icon btn-secondary ${view === 'matrix' ? 'active' : ''}`} onClick={() => setView('matrix')} title="Matrix View" id="btn-matrix-view">
            <HiOutlineViewGrid />
          </button>
          <button className={`btn btn-icon btn-secondary ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List View" id="btn-list-view">
            <HiOutlineViewList />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)} id="btn-create-task">
            <HiOutlinePlus /> New Task
          </button>
        </div>
      </div>

      {/* Matrix View */}
      {view === 'matrix' ? (
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
      ) : (
        /* List View */
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
            addToast('Task created!', 'success');
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
          breakdownLoading={breakdownLoading}
        />
      )}
    </div>
  );
}

/* ---- Create Task Modal ---- */
function CreateTaskModal({ onClose, onCreated }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    title: '', description: '', priority: 3, urgency: 3,
    category: 'General', deadline: '', estimatedMinutes: ''
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
      const body = { ...form };
      if (!body.deadline) delete body.deadline;
      if (!body.estimatedMinutes) delete body.estimatedMinutes;
      else body.estimatedMinutes = Number(body.estimatedMinutes);
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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label>Title *</label>
              <input className="input" placeholder="What needs to be done?" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} autoFocus id="input-task-title" />
            </div>
            <div className="input-group">
              <label>Description</label>
              <textarea className="input" placeholder="Add details..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} id="input-task-desc" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Priority (Importance)</label>
                <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: Number(e.target.value) }))} id="input-task-priority">
                  <option value={1}>1 — Critical</option>
                  <option value={2}>2 — High</option>
                  <option value={3}>3 — Medium</option>
                  <option value={4}>4 — Low</option>
                </select>
              </div>
              <div className="input-group">
                <label>Urgency</label>
                <select className="input" value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: Number(e.target.value) }))} id="input-task-urgency">
                  <option value={1}>1 — Immediate</option>
                  <option value={2}>2 — Soon</option>
                  <option value={3}>3 — Normal</option>
                  <option value={4}>4 — Whenever</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Category</label>
                <input className="input" placeholder="e.g. Work, Study..." value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} id="input-task-category" />
              </div>
              <div className="input-group">
                <label>Deadline</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} id="input-task-deadline" />
              </div>
            </div>
            <div className="input-group">
              <label>Estimated Time (minutes)</label>
              <input className="input" type="number" min="1" placeholder="e.g. 30" value={form.estimatedMinutes} onChange={e => setForm(p => ({ ...p, estimatedMinutes: e.target.value }))} id="input-task-estimate" />
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
function TaskDetailModal({ task, onClose, onUpdate, onDelete, onAIBreakdown, onToggleSubtask, breakdownLoading }) {
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    urgency: task.urgency,
    category: task.category,
    status: task.status,
    deadline: task.deadline ? task.deadline.split('T')[0] : ''
  });

  const handleSave = async () => {
    try {
      const body = { ...form };
      if (!body.deadline) body.deadline = null;
      const data = await tasksApi.update(task._id, body);
      onUpdate(data.task);
      setEditing(false);
      addToast('Task updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update task', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
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
                <label>Deadline</label>
                <input className="input" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
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

            {task.deadline && (
              <div className="text-sm">
                <span className="text-secondary">Deadline: </span>
                <span className={new Date(task.deadline) < new Date() && task.status !== 'done' ? 'text-danger' : ''}>
                  {new Date(task.deadline).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            )}

            {task.estimatedMinutes && (
              <div className="text-sm text-secondary">
                Estimated: {task.estimatedMinutes}m | Actual: {task.actualMinutes || 0}m
              </div>
            )}

            {/* Subtasks */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h4 style={{ fontSize: '0.9rem' }}>Subtasks</h4>
                {task.subtasks.length === 0 && (
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

              {task.subtasks.length > 0 ? (
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
                  No subtasks yet. Use AI Breakdown to automatically split this task.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
