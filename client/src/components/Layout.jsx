import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { useFlowState } from '../context/FlowStateContext';
import { HiOutlineShieldCheck, HiOutlineSparkles, HiOutlineExclamationCircle, HiOutlineLightningBolt } from 'react-icons/hi';

export default function Layout() {
  const navigate = useNavigate();
  const { isDistracted, brandName, distractionReason, refocus, toggleDistraction } = useFlowState();

  return (
    <div className={`app-layout ${isDistracted ? 'layout-distracted' : 'layout-in-flow'}`}>
      <Sidebar />
      <main className="main-content fade-in">
        {/* Dynamic !inFlowState Alert Banner */}
        {isDistracted && (
          <div className="distraction-alert-banner fade-in">
            <div className="banner-content">
              <HiOutlineExclamationCircle className="banner-icon-pulse" />
              <div>
                <strong>!inFlowState — Wavering Intercepted!</strong>
                <span className="banner-subtext">
                  {distractionReason || 'You stepped away from your deep focus session.'}
                </span>
              </div>
            </div>
            <button className="btn btn-warning-refocus btn-sm" onClick={refocus}>
              <HiOutlineLightningBolt />
              <span>Return to inFlowState</span>
            </button>
          </div>
        )}

        <header className="app-topbar">
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Dynamic Status Indicator Pill */}
            <div 
              className={`flow-indicator-pill ${isDistracted ? 'pill-distracted' : 'pill-in-flow'}`}
              onClick={toggleDistraction}
              title={`Status: ${brandName}. Click to toggle flow / distraction state`}
              style={{ cursor: 'pointer' }}
            >
              <span className={`flow-pulse-dot ${isDistracted ? 'dot-distracted' : 'dot-in-flow'}`} />
              <span className="flow-pill-title">{brandName}</span>
              {isDistracted && (
                <span className="flow-pill-action" onClick={(e) => { e.stopPropagation(); refocus(); }}>
                  Refocus
                </span>
              )}
            </div>

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

