-- 訓練護照 v3：一堂課改成五個板塊 A–E
-- Raise / Activation / Mobilize / Potentiation / Main Training
-- 每個板塊底下掛動作，動作記 組數 × 次數 @ 重量

-- ---------- sessions：A&M 拆成 Activation / Mobilize ----------
ALTER TABLE sessions ADD COLUMN act_min INTEGER NOT NULL DEFAULT 4;
ALTER TABLE sessions ADD COLUMN mob_min INTEGER NOT NULL DEFAULT 4;
ALTER TABLE sessions ADD COLUMN act_types TEXT NOT NULL DEFAULT '[]';
ALTER TABLE sessions ADD COLUMN mob_types TEXT NOT NULL DEFAULT '[]';

UPDATE sessions SET
  act_min = am_min / 2,
  mob_min = am_min - (am_min / 2),
  act_types = CASE WHEN am_types LIKE '%activation%' THEN '["activation"]' ELSE '[]' END,
  mob_types = CASE WHEN am_types LIKE '%dynamic_fms%' THEN '["dynamic_fms"]' ELSE '[]' END;

-- ---------- session_exercises：板塊 + 組數/次數 ----------
ALTER TABLE session_exercises ADD COLUMN segment TEXT NOT NULL DEFAULT 'main';
ALTER TABLE session_exercises ADD COLUMN sets INTEGER;
ALTER TABLE session_exercises ADD COLUMN reps TEXT NOT NULL DEFAULT '';

-- 舊 dose 字串 "3x8" → sets/reps（只認開頭是純數字 + x 的）
UPDATE session_exercises
SET sets = CAST(substr(dose, 1, instr(dose, 'x') - 1) AS INTEGER),
    reps = trim(substr(dose, instr(dose, 'x') + 1))
WHERE dose GLOB '[0-9]x*' OR dose GLOB '[0-9][0-9]x*';
UPDATE session_exercises SET reps = dose WHERE reps = '' AND dose <> '' AND sets IS NULL;

-- ---------- blocks：am_types 拆成 act_types / mob_types ----------
ALTER TABLE blocks ADD COLUMN act_types TEXT NOT NULL DEFAULT '["activation"]';
ALTER TABLE blocks ADD COLUMN mob_types TEXT NOT NULL DEFAULT '["dynamic_fms"]';
UPDATE blocks SET
  act_types = CASE WHEN am_types LIKE '%activation%' THEN '["activation"]' ELSE '["activation"]' END,
  mob_types = CASE WHEN am_types LIKE '%dynamic_fms%' THEN '["dynamic_fms"]' ELSE '["dynamic_fms"]' END;

-- ---------- ramp_templates：am_min 拆成 act_min / mob_min ----------
ALTER TABLE ramp_templates ADD COLUMN act_min INTEGER NOT NULL DEFAULT 4;
ALTER TABLE ramp_templates ADD COLUMN mob_min INTEGER NOT NULL DEFAULT 4;
UPDATE ramp_templates SET act_min = am_min / 2, mob_min = am_min - (am_min / 2);

-- ---------- block_exercises：舊 segment 對應到新板塊 ----------
UPDATE block_exercises SET segment = 'raise' WHERE segment = 'sgm';
UPDATE block_exercises SET segment = 'pot' WHERE segment = 'power';
UPDATE block_exercises SET segment = 'main' WHERE segment = 'strength';
UPDATE block_exercises SET segment = 'main' WHERE segment NOT IN ('raise', 'activation', 'mobilize', 'pot', 'main');

-- 已記錄的動作：能對回課表的，就跟著課表歸到正確板塊
UPDATE session_exercises SET segment = COALESCE((
  SELECT bx.segment FROM block_exercises bx
  JOIN sessions s ON s.id = session_exercises.session_id
  WHERE bx.block_id = s.block_id AND lower(bx.name) = lower(session_exercises.name)
  LIMIT 1), segment)
WHERE from_plan = 1;

CREATE INDEX IF NOT EXISTS idx_sx_seg ON session_exercises(session_id, segment, sort_order);
