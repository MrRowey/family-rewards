// ─── routes/templates.js ────────────────────────────────────────────────
const express = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { childId } = req.query;
  const rows = childId
    ? db.prepare('SELECT * FROM task_templates WHERE child_id=? AND is_active=1 ORDER BY name').all(childId)
    : db.prepare('SELECT * FROM task_templates WHERE is_active=1 ORDER BY name').all();
  res.json(rows);
});

router.post('/', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { child_id, name, points = 10, icon = '✅', days_of_week = '1,2,3,4,5' } = req.body;
  if (!child_id || !name) return res.status(400).json({ error: 'child_id and name required' });
  const id = uuid();
  db.prepare(`INSERT INTO task_templates (id, child_id, name, points, icon, days_of_week) VALUES (?,?,?,?,?,?)`)
    .run(id, child_id, name, points, icon, days_of_week);
  res.status(201).json({ id, child_id, name, points, icon, days_of_week });
});

router.patch('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { name, points, icon, days_of_week, is_active } = req.body;
  db.prepare(`UPDATE task_templates SET name=COALESCE(?,name), points=COALESCE(?,points),
    icon=COALESCE(?,icon), days_of_week=COALESCE(?,days_of_week),
    is_active=COALESCE(?,is_active), updated_at=datetime('now') WHERE id=?`)
    .run(name, points, icon, days_of_week, is_active, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE task_templates SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
