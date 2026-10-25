import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi';

export default function Layout() {
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content fade-in">
        <header className="app-topbar">
          <div className="topbar-left">
            <span 
              className="guardian-badge-pill" 
              onClick={() => navigate('/settings')}
              style={{ cursor: 'pointer' }}
              title="Focus Guardian Blacklist Shield is Active"
            >
              <HiOutlineShieldCheck style={{ fontSize: '15px' }} />
              <span>Guardian Shield Active</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/focus')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <HiOutlineSparkles style={{ color: 'var(--accent-primary)' }} />
              <span>Enter Focus Room</span>
            </button>
            <NotificationCenter />
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
