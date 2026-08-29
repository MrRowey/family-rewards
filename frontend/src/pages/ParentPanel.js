import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import ParentChildren from '../components/parent/ParentChildren';
import ParentTemplates from '../components/parent/ParentTemplates';
import ParentRewards from '../components/parent/ParentRewards';
import ParentApprovals from '../components/parent/ParentApprovals';
import ParentStats from '../components/parent/ParentStats';
import ParentQRCodes from '../components/parent/ParentQRCodes';

const TABS = [
  { id: 'children',  label: '👨‍👧 Children',  roles: ['admin'] },
  { id: 'tasks',     label: '📋 Tasks',      roles: ['admin'] },
  { id: 'rewards',   label: '🎁 Rewards',    roles: ['admin'] },
  { id: 'approvals', label: '✅ Approvals',  roles: ['admin', 'approval'] },
  { id: 'stats',     label: '📊 Stats',      roles: ['admin'] },
  { id: 'qrcodes',   label: '🔑 QR Codes',   roles: ['admin'] },
];

export default function ParentPanel() {
  const { parentSession, logoutParentFn } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState('children');
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!parentSession) { navigate('/'); return; }
    const tick = () => {
      const secs = Math.max(0, Math.round((parentSession.expiresAt - Date.now()) / 1000));
      setTimeLeft(secs);
      if (secs === 0) { logoutParentFn(); navigate('/'); }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [parentSession, navigate, logoutParentFn]);

  if (!parentSession) return null;

  const availableTabs = TABS.filter(t => t.roles.includes(parentSession.role));
  const activeTab = availableTabs.find(t => t.id === tab) ? tab : availableTabs[0]?.id;

  const handleLogout = () => { logoutParentFn(); navigate('/'); };

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <nav style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarTitle}>
            <span style={styles.sidebarIcon}>🔓</span>
            <div>
              <div style={styles.sidebarTitleText}>Parent Mode</div>
              <div style={styles.sidebarRole}>{parentSession.role === 'admin' ? '👑 Admin' : '✅ Approver'}</div>
            </div>
          </div>

          <div style={styles.timer}>
            ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>

        <div style={styles.tabs}>
          {availableTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                ...styles.tabBtn,
                background: activeTab === t.id ? 'rgba(255,215,0,0.15)' : 'transparent',
                color: activeTab === t.id ? '#FFD700' : 'rgba(255,255,255,0.6)',
                borderLeft: activeTab === t.id ? '3px solid #FFD700' : '3px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={styles.sidebarBottom}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← Dashboard</button>
          <button style={styles.logoutBtn} onClick={handleLogout}>🔒 Lock</button>
        </div>
      </nav>

      {/* Content */}
      <main style={styles.content}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ height: '100%' }}
        >
          {activeTab === 'children'  && <ParentChildren />}
          {activeTab === 'tasks'     && <ParentTemplates />}
          {activeTab === 'rewards'   && <ParentRewards />}
          {activeTab === 'approvals' && <ParentApprovals />}
          {activeTab === 'stats'     && <ParentStats />}
          {activeTab === 'qrcodes'   && <ParentQRCodes />}
        </motion.div>
      </main>
    </div>
  );
}

const styles = {
  root: {
    width: '100vw', height: '100vh', display: 'flex',
    background: '#0f0e17', overflow: 'hidden',
  },
  sidebar: {
    width: 220, flexShrink: 0,
    background: 'rgba(255,255,255,0.03)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', flexDirection: 'column',
  },
  sidebarTop: { padding: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  sidebarTitle: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  sidebarIcon: { fontSize: 28 },
  sidebarTitleText: { fontWeight: 900, fontSize: 15, color: '#fff', fontFamily: 'Fredoka One, cursive' },
  sidebarRole: { fontSize: 12, color: '#FFD700', fontWeight: 700 },
  timer: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 700 },
  tabs: { flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  tabBtn: {
    padding: '12px 20px', textAlign: 'left',
    border: 'none', borderLeft: '3px solid transparent',
    fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', transition: 'all 0.2s',
  },
  sidebarBottom: { padding: 16, display: 'flex', flexDirection: 'column', gap: 8 },
  backBtn: {
    padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 13,
    fontFamily: 'Nunito, sans-serif',
  },
  logoutBtn: {
    padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
    background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)',
    color: '#f87171', fontWeight: 700, fontSize: 13,
    fontFamily: 'Nunito, sans-serif',
  },
  content: { flex: 1, overflow: 'hidden', padding: 24 },
};
