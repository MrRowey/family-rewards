const express = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

/* GET /api/children — list all children with streak info */
router.get('/', (req, res) => {
  const db = getDb();
  const children = db.prepare(`
    SELECT c.*, s.current_streak, s.longest_streak, s.last_complete_date
    FROM children c
    LEFT JOIN streaks s ON s.child_id = c.id
    ORDER BY c.created_at
  `).all();
  res.json(children);
});

/* GET /api/children/:id */
router.get('/:id', (req, res) => {
  const db = getDb();
  const child = db.prepare(`
    SELECT c.*, s.current_streak, s.longest_streak, s.last_complete_date
    FROM children c
    LEFT JOIN streaks s ON s.child_id = c.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!child) return res.status(404).json({ error: 'Not found' });
  res.json(child);
});

/* POST /api/children — create child (admin only) */
router.post('/', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { name, avatar = '⭐', color = '#FF6B6B' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const id = uuid();
  db.prepare(`INSERT INTO children (id, name, avatar, color) VALUES (?, ?, ?, ?)`).run(id, name, avatar, color);
  db.prepare(`INSERT INTO streaks (id, child_id) VALUES (?, ?)`).run(uuid(), id);

  res.status(201).json({ id, name, avatar, color, points: 0 });
});

/* PATCH /api/children/:id — update child (admin only) */
router.patch('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { name, avatar, color } = req.body;
  db.prepare(`
    UPDATE children SET name=COALESCE(?,name), avatar=COALESCE(?,avatar), color=COALESCE(?,color),
    updated_at=datetime('now') WHERE id=?
  `).run(name, avatar, color, req.params.id);
  res.json({ ok: true });
});

/* PATCH /api/children/:id/points — manual point adjustment (admin only) */
router.patch('/:id/points', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { delta, reason = 'manual' } = req.body;
  if (typeof delta !== 'number') return res.status(400).json({ error: 'delta required' });

  const child = db.prepare('SELECT points FROM children WHERE id=?').get(req.params.id);
  if (!child) return res.status(404).json({ error: 'Not found' });

  const newPoints = Math.max(0, child.points + delta);
  db.prepare('UPDATE children SET points=?, updated_at=datetime("now") WHERE id=?').run(newPoints, req.params.id);
  db.prepare(`INSERT INTO point_events (id, child_id, delta, reason) VALUES (?,?,?,?)`)
    .run(uuid(), req.params.id, delta, reason);

  res.json({ points: newPoints });
});

/* DELETE /api/children/:id — admin only */
router.delete('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM children WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
