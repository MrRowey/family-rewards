const express = require('express');
const { v4: uuid } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

/* GET /api/purchases?childId= */
router.get('/', (req, res) => {
  const db = getDb();
  const { childId, status } = req.query;
  let sql = `SELECT p.*, r.name as reward_name, r.icon as reward_icon, c.name as child_name
             FROM purchases p
             JOIN rewards r ON r.id = p.reward_id
             JOIN children c ON c.id = p.child_id WHERE 1=1`;
  const params = [];
  if (childId) { sql += ' AND p.child_id=?'; params.push(childId); }
  if (status)  { sql += ' AND p.status=?';   params.push(status); }
  sql += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

/* POST /api/purchases — child buys a reward */
router.post('/', (req, res) => {
  const db = getDb();
  const { child_id, reward_id } = req.body;
  if (!child_id || !reward_id) return res.status(400).json({ error: 'child_id and reward_id required' });

  const child  = db.prepare('SELECT * FROM children WHERE id=?').get(child_id);
  const reward = db.prepare('SELECT * FROM rewards WHERE id=? AND is_active=1').get(reward_id);
  if (!child)  return res.status(404).json({ error: 'Child not found' });
  if (!reward) return res.status(404).json({ error: 'Reward not found' });
  if (child.points < reward.points_cost) return res.status(400).json({ error: 'Not enough points' });

  // Stock check
  if (reward.stock !== null && reward.stock <= 0) return res.status(409).json({ error: 'Out of stock' });

  // Daily/weekly limit checks
  const todayStr = new Date().toISOString().split('T')[0];
  const weekAgo  = new Date(Date.now() - 7*86400000).toISOString();

  if (reward.daily_limit) {
    const todayCount = db.prepare(`
      SELECT COUNT(*) as c FROM purchases WHERE child_id=? AND reward_id=? AND created_at >= ?
    `).get(child_id, reward_id, todayStr + 'T00:00:00').c;
    if (todayCount >= reward.daily_limit) return res.status(409).json({ error: 'Daily limit reached' });
  }

  if (reward.weekly_limit) {
    const weekCount = db.prepare(`
      SELECT COUNT(*) as c FROM purchases WHERE child_id=? AND reward_id=? AND created_at >= ?
    `).get(child_id, reward_id, weekAgo).c;
    if (weekCount >= reward.weekly_limit) return res.status(409).json({ error: 'Weekly limit reached' });
  }

  const status = reward.requires_approval ? 'pending' : 'approved';
  const id = uuid();

  db.prepare(`INSERT INTO purchases (id, child_id, reward_id, points_spent, status) VALUES (?,?,?,?,?)`)
    .run(id, child_id, reward_id, reward.points_cost, status);

  // Deduct points immediately
  db.prepare('UPDATE children SET points=points-?, updated_at=datetime("now") WHERE id=?')
    .run(reward.points_cost, child_id);

  db.prepare(`INSERT INTO point_events (id, child_id, delta, reason, reference_id) VALUES (?,?,?,?,?)`)
    .run(uuid(), child_id, -reward.points_cost, 'purchase', id);

  // Decrement stock
  if (reward.stock !== null) {
    db.prepare('UPDATE rewards SET stock=stock-1 WHERE id=?').run(reward_id);
  }

  const updatedChild = db.prepare('SELECT points FROM children WHERE id=?').get(child_id);
  res.status(201).json({ id, status, newBalance: updatedChild.points, requiresApproval: !!reward.requires_approval });
});

/* PATCH /api/purchases/:id/approve — approval or admin */
router.patch('/:id/approve', requireAuth(['admin', 'approval']), (req, res) => {
  const db = getDb();
  const { parent_note } = req.body;
  db.prepare(`UPDATE purchases SET status='approved', approved_at=datetime('now'), parent_note=? WHERE id=?`)
    .run(parent_note || null, req.params.id);
  res.json({ ok: true });
});

/* PATCH /api/purchases/:id/reject — refund points */
router.patch('/:id/reject', requireAuth(['admin', 'approval']), (req, res) => {
  const db = getDb();
  const { parent_note } = req.body;
  const purchase = db.prepare('SELECT * FROM purchases WHERE id=?').get(req.params.id);
  if (!purchase) return res.status(404).json({ error: 'Not found' });

  db.prepare(`UPDATE purchases SET status='rejected', parent_note=? WHERE id=?`)
    .run(parent_note || null, req.params.id);

  // Refund
  db.prepare('UPDATE children SET points=points+?, updated_at=datetime("now") WHERE id=?')
    .run(purchase.points_spent, purchase.child_id);
  db.prepare(`INSERT INTO point_events (id, child_id, delta, reason, reference_id) VALUES (?,?,?,?,?)`)
    .run(uuid(), purchase.child_id, purchase.points_spent, 'refund', purchase.id);

  res.json({ ok: true });
});

/* PATCH /api/purchases/:id/redeem — mark as redeemed */
router.patch('/:id/redeem', requireAuth(['admin', 'approval']), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE purchases SET status='redeemed', redeemed_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
