-- 訓練護照 v2 migration
-- v1 只有示範資料，直接汰換 sessions/exercises/mesocycles；athletes 保留並擴欄
-- 七大分類：fms / strength / power / plyo / saq / energy / mobility

DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS mesocycles;
DROP TABLE IF EXISTS exercise_catalog;

-- ---------- athletes ----------
ALTER TABLE athletes RENAME COLUMN slug TO public_id;
ALTER TABLE athletes ADD COLUMN sex TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN birth_year INTEGER;
ALTER TABLE athletes ADD COLUMN stage TEXT NOT NULL DEFAULT 'pre';
ALTER TABLE athletes ADD COLUMN stage_started_on TEXT;
ALTER TABLE athletes ADD COLUMN group_id INTEGER;
ALTER TABLE athletes ADD COLUMN notes TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- 階段目標比重 ----------
CREATE TABLE IF NOT EXISTS stage_targets (
  stage TEXT NOT NULL,          -- pre / circa / post
  category TEXT NOT NULL,       -- 七大分類
  target_pct REAL NOT NULL,
  tolerance_pct REAL NOT NULL DEFAULT 5,
  PRIMARY KEY (stage, category)
);

-- ---------- 身高體重 ----------
CREATE TABLE IF NOT EXISTS growth_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  measured_on TEXT NOT NULL,
  height_cm REAL,
  weight_kg REAL
);

-- ---------- 季 / block ----------
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL,     -- group / athlete
  owner_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  goal_text TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL,     -- group / athlete / template
  owner_id INTEGER NOT NULL DEFAULT 0,
  season_id INTEGER REFERENCES seasons(id),
  title TEXT NOT NULL,
  goal_text TEXT NOT NULL DEFAULT '',
  main_axis TEXT NOT NULL DEFAULT 'strength',
  intensity TEXT NOT NULL DEFAULT 'low',   -- low / mid / high
  weeks INTEGER NOT NULL DEFAULT 6,
  start_date TEXT,
  end_date TEXT,
  ramp_template_id INTEGER,
  raise_types TEXT NOT NULL DEFAULT '["sgm"]',
  am_types TEXT NOT NULL DEFAULT '["dynamic_fms"]',
  pot_types TEXT NOT NULL DEFAULT '["explosive_jump"]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS block_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_id INTEGER NOT NULL REFERENCES blocks(id),
  segment TEXT NOT NULL,        -- sgm / power / strength / main
  name TEXT NOT NULL,
  target_movement TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  doses TEXT NOT NULL DEFAULT '["","","","","",""]',   -- JSON，每週一格
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ---------- RAMP 模板 ----------
CREATE TABLE IF NOT EXISTS ramp_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  focus TEXT NOT NULL,          -- JSON: [{key,label,levels:[l1,l2,l3]}]
  raise_min INTEGER NOT NULL DEFAULT 5,
  am_min INTEGER NOT NULL DEFAULT 7,
  pot_min INTEGER NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS focus_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  focus_key TEXT NOT NULL,
  level INTEGER NOT NULL,
  achieved_on TEXT NOT NULL
);

-- ---------- sessions ----------
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  block_id INTEGER REFERENCES blocks(id),
  session_date TEXT NOT NULL,
  week_no INTEGER,
  main_axis TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  raise_min INTEGER NOT NULL DEFAULT 5,
  am_min INTEGER NOT NULL DEFAULT 7,
  pot_min INTEGER NOT NULL DEFAULT 5,
  main_min INTEGER NOT NULL,
  raise_types TEXT NOT NULL DEFAULT '[]',
  am_types TEXT NOT NULL DEFAULT '[]',
  pot_types TEXT NOT NULL DEFAULT '[]',
  session_rpe INTEGER,
  coach_note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'app',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  name TEXT NOT NULL,
  dose TEXT NOT NULL DEFAULT '',
  load_kg REAL,
  category TEXT NOT NULL,
  target_movement TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  from_plan INTEGER NOT NULL DEFAULT 0
);

-- ---------- 突破構件 ----------
CREATE TABLE IF NOT EXISTS turning_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id),
  tier TEXT NOT NULL,           -- gold / silver / rainbow
  reason_type TEXT NOT NULL,    -- pr / attendance / level_up / block_done / custom
  sentence TEXT NOT NULL,
  granted_on TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- 動作庫 ----------
CREATE TABLE IF NOT EXISTS exercise_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(category, name)
);

CREATE INDEX IF NOT EXISTS idx_sessions_athlete ON sessions(athlete_id, session_date);
CREATE INDEX IF NOT EXISTS idx_sx_session ON session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_blocks_owner ON blocks(owner_type, owner_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bx_block ON block_exercises(block_id, segment, sort_order);
CREATE INDEX IF NOT EXISTS idx_focus_athlete ON focus_levels(athlete_id, focus_key, achieved_on);
CREATE INDEX IF NOT EXISTS idx_growth_athlete ON growth_log(athlete_id, measured_on);
