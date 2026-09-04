-- 訓練護照 v4：動作庫（可在排課時挑選）
-- exercise_catalog 從「用過的名字」升級成「有分級、有預設劑量、有板塊歸屬」的動作庫

ALTER TABLE exercise_catalog ADD COLUMN segment TEXT NOT NULL DEFAULT 'main';
ALTER TABLE exercise_catalog ADD COLUMN family TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise_catalog ADD COLUMN level INTEGER;
ALTER TABLE exercise_catalog ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise_catalog ADD COLUMN def_sets INTEGER;
ALTER TABLE exercise_catalog ADD COLUMN def_reps TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise_catalog ADD COLUMN is_library INTEGER NOT NULL DEFAULT 0;
ALTER TABLE exercise_catalog ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cat_lib ON exercise_catalog(is_library, segment, sort_order);
