-- 訓練護照 · D1 schema
-- 分類固定為 5 種：foundation / strength / power / agility / recovery

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar_initial TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mesocycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  chapter_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  goal_text TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,   -- YYYY-MM-DD
  end_date TEXT NOT NULL      -- YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  mesocycle_id INTEGER REFERENCES mesocycles(id),
  session_date TEXT NOT NULL,   -- YYYY-MM-DD
  session_rpe INTEGER NOT NULL, -- 1-10
  duration_min INTEGER NOT NULL,
  coach_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('foundation','strength','power','agility','recovery')),
  name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  duration_min REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercise_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('foundation','strength','power','agility','recovery')),
  name TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(category, name)
);

CREATE INDEX IF NOT EXISTS idx_mesocycles_athlete ON mesocycles(athlete_id, chapter_no);
CREATE INDEX IF NOT EXISTS idx_sessions_athlete ON sessions(athlete_id, session_date);
CREATE INDEX IF NOT EXISTS idx_exercises_session ON exercises(session_id);
