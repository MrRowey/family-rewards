const { v4: uuid } = require('uuid');
const { getDb } = require('../db');

const ACHIEVEMENTS = [
  { id: 'first_task',    name: 'First Step!',      icon: '🌟', description: 'Completed your first task',     condition: { type: 'tasks_total',  value: 1   } },
  { id: 'ten_tasks',     name: 'Getting Going',    icon: '🚀', description: 'Completed 10 tasks total',      condition: { type: 'tasks_total',  value: 10  } },
  { id: 'fifty_tasks',   name: 'Task Master',      icon: '💪', description: 'Completed 50 tasks total',      condition: { type: 'tasks_total',  value: 50  } },
  { id: 'streak_3',      name: '3 Day Streak!',    icon: '🔥', description: '3 days in a row',              condition: { type: 'streak',       value: 3   } },
  { id: 'streak_7',      name: 'Week Warrior',     icon: '⚡', description: '7 day streak',                 condition: { type: 'streak',       value: 7   } },
  { id: 'streak_30',     name: 'Unstoppable!',     icon: '👑', description: '30 day streak',                condition: { type: 'streak',       value: 30  } },
  { id: 'points_100',    name: '100 Points!',      icon: '💯', description: 'Earned 100 total points',       condition: { type: 'points_total', value: 100 } },
  { id: 'points_500',    name: 'Points Collector', icon: '💰', description: 'Earned 500 total points',       condition: { type: 'points_total', value: 500 } },
  { id: 'first_reward',  name: 'Treat Yourself',   icon: '🎁', description: 'Bought your first reward',      condition: { type: 'purchases',    value: 1   } },
  { id: 'perfect_week',  name: 'Perfect Week',     icon: '🏆', description: 'All tasks done 7 days running', condition: { type: 'streak',       value: 7   } },
];

function seedAchievements() {
  const db = getDb();
  for (const a of ACHIEVEMENTS) {
    const exists = db.prepare('SELECT id FROM achievements WHERE id=?').get(a.id);
    if (!exists) {
      db.prepare(`INSERT INTO achievements (id, name, description, icon, condition) VALUES (?,?,?,?,?)`)
        .run(a.id, a.name, a.description, a.icon, JSON.stringify(a.condition));
    }
  }
}

function checkAchievements(db, childId) {
  const child = db.prepare('SELECT total_points_earned FROM children WHERE id=?').get(childId);
  const streak = db.prepare('SELECT current_streak FROM streaks WHERE child_id=?').get(childId);
  const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE child_id=? AND is_complete=1').get(childId);
  const purchaseCount = db.prepare('SELECT COUNT(*) as c FROM purchases WHERE child_id=?').get(childId);

  const allAchievements = db.prepare('SELECT * FROM achievements').all();

  for (const a of allAchievements) {
    const already = db.prepare('SELECT id FROM child_achievements WHERE child_id=? AND achievement_id=?').get(childId, a.id);
    if (already) continue;

    const cond = JSON.parse(a.condition);
    let earned = false;

    if (cond.type === 'tasks_total'  && taskCount.c         >= cond.value) earned = true;
    if (cond.type === 'streak'       && streak?.current_streak >= cond.value) earned = true;
    if (cond.type === 'points_total' && child.total_points_earned >= cond.value) earned = true;
    if (cond.type === 'purchases'    && purchaseCount.c      >= cond.value) earned = true;

    if (earned) {
      db.prepare('INSERT INTO child_achievements (id, child_id, achievement_id) VALUES (?,?,?)')
        .run(uuid(), childId, a.id);
      console.log(`[achievements] ${childId} earned: ${a.name}`);
    }
  }
}

module.exports = { seedAchievements, checkAchievements };
