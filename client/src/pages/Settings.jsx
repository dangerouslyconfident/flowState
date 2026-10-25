import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../utils/api';
import { 
  playSound, 
  sendBrowserNotification, 
  requestNotificationPermission, 
  hasNotificationPermission 
} from '../utils/notifications';
import {
  HiOutlineUser,
  HiOutlineClock,
  HiOutlineLockClosed,
  HiOutlineSave,
  HiOutlineLogout,
  HiOutlineShieldCheck,
  HiOutlineBell,
  HiOutlinePlus,
  HiOutlineExternalLink,
  HiOutlineSparkles
} from 'react-icons/hi';

const PRESET_BLACKLIST = [
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
];

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
    dailyGoalMinutes: user?.settings?.dailyGoalMinutes || 120,
    dailyFocusQuota: user?.settings?.dailyFocusQuota || 180
  });
  const [timerSaving, setTimerSaving] = useState(false);

  // Blacklist & Guardian Settings
  const [blacklistedSites, setBlacklistedSites] = useState(
    user?.settings?.blacklistedSites || PRESET_BLACKLIST
  );
  const [newSiteInput, setNewSiteInput] = useState('');
  const [distractionMode, setDistractionMode] = useState(
    user?.settings?.distractionMode || 'warning'
  );
  const [distractionAlertMessage, setDistractionAlertMessage] = useState(
    user?.settings?.distractionAlertMessage || 'Stay on task! Wavering is not an option.'
  );
  const [guardianSaving, setGuardianSaving] = useState(false);

  // Notification Preferences
  const [hasNotifPerm, setHasNotifPerm] = useState(hasNotificationPermission());
  const [soundEnabled, setSoundEnabled] = useState(
    user?.settings?.soundEnabled !== undefined ? user?.settings?.soundEnabled : true
  );

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Save Profile
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
          dailyGoalMinutes: Number(timerSettings.dailyGoalMinutes),
          dailyFocusQuota: Number(timerSettings.dailyFocusQuota)
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

  // Blacklist domain operations
  const handleAddSite = (siteToAdd) => {
    const raw = (siteToAdd || newSiteInput).trim().toLowerCase();
    if (!raw) return;
    const clean = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    if (!clean) return;

    if (blacklistedSites.includes(clean)) {
      addToast(`${clean} is already on your blacklist`, 'info');
      setNewSiteInput('');
      return;
    }

    setBlacklistedSites(prev => [...prev, clean]);
    setNewSiteInput('');
  };

  const handleRemoveSite = (siteToRemove) => {
    setBlacklistedSites(prev => prev.filter(s => s !== siteToRemove));
  };

  // Save Guardian Settings
  const handleSaveGuardian = async () => {
    try {
      setGuardianSaving(true);
      const res = await authApi.updateProfile({
        settings: {
          blacklistedSites,
          distractionMode,
          distractionAlertMessage: distractionAlertMessage.trim(),
          soundEnabled
        }
      });
      if (res?.user) {
        updateUser(res.user);
        addToast('Focus Guardian blacklist & protection saved!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to save blacklist', 'error');
    } finally {
      setGuardianSaving(false);
    }
  };

  // Test Notification
  const handleTestNotification = async () => {
    const granted = await requestNotificationPermission();
    setHasNotifPerm(granted);
    if (!granted) {
      addToast('Browser notifications were not granted. Please check browser permissions.', 'warning');
      return;
    }
    playSound('chime');
    sendBrowserNotification('FlowState Test Alert ⚡', {
      body: 'Notifications are working! You will be alerted when tasks are due or if you waver.'
    });
    addToast('Test notification sent with sound chime!', 'success');
  };

  // Test Anti-Wavering Chime
  const handleTestWarningSound = () => {
    playSound('warning');
    addToast('Playing Focus Guardian anti-wavering alert tone 🚨', 'warning');
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
    <div className="fade-in" style={{ maxWidth: '840px' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>
            <span className="text-gradient">Settings</span> & Protection
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Configure daily focus quotas, blacklisted distraction websites, and browser notifications
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        
        {/* 1. Focus Guardian & Blacklist Configuration (Core Requirement) */}
        <div className="glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
              <HiOutlineShieldCheck />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>🛡️ Focus Guardian & Blacklist Manager</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Detect and intercept blacklisted distraction websites when focus sessions are active
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {/* Add Website Input */}
            <div className="input-group">
              <label>Add Blacklisted Domain</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. youtube.com, reddit.com, instagram.com"
                  value={newSiteInput}
                  onChange={(e) => setNewSiteInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSite())}
                />
                <button type="button" className="btn btn-secondary" onClick={() => handleAddSite()}>
                  <HiOutlinePlus /> Add
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div className="text-xs text-secondary" style={{ marginBottom: '6px' }}>Quick Add Presets:</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {PRESET_BLACKLIST.map(preset => {
                  const alreadyAdded = blacklistedSites.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      className={`btn btn-sm ${alreadyAdded ? 'btn-ghost' : 'btn-secondary'}`}
                      onClick={() => !alreadyAdded && handleAddSite(preset)}
                      disabled={alreadyAdded}
                      style={{ fontSize: '11px', padding: '3px 8px' }}
                    >
                      {alreadyAdded ? `✓ ${preset}` : `+ ${preset}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Blacklisted Chips */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Active Blacklist ({blacklistedSites.length} websites protected)
              </label>
              <div className="blacklist-chip-container">
                {blacklistedSites.map(site => (
                  <span key={site} className="blacklist-chip">
                    {site}
                    <button type="button" onClick={() => handleRemoveSite(site)} title={`Remove ${site}`}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Protection Mode */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: '8px' }}>
              <div className="input-group">
                <label>Guardian Strictness Mode</label>
                <select className="input" value={distractionMode} onChange={(e) => setDistractionMode(e.target.value)}>
                  <option value="warning">Warning Notification & Audio Alert</option>
                  <option value="strict">Strict Interception Overlay (Full Screen Block)</option>
                  <option value="zen">Zen Mode (Silent Anti-Wavering Log)</option>
                </select>
              </div>

              <div className="input-group">
                <label>Anti-Wavering Alert Message</label>
                <input
                  className="input"
                  value={distractionAlertMessage}
                  onChange={(e) => setDistractionAlertMessage(e.target.value)}
                  placeholder="Alert quote displayed upon wavering"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleTestWarningSound}>
                🚨 Test Anti-Wavering Buzzer
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={handleSaveGuardian}
                disabled={guardianSaving}
              >
                <HiOutlineSave /> {guardianSaving ? 'Saving...' : 'Save Blacklist Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Companion Browser Extension Setup Card */}
        <div className="glass-card" style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              ⚡
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>Chrome / Edge Companion Extension</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                15-second zero-build setup to detect blacklisted URLs across all browser tabs
              </p>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Open <code>chrome://extensions</code> (or <code>edge://extensions</code>) in your browser.</li>
              <li>Toggle <strong>Developer mode</strong> in the top-right corner.</li>
              <li>Click <strong>Load unpacked</strong> and select the <code>extension/</code> folder in this project:
                <code style={{ display: 'block', margin: '4px 0', padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                  C:\Users\Aakash\.gemini\antigravity-ide\scratch\flowstate\extension
                </code>
              </li>
              <li>When you focus on a task in FlowState, the extension will automatically intercept blacklisted sites!</li>
            </ol>
          </div>
        </div>

        {/* 3. Notification & Audio Preferences */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <HiOutlineBell />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Task Notifications & Audio Alarms</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Manage desktop browser push alerts and synthesized Web Audio harmonic chimes
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Desktop Web Notifications</div>
                <div className="text-secondary text-xs">
                  {hasNotifPerm ? '🟢 Browser notifications are enabled' : '⚪ Permission required for background deadline alerts'}
                </div>
              </div>
              <button 
                type="button" 
                className={`btn btn-sm ${hasNotifPerm ? 'btn-secondary' : 'btn-primary'}`} 
                onClick={handleTestNotification}
              >
                {hasNotifPerm ? '🔔 Send Test Alert' : 'Enable Notifications'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Synthesized Audio Chimes</div>
                <div className="text-secondary text-xs">
                  Self-contained Web Audio sound effects for completion and interval alarms
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => { playSound('chime'); addToast('Played harmonic chime ✨', 'info'); }}
              >
                🎵 Play Chime
              </button>
            </div>
          </div>
        </div>

        {/* 4. Timer & Focus Duration Preferences */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <HiOutlineClock />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Focus Intervals & Daily Goal</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Configure intervals for deep work sprints and recovery cycles
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
                <label>Daily Focus Goal (min)</label>
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

        {/* 5. Personal Profile */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem' }}>
              <HiOutlineUser />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Personal Profile</h2>
              <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>
                Manage your public display name and connected account
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
              <label>Email Address</label>
              <input
                type="email"
                className="input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={profileSaving}>
                <HiOutlineSave /> {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* 6. Password & Security */}
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

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-secondary btn-sm" disabled={passwordSaving}>
                <HiOutlineLockClosed /> {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* 7. Active Session Actions */}
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
