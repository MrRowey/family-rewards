require('dotenv').config();
const { v4: uuid } = require('uuid');
const { getDb } = require('./db');
const { seedAchievements } = require('./services/achievements');

// Run migrations first
require('./migrate');

const db = getDb();

console.log('🌱  Seeding database with example data…');

// Clear existing data
db.exec(`
  DELETE FROM point_events;
  DELETE FROM child_achievements;
  DELETE FROM purchases;
  DELETE FROM tasks;
  DELETE FROM task_templates;
  DELETE FROM streaks;
  DELETE FROM children;
  DELETE FROM rewards;
  DELETE FROM bonus_events;
`);

// ── Children ──────────────────────────────────────────
const children = [
  { id: uuid(), name: 'Ella',  avatar: '🦄', color: '#FF6B9D' },
  { id: uuid(), name: 'Oscar', avatar: '🦖', color: '#4ECDC4' },
  { id: uuid(), name: 'Mia',   avatar: '🌸', color: '#FFD93D' },
];

for (const c of children) {
  db.prepare('INSERT INTO children (id, name, avatar, color, points) VALUES (?,?,?,?,?)').run(c.id, c.name, c.avatar, c.color, 45);
  db.prepare('INSERT INTO streaks (id, child_id, current_streak, longest_streak) VALUES (?,?,?,?)').run(uuid(), c.id, 3, 7);
}

console.log('✅  Added children:', children.map(c => c.name).join(', '));

// ── Weekly Task Templates ─────────────────────────────
const taskDefs = [
  // Ella
  { child: children[0], name: 'Brush teeth',  icon: '🦷', points: 5,  days: '1,2,3,4,5,6,0' },
  { child: children[0], name: 'Make bed',      icon: '🛏️',  points: 5,  days: '1,2,3,4,5,6,0' },
  { child: children[0], name: 'Homework',      icon: '📚', points: 15, days: '1,2,3,4,5' },
  { child: children[0], name: 'Tidy room',     icon: '🧹', points: 10, days: '1,3,5' },
  { child: children[0], name: 'Reading time',  icon: '📖', points: 10, days: '1,2,3,4,5' },
  // Oscar
  { child: children[1], name: 'Brush teeth',  icon: '🦷', points: 5,  days: '1,2,3,4,5,6,0' },
  { child: children[1], name: 'Make bed',      icon: '🛏️',  points: 5,  days: '1,2,3,4,5,6,0' },
  { child: children[1], name: 'Homework',      icon: '📚', points: 15, days: '1,2,3,4,5' },
  { child: children[1], name: 'Feed the dog',  icon: '🐶', points: 10, days: '1,2,3,4,5,6,0' },
  { child: children[1], name: 'Tidy toys',     icon: '🧸', points: 10, days: '1,3,5' },
  // Mia
  { child: children[2], name: 'Brush teeth',  icon: '🦷', points: 5,  days: '1,2,3,4,5,6,0' },
  { child: children[2], name: 'Make bed',      icon: '🛏️',  points: 5,  days: '1,2,3,4,5,6,0' },
  { child: children[2], name: 'Homework',      icon: '📚', points: 15, days: '1,2,3,4,5' },
  { child: children[2], name: 'Set the table', icon: '🍽️',  points: 10, days: '1,2,3,4,5,6,0' },
  { child: children[2], name: 'Watering plants', icon: '🌱', points: 8, days: '2,4,6' },
];

for (const t of taskDefs) {
  db.prepare('INSERT INTO task_templates (id, child_id, name, points, icon, days_of_week) VALUES (?,?,?,?,?,?)')
    .run(uuid(), t.child.id, t.name, t.points, t.icon, t.days);
}

// ── Rewards Shop ──────────────────────────────────────
const rewards = [
  { name: 'Small sweet treat',    icon: '🍬', points_cost: 15,  requires_approval: 0 },
  { name: '30 min extra screen time', icon: '📱', points_cost: 25, requires_approval: 1, weekly_limit: 2 },
  { name: 'Choose dinner tonight', icon: '🍕', points_cost: 40,  requires_approval: 1, weekly_limit: 1 },
  { name: 'Stay up 30 min late',   icon: '🌙', points_cost: 50,  requires_approval: 1, weekly_limit: 1 },
  { name: 'Movie night pick',      icon: '🎬', points_cost: 75,  requires_approval: 1, weekly_limit: 1 },
  { name: 'New book',              icon: '📕', points_cost: 100, requires_approval: 1, stock: 5 },
  { name: 'Day trip destination',  icon: '🗺️',  points_cost: 200, requires_approval: 1, stock: null },
  { name: 'New toy / game',        icon: '🎮', points_cost: 300, requires_approval: 1, stock: null },
  { name: '??? Mystery Reward',    icon: '🎁', points_cost: 60,  requires_approval: 1, is_mystery: 1, stock: 3 },
];

for (const r of rewards) {
  db.prepare(`INSERT INTO rewards (id, name, description, points_cost, icon, stock, daily_limit, weekly_limit, requires_approval, is_mystery)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uuid(), r.name, r.description || '', r.points_cost, r.icon,
         r.stock ?? null, r.daily_limit ?? null, r.weekly_limit ?? null,
         r.requires_approval ?? 0, r.is_mystery ?? 0);
}

// ── Achievements ──────────────────────────────────────
seedAchievements();

console.log('🎉  Seed complete! Run the server and open http://localhost:3000');
