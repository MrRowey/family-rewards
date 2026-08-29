// src/migrate.js — run once to initialise / upgrade the SQLite database
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './database/family.db';

function migrate() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    /* ──────────────────────────────────────────────
       CHILDREN
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS children (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      avatar      TEXT NOT NULL DEFAULT 'star',   -- emoji or icon key
      color       TEXT NOT NULL DEFAULT '#FF6B6B', -- card accent colour
      points      INTEGER NOT NULL DEFAULT 0,
      total_points_earned INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* ──────────────────────────────────────────────
       STREAKS
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS streaks (
      id            TEXT PRIMARY KEY,
      child_id      TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      current_streak  INTEGER NOT NULL DEFAULT 0,  -- days in a row all tasks done
      longest_streak  INTEGER NOT NULL DEFAULT 0,
      last_complete_date TEXT,                      -- ISO date YYYY-MM-DD
      weekly_bonus_claimed INTEGER NOT NULL DEFAULT 0,  -- boolean 0/1
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* ──────────────────────────────────────────────
       WEEKLY TASK TEMPLATES  (recurring chores)
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS task_templates (
      id          TEXT PRIMARY KEY,
      child_id    TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      points      INTEGER NOT NULL DEFAULT 10,
      icon        TEXT NOT NULL DEFAULT '✅',
      days_of_week TEXT NOT NULL DEFAULT '1,2,3,4,5',  -- CSV of 0-6
      is_active   INTEGER NOT NULL DEFAULT 1,           -- boolean
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* ──────────────────────────────────────────────
       DAILY TASKS  (generated each day from templates + overrides)
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS tasks (
      id            TEXT PRIMARY KEY,
      child_id      TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      template_id   TEXT REFERENCES task_templates(id) ON DELETE SET NULL,
      name          TEXT NOT NULL,
      points        INTEGER NOT NULL DEFAULT 10,
      icon          TEXT NOT NULL DEFAULT '✅',
      date          TEXT NOT NULL,   -- ISO date YYYY-MM-DD
      is_complete   INTEGER NOT NULL DEFAULT 0,   -- boolean
      completed_at  TEXT,
      is_override   INTEGER NOT NULL DEFAULT 0,   -- manually added by parent
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_child_date ON tasks(child_id, date);

    /* ──────────────────────────────────────────────
       REWARDS SHOP ITEMS
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS rewards (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      description     TEXT,
      points_cost     INTEGER NOT NULL,
      icon            TEXT NOT NULL DEFAULT '🎁',
      stock           INTEGER,               -- NULL = unlimited
      daily_limit     INTEGER,               -- max purchases per child per day
      weekly_limit    INTEGER,               -- max purchases per child per week
      requires_approval INTEGER NOT NULL DEFAULT 0,  -- boolean
      is_mystery      INTEGER NOT NULL DEFAULT 0,    -- mystery reward
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    /* ──────────────────────────────────────────────
       PURCHASES / REDEMPTIONS
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS purchases (
      id            TEXT PRIMARY KEY,
      child_id      TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      reward_id     TEXT NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
      points_spent  INTEGER NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | redeemed
      approved_at   TEXT,
      redeemed_at   TEXT,
      parent_note   TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_child ON purchases(child_id);

    /* ──────────────────────────────────────────────
       ACHIEVEMENTS / BADGES
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS achievements (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL,
      icon        TEXT NOT NULL DEFAULT '🏆',
      condition   TEXT NOT NULL  -- JSON descriptor: {"type":"streak","value":7}
    );

    CREATE TABLE IF NOT EXISTS child_achievements (
      id          TEXT PRIMARY KEY,
      child_id    TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
      earned_at   TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(child_id, achievement_id)
    );

    /* ──────────────────────────────────────────────
       POINT HISTORY  (audit log)
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS point_events (
      id          TEXT PRIMARY KEY,
      child_id    TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      delta       INTEGER NOT NULL,           -- positive = earn, negative = spend
      reason      TEXT NOT NULL,              -- 'task', 'bonus', 'purchase', 'manual'
      reference_id TEXT,                      -- task.id or purchase.id
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_point_events_child ON point_events(child_id, created_at);

    /* ──────────────────────────────────────────────
       BONUS EVENTS  (parent-scheduled bonus periods)
    ────────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS bonus_events (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      multiplier  REAL NOT NULL DEFAULT 2.0,
      starts_at   TEXT NOT NULL,
      ends_at     TEXT NOT NULL,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log('✅  Database migration complete:', DB_PATH);
  db.close();
}

migrate();
