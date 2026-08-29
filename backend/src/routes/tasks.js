const express = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');
const { checkAchievements } = require('../services/achievements');

const router = express.Router();

function today() {
  return new Date().toISOString().split('T')[0];
}

function activeBonusMultiplier(db) {
  const now = new Date().toISOString();
  const bonus = db.prepare(`
    SELECT multiplier FROM bonus_events
    WHERE is_active=1 AND starts_at <= ? AND ends_at >= ?
    ORDER BY multiplier DESC LIMIT 1
  `).get(now, now);
  return bonus ? bonus.multiplier : 1;
}

/* GET /api/tasks?childId=&date= */
router.get('/', (req, res) => {
  const db = getDb();
  const { childId, date = today() } = req.query;

  const where = childId ? 'WHERE child_id=? AND date=?' : 'WHERE date=?';
  const params = childId ? [childId, date] : [date];

  const tasks = db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at`).all(...params);
  res.json(tasks);
});

/* POST /api/tasks/:id/complete — tap to complete */
router.post('/:id/complete', (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  if (task.is_complete) return res.status(409).json({ error: 'Already complete' });

  const multiplier = activeBonusMultiplier(db);
  const earned = Math.round(task.points * multiplier);

  // Mark task complete
  db.prepare(`
    UPDATE tasks SET is_complete=1, completed_at=datetime('now') WHERE id=?
  `).run(task.id);

  // Award points
  const child = db.prepare('SELECT points, total_points_earned FROM children WHERE id=?').get(task.child_id);
  db.prepare(`
    UPDATE children SET points=?, total_points_earned=?, updated_at=datetime('now') WHERE id=?
  `).run(child.points + earned, child.total_points_earned + earned, task.child_id);

  db.prepare(`INSERT INTO point_events (id, child_id, delta, reason, reference_id) VALUES (?,?,?,?,?)`)
    .run(uuid(), task.child_id, earned, multiplier > 1 ? 'task_bonus' : 'task', task.id);

  // Update streak
  updateStreak(db, task.child_id);

  // Check achievements
  checkAchievements(db, task.child_id);

  const updatedChild = db.prepare('SELECT points FROM children WHERE id=?').get(task.child_id);
  res.json({ ok: true, earned, bonusMultiplier: multiplier, newBalance: updatedChild.points });
});

/* POST /api/tasks/:id/uncomplete — undo (admin only) */
router.post('/:id/uncomplete', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  if (!task.is_complete) return res.status(409).json({ error: 'Not complete' });

  db.prepare(`UPDATE tasks SET is_complete=0, completed_at=NULL WHERE id=?`).run(task.id);

  // Deduct points
  const child = db.prepare('SELECT points FROM children WHERE id=?').get(task.child_id);
  db.prepare(`UPDATE children SET points=MAX(0, ?), updated_at=datetime('now') WHERE id=?`)
    .run(child.points - task.points, task.child_id);

  db.prepare(`INSERT INTO point_events (id, child_id, delta, reason, reference_id) VALUES (?,?,?,?,?)`)
    .run(uuid(), task.child_id, -task.points, 'undo', task.id);

  res.json({ ok: true });
});

/* POST /api/tasks — parent override (admin) */
router.post('/', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { child_id, name, points = 10, icon = '✅', date = today() } = req.body;
  if (!child_id || !name) return res.status(400).json({ error: 'child_id and name required' });

  const id = uuid();
  db.prepare(`
    INSERT INTO tasks (id, child_id, name, points, icon, date, is_override)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, child_id, name, points, icon, date);

  res.status(201).json({ id, child_id, name, points, icon, date, is_override: 1, is_complete: 0 });
});

/* PATCH /api/tasks/:id — edit task (admin) */
router.patch('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { name, points, icon } = req.body;
  db.prepare(`
    UPDATE tasks SET
      name=COALESCE(?,name),
      points=COALESCE(?,points),
      icon=COALESCE(?,icon)
    WHERE id=?
  `).run(name, points, icon, req.params.id);
  res.json({ ok: true });
});

/* DELETE /api/tasks/:id — remove task for day (admin) */
router.delete('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* ── helper: update streak after completing a task ── */
function updateStreak(db, childId) {
  const todayStr = today();
  const allDone = db.prepare(`
    SELECT COUNT(*) as total, SUM(is_complete) as done
    FROM tasks WHERE child_id=? AND date=?
  `).get(childId, todayStr);

  if (!allDone || allDone.total === 0 || allDone.done < allDone.total) return;

  const streak = db.prepare('SELECT * FROM streaks WHERE child_id=?').get(childId);
  if (!streak) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const isConsecutive = streak.last_complete_date === yesterday || streak.last_complete_date === todayStr;

  const newStreak = isConsecutive ? (streak.last_complete_date === todayStr ? streak.current_streak : streak.current_streak + 1) : 1;
  const longestStreak = Math.max(streak.longest_streak, newStreak);

  db.prepare(`
    UPDATE streaks SET current_streak=?, longest_streak=?, last_complete_date=?, updated_at=datetime('now')
    WHERE child_id=?
  `).run(newStreak, longestStreak, todayStr, childId);

  // Weekly bonus: 7-day streak bonus
  if (newStreak > 0 && newStreak % 7 === 0 && !streak.weekly_bonus_claimed) {
    const bonusPts = 50;
    const child = db.prepare('SELECT points, total_points_earned FROM children WHERE id=?').get(childId);
    db.prepare('UPDATE children SET points=?, total_points_earned=? WHERE id=?')
      .run(child.points + bonusPts, child.total_points_earned + bonusPts, childId);
    db.prepare(`INSERT INTO point_events (id, child_id, delta, reason) VALUES (?,?,?,?)`)
      .run(uuid(), childId, bonusPts, 'weekly_streak_bonus');
    db.prepare('UPDATE streaks SET weekly_bonus_claimed=1 WHERE child_id=?').run(childId);
  }
}

module.exports = router;
