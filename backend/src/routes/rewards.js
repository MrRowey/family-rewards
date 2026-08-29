const express = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

/* GET /api/rewards — public: list active rewards (mystery items show placeholder name) */
router.get('/', (req, res) => {
  const db = getDb();
  const rewards = db.prepare(`
    SELECT id, name, description, points_cost, icon, stock, daily_limit, weekly_limit,
           requires_approval, is_mystery, is_active
    FROM rewards WHERE is_active=1 ORDER BY points_cost ASC
  `).all();

  // Mask mystery reward details
  const safe = rewards.map(r => r.is_mystery
    ? { ...r, name: '??? Mystery Reward', description: 'A surprise awaits!', icon: '🎁' }
    : r);

  res.json(safe);
});

/* GET /api/rewards/all — admin: full list */
router.get('/all', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM rewards ORDER BY points_cost').all());
});

/* POST /api/rewards — admin: create reward */
router.post('/', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const {
    name, description = '', points_cost, icon = '🎁',
    stock = null, daily_limit = null, weekly_limit = null,
    requires_approval = 0, is_mystery = 0,
  } = req.body;
  if (!name || !points_cost) return res.status(400).json({ error: 'name and points_cost required' });
  const id = uuid();
  db.prepare(`
    INSERT INTO rewards (id, name, description, points_cost, icon, stock, daily_limit, weekly_limit, requires_approval, is_mystery)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(id, name, description, points_cost, icon, stock, daily_limit, weekly_limit, requires_approval, is_mystery);
  res.status(201).json({ id, name, points_cost });
});

/* PATCH /api/rewards/:id — admin */
router.patch('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  const { name, description, points_cost, icon, stock, daily_limit, weekly_limit, requires_approval, is_mystery, is_active } = req.body;
  db.prepare(`UPDATE rewards SET
    name=COALESCE(?,name), description=COALESCE(?,description),
    points_cost=COALESCE(?,points_cost), icon=COALESCE(?,icon),
    stock=COALESCE(?,stock), daily_limit=COALESCE(?,daily_limit),
    weekly_limit=COALESCE(?,weekly_limit), requires_approval=COALESCE(?,requires_approval),
    is_mystery=COALESCE(?,is_mystery), is_active=COALESCE(?,is_active),
    updated_at=datetime('now') WHERE id=?`)
    .run(name, description, points_cost, icon, stock, daily_limit, weekly_limit, requires_approval, is_mystery, is_active, req.params.id);
  res.json({ ok: true });
});

/* DELETE /api/rewards/:id — soft delete */
router.delete('/:id', requireAuth(['admin']), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE rewards SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
