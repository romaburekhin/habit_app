CREATE TABLE IF NOT EXISTS habits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT    NOT NULL,
  name           TEXT    NOT NULL,
  goal           INTEGER NOT NULL DEFAULT 10,
  completed_days INTEGER NOT NULL DEFAULT 0,
  color          TEXT,
  created_at     TEXT    NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS completions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id  INTEGER NOT NULL,
  date      TEXT    NOT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
  UNIQUE(habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  email   TEXT NOT NULL,
  name    TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_schedules (
  user_id  TEXT PRIMARY KEY,
  time     TEXT NOT NULL DEFAULT '09:00',
  days     TEXT NOT NULL DEFAULT '1,2,3,4,5',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS challenges (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  inviter_id       TEXT    NOT NULL,
  invitee_email    TEXT    NOT NULL,
  invitee_id       TEXT,
  inviter_habit_id INTEGER NOT NULL,
  invitee_habit_id INTEGER,
  status           TEXT    NOT NULL DEFAULT 'pending',
  created_at       TEXT    NOT NULL,
  FOREIGN KEY (inviter_habit_id) REFERENCES habits(id) ON DELETE CASCADE
);
