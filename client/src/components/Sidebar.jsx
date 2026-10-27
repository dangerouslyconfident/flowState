import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFlowState } from '../context/FlowStateContext';
import { HiOutlineViewGrid, HiOutlineClipboardList, HiOutlineClock, HiOutlineChartBar, HiOutlineCog, HiOutlineLogout } from 'react-icons/hi';

const navItems = [
  { path: '/', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { path: '/tasks', icon: HiOutlineClipboardList, label: 'Tasks' },
  { path: '/focus', icon: HiOutlineClock, label: 'Focus' },
  { path: '/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
  { path: '/settings', icon: HiOutlineCog, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isDistracted, brandName, toggleDistraction } = useFlowState();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className={`sidebar ${isDistracted ? 'sidebar-distracted' : 'sidebar-in-flow'}`} id="sidebar">
      <div 
        className={`sidebar-header ${isDistracted ? 'header-distracted' : 'header-in-flow'}`}
        onClick={toggleDistraction}
        title={`Click to test state toggle: currently ${brandName}`}
        style={{ cursor: 'pointer' }}
      >
        <div className={`sidebar-logo ${isDistracted ? 'logo-distracted' : 'logo-in-flow'}`}>
          {isDistracted ? '!' : '⚡'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className={`sidebar-brand ${isDistracted ? 'brand-distracted' : 'brand-in-flow'}`}>
            {brandName}
          </span>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 600, 
            letterSpacing: '0.04em',
            color: isDistracted ? '#f43f5e' : 'var(--accent-secondary)',
            textTransform: 'uppercase'
          }}>
            {isDistracted ? '⚠️ Distraction Intercepted' : '● Deep Focus Active'}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            id={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/settings')}>
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-email">{user?.email || ''}</div>
          </div>
        </div>
        <button
          className="nav-link"
          onClick={handleLogout}
          style={{ width: '100%', marginTop: '8px' }}
          id="btn-logout"
        >
          <HiOutlineLogout className="nav-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
