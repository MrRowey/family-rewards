import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getOverview, getChildStats } from '../../api';

export default function ParentStats() {
  const { children } = useApp();
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [childStats, setChildStats] = useState(null);

  useEffect(() => { getOverview().then(setOverview); }, []);

  useEffect(() => {
    if (selected) getChildStats(selected, 30).then(setChildStats);
    else setChildStats(null);
  }, [selected]);

  if (!overview) return <div style={s.loading}>Loading stats…</div>;

  const selChild = children.find(c => c.id === selected);

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Progress & Stats</h2>

      {/* Pending approvals alert */}
      {overview.pendingApprovals > 0 && (
        <div style={s.alert}>
          🔔 {overview.pendingApprovals} reward{overview.pendingApprovals > 1 ? 's' : ''} waiting for approval!
        </div>
      )}

      {/* Overview cards */}
      <div style={s.overviewGrid}>
        {overview.children.map(c => {
          const child = children.find(ch => ch.id === c.childId);
          const pct = c.todayTasks.total > 0 ? Math.round((c.todayTasks.done / c.todayTasks.total) * 100) : 0;
          return (
            <div
              key={c.childId}
              style={{ ...s.overCard, borderColor: (child?.color || '#FFD700') + '50', cursor: 'pointer', background: selected === c.childId ? 'rgba(255,215,0,0.07)' : 'rgba(255,255,255,0.04)' }}
              onClick={() => setSelected(s => s === c.childId ? null : c.childId)}
            >
              <span style={{ fontSize: 32 }}>{child?.avatar}</span>
              <span style={{ fontSize: 17, fontWeight: 900, color: child?.color || '#fff' }}>{c.name}</span>
              <div style={s.statRow}>
                <span style={s.statLbl}>Today</span>
                <span style={s.statVal}>{c.todayTasks.done}/{c.todayTasks.total}</span>
              </div>
              <div style={s.miniProgress}>
                <div style={{ ...s.miniBar, width: `${pct}%`, background: child?.color || '#FFD700' }} />
              </div>
              <div style={s.statRow}>
                <span style={s.statLbl}>This week</span>
                <span style={s.statVal}>⭐{c.weeklyPointsEarned}</span>
              </div>
              <div style={s.statRow}>
                <span style={s.statLbl}>Streak</span>
                <span style={s.statVal}>🔥{c.currentStreak} days</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Child detail */}
      {selected && childStats && selChild && (
        <div style={s.detailCard}>
          <h3 style={{ color: selChild.color, fontFamily: 'Fredoka One, cursive', fontSize: 20, marginBottom: 14 }}>
            {selChild.avatar} {selChild.name} — Last 30 Days
          </h3>

          {/* Point history mini chart */}
          {childStats.pointHistory.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Points Earned Per Day</div>
              <div style={s.barChart}>
                {childStats.pointHistory.slice(-14).map((day, i) => {
                  const max = Math.max(...childStats.pointHistory.map(d => d.net_points), 1);
                  const h = Math.max(4, Math.round((day.net_points / max) * 80));
                  return (
                    <div key={i} style={s.barWrap} title={`${day.day}: ${day.net_points} pts`}>
                      <div style={{ ...s.bar, height: h, background: selChild.color }} />
                      <span style={s.barLabel}>{day.day.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Achievements */}
          {childStats.achievements.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionTitle}>Achievements 🏆</div>
              <div style={s.achGrid}>
                {childStats.achievements.map(a => (
                  <div key={a.id} style={s.achBadge} title={a.description}>
                    <span style={{ fontSize: 24 }}>{a.icon}</span>
                    <span style={s.achName}>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  root: { height: '100%', overflowY: 'auto', paddingRight: 8 },
  loading: { color: 'rgba(255,255,255,0.4)', padding: 40 },
  heading: { fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 16, fontFamily: 'Fredoka One, cursive' },
  alert: { background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FFA500', fontWeight: 800, marginBottom: 16, fontSize: 14 },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  overCard: { background: 'rgba(255,255,255,0.04)', border: '1.5px solid', borderRadius: 14, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', transition: 'background 0.2s' },
  statRow: { display: 'flex', justifyContent: 'space-between', width: '100%' },
  statLbl: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700 },
  statVal: { fontSize: 13, fontWeight: 800, color: '#fff' },
  miniProgress: { width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  miniBar: { height: '100%', borderRadius: 3, transition: 'width 0.5s' },
  detailCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  barChart: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 },
  barWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 },
  bar: { width: '100%', borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.3s' },
  barLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', transform: 'rotate(-45deg)', transformOrigin: 'top right', whiteSpace: 'nowrap' },
  achGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  achBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', minWidth: 70 },
  achName: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 800, textAlign: 'center' },
};
