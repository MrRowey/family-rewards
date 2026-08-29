// ── StreakBadge.js ──────────────────────────────────────────────────────────
import React from 'react';

export default function StreakBadge({ streak }) {
  if (!streak) return null;
  const flame = streak >= 7 ? '🔥🔥' : streak >= 3 ? '🔥' : '✨';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: streak >= 3 ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.1)',
      border: `1px solid ${streak >= 3 ? 'rgba(255,140,0,0.4)' : 'rgba(255,255,255,0.15)'}`,
      borderRadius: 8, padding: '2px 8px',
      fontSize: 12, fontWeight: 800, color: streak >= 3 ? '#FFA500' : 'rgba(255,255,255,0.6)',
    }}>
      {flame} {streak} day{streak !== 1 ? 's' : ''}
    </span>
  );
}
