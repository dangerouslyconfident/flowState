import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="sidebar" id="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">F</div>
        <span className="sidebar-brand">FlowState</span>
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
