const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

/* GET /api/stats/overview — parent dashboard summary */
router.get('/overview', requireAuth(['admin', 'approval']), (req, res) => {
  const db = getDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const weekAgo  = new Date(Date.now() - 7*86400000).toISOString();

  const children = db.prepare('SELECT id, name FROM children').all();

  const stats = children.map(c => {
    const taskStats = db.prepare(`
      SELECT COUNT(*) as total, SUM(is_complete) as done
      FROM tasks WHERE child_id=? AND date=?
    `).get(c.id, todayStr);

    const weeklyPoints = db.prepare(`
      SELECT COALESCE(SUM(delta), 0) as pts FROM point_events
      WHERE child_id=? AND delta > 0 AND created_at >= ?
    `).get(c.id, weekAgo);

    const streak = db.prepare('SELECT current_streak FROM streaks WHERE child_id=?').get(c.id);

    return {
      childId: c.id,
      name: c.name,
      todayTasks: taskStats,
      weeklyPointsEarned: weeklyPoints.pts,
      currentStreak: streak?.current_streak || 0,
    };
  });

  const pendingApprovals = db.prepare(`
    SELECT COUNT(*) as c FROM purchases WHERE status='pending'
  `).get().c;

  res.json({ children: stats, pendingApprovals });
});

/* GET /api/stats/child/:id?days=30 — child history chart data */
router.get('/child/:id', requireAuth(['admin', 'approval']), (req, res) => {
  const db = getDb();
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const pointHistory = db.prepare(`
    SELECT date(created_at) as day, SUM(delta) as net_points
    FROM point_events WHERE child_id=? AND created_at >= ?
    GROUP BY day ORDER BY day
  `).all(req.params.id, since);

  const taskHistory = db.prepare(`
    SELECT date, COUNT(*) as total, SUM(is_complete) as done
    FROM tasks WHERE child_id=? AND date >= date(?)
    GROUP BY date ORDER BY date
  `).all(req.params.id, since);

  const achievements = db.prepare(`
    SELECT a.* FROM achievements a
    JOIN child_achievements ca ON ca.achievement_id = a.id
    WHERE ca.child_id=? ORDER BY ca.earned_at DESC
  `).all(req.params.id);

  res.json({ pointHistory, taskHistory, achievements });
});

module.exports = router;
