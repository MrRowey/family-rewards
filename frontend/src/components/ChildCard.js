import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { completeTask } from '../api';
import TaskItem from './TaskItem';
import StreakBadge from './StreakBadge';

export default function ChildCard({ child }) {
  const { tasksForChild, markTaskComplete } = useApp();
  const [completingId, setCompletingId] = useState(null);
  const navigate = useNavigate();

  const tasks = tasksForChild(child.id);
  const doneTasks = tasks.filter(t => t.is_complete);
  const progress = tasks.length > 0 ? doneTasks.length / tasks.length : 0;
  const allDone = tasks.length > 0 && doneTasks.length === tasks.length;

  const handleTaskTap = async (task) => {
    if (task.is_complete || completingId) return;
    setCompletingId(task.id);
    try {
      const result = await completeTask(task.id);
      markTaskComplete(task.id, result);
    } catch (e) {
      console.error('complete task error', e);
    } finally {
      setCompletingId(null);
    }
  };

  const accentColor = child.color || '#FF6B6B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ ...styles.card, borderColor: accentColor + '40' }}
    >
      {/* Card header */}
      <div style={{ ...styles.cardHeader, background: accentColor + '20' }}>
        <div style={styles.avatarWrap}>
          <span style={{ fontSize: 36 }}>{child.avatar}</span>
          {allDone && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              style={styles.allDoneBadge}
            >✨</motion.div>
          )}
        </div>
        <div style={styles.childInfo}>
          <span style={{ ...styles.childName, color: accentColor }}>{child.name}</span>
          <StreakBadge streak={child.current_streak || 0} />
        </div>
        <div style={styles.pointsPill}>
          <span style={styles.pointsEmoji}>⭐</span>
          <span style={{ ...styles.pointsNum, color: accentColor }}>{child.points}</span>
          <span style={styles.pointsLabel}>pts</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={styles.progressWrap}>
        <div style={styles.progressBg}>
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ ...styles.progressBar, background: accentColor }}
          />
        </div>
        <span style={styles.progressLabel}>
          {doneTasks.length}/{tasks.length} tasks
        </span>
      </div>

      {/* Task list */}
      <div style={styles.taskList}>
        <AnimatePresence>
          {tasks.length === 0 ? (
            <div style={styles.noTasks}>No tasks today 🎉</div>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                accentColor={accentColor}
                isLoading={completingId === task.id}
                onTap={() => handleTaskTap(task)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Shop button */}
      <button
        style={{ ...styles.shopBtn, borderColor: accentColor, color: accentColor }}
        onClick={() => navigate(`/shop/${child.id}`)}
      >
        🛒 Rewards Shop
      </button>
    </motion.div>
  );
}

const styles = {
  card: {
    display: 'flex', flexDirection: 'column',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 20, border: '1px solid',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 14px',
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  allDoneBadge: {
    position: 'absolute', top: -6, right: -6,
    fontSize: 16, background: 'rgba(0,0,0,0.6)',
    borderRadius: '50%', width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  childInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 },
  childName: { fontSize: 22, fontWeight: 900, fontFamily: 'Fredoka One, cursive', lineHeight: 1 },
  pointsPill: {
    display: 'flex', alignItems: 'center', gap: 3,
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 12, padding: '6px 12px',
  },
  pointsEmoji: { fontSize: 14 },
  pointsNum: { fontSize: 22, fontWeight: 900, fontFamily: 'Fredoka One, cursive' },
  pointsLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 },
  progressWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '6px 14px',
  },
  progressBg: {
    flex: 1, height: 8, borderRadius: 4,
    background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 4 },
  progressLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, whiteSpace: 'nowrap' },
  taskList: {
    flex: 1, display: 'flex', flexDirection: 'column',
    gap: 6, padding: '4px 10px', overflowY: 'auto',
  },
  noTasks: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 20, fontSize: 14 },
  shopBtn: {
    margin: '8px 10px 10px',
    padding: '10px', borderRadius: 12,
    background: 'transparent', border: '2px solid',
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
    fontFamily: 'Nunito, sans-serif',
    transition: 'opacity 0.2s',
  },
};
