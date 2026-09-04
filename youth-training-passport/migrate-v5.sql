-- 訓練護照 v5：把「以前打過但不在動作庫」的動作一起收進庫
-- 板塊與預設劑量從實際用過的紀錄推回來；推不出來就放主訓練，之後可在教練後台改

UPDATE exercise_catalog SET
  is_library = 1,
  family = '自訂動作',
  sort_order = 9000,
  segment = COALESCE(
    (SELECT sx.segment FROM session_exercises sx
      WHERE lower(sx.name) = lower(exercise_catalog.name) AND sx.category = exercise_catalog.category
      ORDER BY sx.id DESC LIMIT 1),
    (SELECT bx.segment FROM block_exercises bx
      WHERE lower(bx.name) = lower(exercise_catalog.name) AND bx.category = exercise_catalog.category
      LIMIT 1),
    'main'),
  def_sets = COALESCE(def_sets,
    (SELECT sx.sets FROM session_exercises sx
      WHERE lower(sx.name) = lower(exercise_catalog.name) AND sx.category = exercise_catalog.category AND sx.sets IS NOT NULL
      ORDER BY sx.id DESC LIMIT 1)),
  def_reps = CASE WHEN def_reps = '' THEN COALESCE(
    (SELECT sx.reps FROM session_exercises sx
      WHERE lower(sx.name) = lower(exercise_catalog.name) AND sx.category = exercise_catalog.category AND sx.reps <> ''
      ORDER BY sx.id DESC LIMIT 1), '') ELSE def_reps END
WHERE is_library = 0;
