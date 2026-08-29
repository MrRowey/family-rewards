const { v4: uuid } = require('uuid');
const { getDb } = require('../db');

function today() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generates tasks for today from active templates.
 * Safe to call multiple times — skips if tasks already exist for the day.
 */
function generateDailyTasks() {
  const db = getDb();
  const todayStr = today();
  const dayOfWeek = new Date().getDay(); // 0=Sun ... 6=Sat

  const templates = db.prepare('SELECT * FROM task_templates WHERE is_active=1').all();

  let created = 0;
  for (const tpl of templates) {
    const days = tpl.days_of_week.split(',').map(Number);
    if (!days.includes(dayOfWeek)) continue;

    // Skip if a task from this template already exists today
    const existing = db.prepare(
      'SELECT id FROM tasks WHERE template_id=? AND date=?'
    ).get(tpl.id, todayStr);
    if (existing) continue;

    db.prepare(`
      INSERT INTO tasks (id, child_id, template_id, name, points, icon, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuid(), tpl.child_id, tpl.id, tpl.name, tpl.points, tpl.icon, todayStr);
    created++;
  }

  if (created > 0) console.log(`[scheduler] Created ${created} tasks for ${todayStr}`);
}

/**
 * Weekly reset:
 * - Reset weekly_bonus_claimed on streaks
 * - Optionally archive old tasks (keep last 90 days)
 */
function weeklyReset() {
  const db = getDb();
  db.prepare('UPDATE streaks SET weekly_bonus_claimed=0').run();

  // Clean tasks older than 90 days
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
  const deleted = db.prepare('DELETE FROM tasks WHERE date < ?').run(cutoff);
  console.log(`[scheduler] Weekly reset done. Archived ${deleted.changes} old tasks.`);
}

module.exports = { generateDailyTasks, weeklyReset };
