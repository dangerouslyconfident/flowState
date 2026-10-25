import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../utils/api';
import { 
  playSound, 
  sendBrowserNotification, 
  flashDocumentTitle,
  requestNotificationPermission,
  hasNotificationPermission
} from '../utils/notifications';
import { 
  HiOutlineBell, 
  HiOutlineClock, 
  HiOutlineExclamation, 
  HiOutlineCheckCircle,
  HiOutlineLightningBolt,
  HiOutlineX
} from 'react-icons/hi';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasPermission, setHasPermission] = useState(hasNotificationPermission());
  const seenIdsRef = useRef(new Set());

  const checkReminders = useCallback(async () => {
    try {
      const data = await tasksApi.getPendingReminders();
      const reminders = data.reminders || [];

      if (reminders.length === 0) return;

      const newItems = [];
      reminders.forEach((r) => {
        const uniqueKey = `${r.taskId}_${r.type}`;
        if (!seenIdsRef.current.has(uniqueKey)) {
          seenIdsRef.current.add(uniqueKey);
          newItems.push({
            id: uniqueKey,
            taskId: r.taskId,
            title: r.title,
            message: r.message,
            urgency: r.urgency,
            type: r.type,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          // Trigger audio & web notification
          playSound(r.urgency === 'critical' ? 'warning' : 'alert');
          sendBrowserNotification(`FlowState: ${r.title}`, {
            body: r.message,
            tag: uniqueKey
          });
          flashDocumentTitle(`⚠️ ${r.title}`, 6000);
        }
      });

      if (newItems.length > 0) {
        setNotifications((prev) => [...newItems, ...prev]);
        setUnreadCount((prev) => prev + newItems.length);
      }
    } catch {
      // Backend polling error ignored
    }
  }, []);

  // Poll for upcoming task deadlines and focus windows every 25 seconds
  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 25000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const handleEnablePermissions = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (granted) {
      sendBrowserNotification('FlowState Notifications Active! ⚡', {
        body: 'You will now receive timely task due-date and focus quota alerts.'
      });
      playSound('chime');
    }
  };

  const handleStartTaskFocus = (taskId) => {
    setIsOpen(false);
    navigate(`/focus?taskId=${taskId}`);
  };

  const handleDismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        className="btn btn-icon btn-ghost"
        onClick={handleToggle}
        title="Notifications & Task Reminders"
        style={{ position: 'relative' }}
        id="btn-notification-bell"
      >
        <HiOutlineBell style={{ fontSize: '20px' }} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Glassmorphic Flyout Drawer */}
      {isOpen && (
        <div className="notif-dropdown glass-card-static fade-in" id="notif-dropdown">
          <div className="notif-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Task Alerts & Reminders</span>
              {notifications.length > 0 && (
                <span className="badge badge-primary">{notifications.length}</span>
              )}
            </div>
            {notifications.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleClearAll} style={{ fontSize: '11px' }}>
                Clear
              </button>
            )}
          </div>

          {!hasPermission && (
            <div className="notif-permission-banner">
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Enable desktop notifications for deadline alarms
              </div>
              <button 
                className="btn btn-sm btn-primary" 
                onClick={handleEnablePermissions}
                style={{ marginTop: '6px', width: '100%' }}
              >
                Enable Notifications
              </button>
            </div>
          )}

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <HiOutlineCheckCircle style={{ fontSize: '28px', color: 'var(--success)', marginBottom: '6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>All caught up!</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>No impending task deadlines</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`notif-item notif-${n.urgency}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {n.urgency === 'critical' ? (
                        <HiOutlineExclamation style={{ color: 'var(--danger)' }} />
                      ) : (
                        <HiOutlineClock style={{ color: 'var(--accent-primary)' }} />
                      )}
                      <span className="notif-item-title">{n.title}</span>
                    </div>
                    <button 
                      className="btn btn-ghost btn-icon" 
                      onClick={() => handleDismiss(n.id)}
                      style={{ padding: '2px', height: 'auto', color: 'var(--text-tertiary)' }}
                    >
                      <HiOutlineX style={{ fontSize: '14px' }} />
                    </button>
                  </div>
                  <div className="notif-item-msg">{n.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span className="notif-time">{n.time}</span>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleStartTaskFocus(n.taskId)}
                      style={{ padding: '3px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <HiOutlineLightningBolt /> Focus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
