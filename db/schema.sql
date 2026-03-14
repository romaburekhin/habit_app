CREATE TABLE IF NOT EXISTS habits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        TEXT    NOT NULL,
  name           TEXT    NOT NULL,
  goal           INTEGER NOT NULL DEFAULT 10,
  completed_days INTEGER NOT NULL DEFAULT 0,
  color          TEXT,
  created_at     TEXT    NOT NULL
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
