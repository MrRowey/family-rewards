import React from 'react';
import { motion } from 'framer-motion';

export default function TaskItem({ task, accentColor, isLoading, onTap }) {
  const done = !!task.is_complete;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileTap={done ? {} : { scale: 0.97 }}
      onClick={onTap}
      disabled={done || isLoading}
      style={{
        ...styles.item,
        background: done
          ? `${accentColor}22`
          : 'rgba(255,255,255,0.06)',
        borderColor: done ? accentColor : 'rgba(255,255,255,0.1)',
        cursor: done ? 'default' : 'pointer',
      }}
    >
      {/* Icon */}
      <span style={styles.icon}>{task.icon || '✅'}</span>

      {/* Name */}
      <span style={{
        ...styles.name,
        color: done ? 'rgba(255,255,255,0.4)' : '#fff',
        textDecoration: done ? 'line-through' : 'none',
      }}>
        {task.name}
      </span>

      {/* Points */}
      <span style={{ ...styles.points, color: accentColor }}>
        +{task.points}⭐
      </span>

      {/* Checkbox */}
      <motion.div
        animate={{
          background: done ? accentColor : 'rgba(255,255,255,0.1)',
          scale: done ? [1, 1.3, 1] : 1,
        }}
        transition={{ duration: 0.3 }}
        style={styles.checkbox}
      >
        {done && <span style={{ fontSize: 14 }}>✓</span>}
        {isLoading && <span style={{ fontSize: 12 }}>…</span>}
      </motion.div>
    </motion.button>
  );
}

const styles = {
  item: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px',
    borderRadius: 12, border: '1.5px solid',
    width: '100%', textAlign: 'left',
    fontFamily: 'Nunito, sans-serif',
    transition: 'background 0.3s, border-color 0.3s',
  },
  icon: { fontSize: 20, flexShrink: 0 },
  name: { flex: 1, fontSize: 15, fontWeight: 700, lineHeight: 1.2 },
  points: { fontSize: 12, fontWeight: 800, flexShrink: 0 },
  checkbox: {
    width: 28, height: 28, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 900, flexShrink: 0,
  },
};
