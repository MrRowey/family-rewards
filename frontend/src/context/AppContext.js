import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getChildren, getTasks, verifySession } from '../api';

const AppContext = createContext(null);

export function AppProvider({ children: reactChildren }) {
  const [children, setChildren]       = useState([]);
  const [tasks, setTasks]             = useState([]);           // today's tasks keyed by child
  const [parentSession, setParentSession] = useState(null);     // { token, role, expiresAt }
  const [loading, setLoading]         = useState(true);
  const [celebratingChild, setCelebratingChild] = useState(null); // child id when all tasks done

  const today = () => new Date().toISOString().split('T')[0];

  /* ── restore parent session from sessionStorage ── */
  useEffect(() => {
    const token = sessionStorage.getItem('parentToken');
    if (token) {
      verifySession(token)
        .then(r => { if (r.valid) setParentSession({ token, role: r.role, expiresAt: r.expiresAt }); })
        .catch(() => sessionStorage.removeItem('parentToken'));
    }
  }, []);

  /* ── data refresh ── */
  const refresh = useCallback(async () => {
    try {
      const [kidsData, tasksData] = await Promise.all([
        getChildren(),
        getTasks({ date: today() }),
      ]);
      setChildren(kidsData);
      setTasks(tasksData);
    } catch (e) {
      console.error('refresh error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll every 30 seconds (multi-device support)
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  /* ── parent session timeout countdown ── */
  useEffect(() => {
    if (!parentSession) return;
    const ms = parentSession.expiresAt - Date.now();
    if (ms <= 0) { setParentSession(null); return; }
    const t = setTimeout(() => setParentSession(null), ms);
    return () => clearTimeout(t);
  }, [parentSession]);

  const loginParent = (sessionData) => {
    sessionStorage.setItem('parentToken', sessionData.sessionToken);
    setParentSession({ token: sessionData.sessionToken, role: sessionData.role, expiresAt: sessionData.expiresAt });
  };

  const logoutParentFn = () => {
    sessionStorage.removeItem('parentToken');
    setParentSession(null);
  };

  /* ── optimistic task completion ── */
  const markTaskComplete = (taskId, result) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_complete: 1 } : t));
    setChildren(prev => prev.map(c => {
      const tasksForChild = tasks.filter(t => t.child_id === c.id);
      const thisTask = tasksForChild.find(t => t.id === taskId);
      if (!thisTask) return c;
      const updated = { ...c, points: result.newBalance };
      // Check if all done
      const allDone = tasksForChild.every(t => t.id === taskId ? true : t.is_complete);
      if (allDone) setCelebratingChild(c.id);
      return updated;
    }));
  };

  /* ── tasks per child helper ── */
  const tasksForChild = (childId) => tasks.filter(t => t.child_id === childId);

  return (
    <AppContext.Provider value={{
      children, tasks, loading,
      parentSession, loginParent, logoutParentFn,
      celebratingChild, setCelebratingChild,
      refresh, markTaskComplete, tasksForChild,
    }}>
      {reactChildren}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
