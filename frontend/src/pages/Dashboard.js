import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useApp } from '../context/AppContext';
import ChildCard from '../components/ChildCard';
import ParentLockButton from '../components/ParentLockButton';
import QRUnlockModal from '../components/QRUnlockModal';
import CelebrationOverlay from '../components/CelebrationOverlay';

export default function Dashboard() {
  const { children, loading, parentSession, celebratingChild, setCelebratingChild } = useApp();
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) return (
    <div style={styles.loader}>
      <div style={styles.loaderEmoji}>⭐</div>
      <p style={styles.loaderText}>Loading your rewards…</p>
    </div>
  );

  return (
    <div style={styles.root}>
      {/* Confetti when a child finishes all tasks */}
      {celebratingChild && <Confetti recycle={false} numberOfPieces={300} onConfettiComplete={() => setCelebratingChild(null)} />}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>⭐ Family Rewards</span>
        </div>
        <div style={styles.headerCenter}>
          <span style={styles.time}>{timeStr}</span>
          <span style={styles.date}>{dateStr}</span>
        </div>
        <div style={styles.headerRight}>
          {parentSession ? (
            <button style={styles.parentActiveBtn} onClick={() => navigate('/parent')}>
              🔓 Parent Mode
            </button>
          ) : (
            <ParentLockButton onPress={() => setShowQR(true)} />
          )}
        </div>
      </header>

      {/* Children grid */}
      <main style={{
        ...styles.grid,
        gridTemplateColumns: `repeat(${Math.min(children.length, 4)}, 1fr)`,
      }}>
        {children.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 64 }}>👨‍👩‍👧‍👦</div>
            <p>No children yet! Unlock Parent Mode to get started.</p>
          </div>
        ) : (
          children.map(child => (
            <ChildCard key={child.id} child={child} />
          ))
        )}
      </main>

      {/* QR unlock modal */}
      <AnimatePresence>
        {showQR && <QRUnlockModal onClose={() => setShowQR(false)} />}
      </AnimatePresence>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebratingChild && (
          <CelebrationOverlay
            child={children.find(c => c.id === celebratingChild)}
            onClose={() => setCelebratingChild(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  root: {
    width: '100vw', height: '100vh',
    display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(135deg, #0f0e17 0%, #1a1a2e 50%, #16213e 100%)',
    overflow: 'hidden',
  },
  loader: {
    width: '100vw', height: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f0e17',
  },
  loaderEmoji: { fontSize: 80, animation: 'spin 2s linear infinite' },
  loaderText: { color: '#fff', fontSize: 24, marginTop: 16, fontFamily: 'Nunito, sans-serif' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    flexShrink: 0,
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  headerRight: { flex: 1, display: 'flex', justifyContent: 'flex-end' },
  logo: { fontSize: 22, fontWeight: 800, color: '#FFD700', fontFamily: 'Fredoka One, cursive' },
  time: { fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 },
  date: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  grid: {
    flex: 1, display: 'grid',
    gap: 16, padding: 16,
    overflow: 'hidden',
  },
  empty: {
    gridColumn: '1 / -1',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 16, color: 'rgba(255,255,255,0.5)', fontSize: 20,
  },
  parentActiveBtn: {
    padding: '10px 20px', borderRadius: 12,
    background: 'rgba(255,215,0,0.15)', border: '2px solid #FFD700',
    color: '#FFD700', fontWeight: 700, fontSize: 15,
    cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
  },
};
