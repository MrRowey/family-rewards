import React from 'react';
import { motion } from 'framer-motion';

export default function CelebrationOverlay({ child, onClose }) {
  if (!child) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.overlay}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        style={{ ...styles.card, borderColor: child.color }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: 3, duration: 0.5 }}
          style={{ fontSize: 80 }}
        >
          {child.avatar}
        </motion.div>

        <h1 style={{ ...styles.name, color: child.color }}>{child.name}</h1>
        <h2 style={styles.title}>All Done! 🎉</h2>
        <p style={styles.subtitle}>Amazing work! All tasks completed!</p>

        <div style={styles.starsRow}>
          {['⭐','🌟','✨','🌟','⭐'].map((s, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -10, 0] }}
              transition={{ delay: i * 0.1, repeat: Infinity, duration: 1 }}
              style={{ fontSize: 28 }}
            >
              {s}
            </motion.span>
          ))}
        </div>

        <p style={styles.tap}>Tap anywhere to continue</p>
      </motion.div>
    </motion.div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 900,
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '3px solid',
    borderRadius: 28, padding: '40px 48px',
    textAlign: 'center', maxWidth: 420,
  },
  name: { fontSize: 36, fontFamily: 'Fredoka One, cursive', margin: '12px 0 4px' },
  title: { fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 18, color: 'rgba(255,255,255,0.7)' },
  starsRow: { display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0' },
  tap: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 12 },
};
