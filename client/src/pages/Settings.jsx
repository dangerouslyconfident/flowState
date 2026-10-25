import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../utils/api';
import {
  HiOutlineUser,
  HiOutlineClock,
  HiOutlineLockClosed,
  HiOutlineSave,
  HiOutlineLogout,
  HiOutlineCheckCircle
} from 'react-icons/hi';

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useToast();

  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Timer Preferences
  const [timerSettings, setTimerSettings] = useState({
    pomoDuration: user?.settings?.pomoDuration || 25,
    shortBreak: user?.settings?.shortBreak || 5,
    longBreak: user?.settings?.longBreak || 15,
    longBreakInterval: user?.settings?.longBreakInterval || 4,
    dailyGoalMinutes: user?.settings?.dailyGoalMinutes || 120
  });
  const [timerSaving, setTimerSaving] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Save Profile Name & Preferences
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Name cannot be empty', 'warning');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await authApi.updateProfile({ name: name.trim() });
      if (res?.user) {
        updateUser(res.user);
        addToast('Profile updated successfully!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setProfileSaving(false);
    }
  };

  // Save Focus Timer Settings
  const handleSaveTimerSettings = async (e) => {
    e.preventDefault();
    try {
      setTimerSaving(true);
      const res = await authApi.updateProfile({
        settings: {
          pomoDuration: Number(timerSettings.pomoDuration),
          shortBreak: Number(timerSettings.shortBreak),
          longBreak: Number(timerSettings.longBreak),
          longBreakInterval: Number(timerSettings.longBreakInterval),
          dailyGoalMinutes: Number(timerSettings.dailyGoalMinutes)
        }
      });
      if (res?.user) {
        updateUser(res.user);
        addToast('Timer preferences saved!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to save timer settings', 'error');
    } finally {
      setTimerSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      addToast('Please enter both current and new passwords', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'warning');
      return;
    }

    try {
      setPasswordSaving(true);
      await authApi.changePassword({ currentPassword, newPassword });
      addToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '800px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>
            <span className="text-gradient">Account</span> & Settings
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Personalize your workspace, focus session timers, and account security.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        {/* Profile Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>
              <HiOutlineUser />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Personal Profile</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Manage your public display name and connected email
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>

            <div className="input-group">
              <label>Email Address (Account ID)</label>
              <input
                type="email"
                className="input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
              <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                Email cannot be modified once registered.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={profileSaving}>
                <HiOutlineSave /> {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Timer Preferences Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <HiOutlineClock />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Focus & Pomodoro Timer</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Configure intervals for deep work sprints and recovery
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveTimerSettings} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>Focus Duration (min)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  className="input"
                  value={timerSettings.pomoDuration}
                  onChange={(e) => setTimerSettings({ ...timerSettings, pomoDuration: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Short Break (min)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="input"
                  value={timerSettings.shortBreak}
                  onChange={(e) => setTimerSettings({ ...timerSettings, shortBreak: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Long Break (min)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  className="input"
                  value={timerSettings.longBreak}
                  onChange={(e) => setTimerSettings({ ...timerSettings, longBreak: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Daily Goal (min)</label>
                <input
                  type="number"
                  min="15"
                  max="720"
                  step="15"
                  className="input"
                  value={timerSettings.dailyGoalMinutes}
                  onChange={(e) => setTimerSettings({ ...timerSettings, dailyGoalMinutes: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={timerSaving}>
                <HiOutlineSave /> {timerSaving ? 'Saving...' : 'Save Timer Preferences'}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(251, 191, 36, 0.15)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <HiOutlineLockClosed />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Password & Security</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Update your account password
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="input-group">
              <label>Current Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={passwordSaving}>
                <HiOutlineLockClosed /> {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Details & Session Actions */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Active Session</div>
            <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
              Logged in as <strong>{user?.email}</strong>
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={logout}>
            <HiOutlineLogout /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
