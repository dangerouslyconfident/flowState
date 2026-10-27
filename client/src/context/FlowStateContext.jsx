import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { playSound, sendBrowserNotification } from '../utils/notifications';

const FlowStateContext = createContext(null);

export function FlowStateProvider({ children }) {
  const [isDistracted, setIsDistracted] = useState(false);
  const [distractionReason, setDistractionReason] = useState('');
  const [distractionCount, setDistractionCount] = useState(0);

  // Synchronize document attribute and title
  useEffect(() => {
    if (isDistracted) {
      document.documentElement.setAttribute('data-flow-state', 'distracted');
      document.title = '⚠️ !inFlowState — Wavering Intercepted!';
    } else {
      document.documentElement.setAttribute('data-flow-state', 'flow');
      document.title = '⚡ inFlowState — Productivity & Focus Guardian';
    }
  }, [isDistracted]);

  // Listen to window custom events from Focus timer or Extension
  useEffect(() => {
    const handleDistractionEvent = (e) => {
      const reason = e?.detail?.reason || e?.detail?.site || 'Wavering from focus sprint';
      triggerDistraction(reason);
    };

    const handleRefocusEvent = () => {
      refocus();
    };

    window.addEventListener('flowstate:distraction', handleDistractionEvent);
    window.addEventListener('flowstate:refocus', handleRefocusEvent);

    return () => {
      window.removeEventListener('flowstate:distraction', handleDistractionEvent);
      window.removeEventListener('flowstate:refocus', handleRefocusEvent);
    };
  }, []);

  const triggerDistraction = useCallback((reason = 'Wavering from focus goal') => {
    setIsDistracted(true);
    setDistractionReason(reason);
    setDistractionCount(prev => prev + 1);
    try {
      playSound('warning');
    } catch {}
    sendBrowserNotification('⚠️ !inFlowState Alert!', {
      body: `Distraction intercepted: ${reason}. Stay focused on your active sprint!`
    });
  }, []);

  const refocus = useCallback(() => {
    setIsDistracted(false);
    setDistractionReason('');
    try {
      playSound('chime');
    } catch {}
  }, []);

  const toggleDistraction = useCallback(() => {
    if (isDistracted) {
      refocus();
    } else {
      triggerDistraction('Manual Focus Test Bench Simulation');
    }
  }, [isDistracted, refocus, triggerDistraction]);

  const brandName = isDistracted ? '!inFlowState' : 'inFlowState';

  return (
    <FlowStateContext.Provider
      value={{
        isDistracted,
        brandName,
        distractionReason,
        distractionCount,
        triggerDistraction,
        refocus,
        toggleDistraction
      }}
    >
      {children}
    </FlowStateContext.Provider>
  );
}

export function useFlowState() {
  const ctx = useContext(FlowStateContext);
  if (!ctx) {
    throw new Error('useFlowState must be used within FlowStateProvider');
  }
  return ctx;
}
