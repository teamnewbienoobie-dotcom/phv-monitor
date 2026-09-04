-- 訓練護照 v2 seed：比重表、RAMP 模板、Programme A/B 範本、A班、小翔示範資料

-- ---------- 階段目標比重（7 × 3） ----------
INSERT OR REPLACE INTO stage_targets (stage, category, target_pct, tolerance_pct) VALUES
  ('pre','fms',20,5),('pre','strength',20,5),('pre','power',10,5),('pre','plyo',10,5),('pre','saq',25,5),('pre','energy',5,5),('pre','mobility',10,5),
  ('circa','fms',10,5),('circa','strength',25,5),('circa','power',12,5),('circa','plyo',12,5),('circa','saq',20,5),('circa','energy',8,5),('circa','mobility',13,5),
  ('post','fms',5,5),('post','strength',30,5),('post','power',15,5),('post','plyo',15,5),('post','saq',18,5),('post','energy',12,5),('post','mobility',5,5);

-- ---------- RAMP 模板：ATHLETICS – SPRINTS ----------
INSERT INTO ramp_templates (id, name, focus, raise_min, am_min, pot_min) VALUES (1, 'Athletics – Sprints RAMP',
'[{"key":"rotation","label":"Rotation","levels":["Hip Roll","Supine Crucifix Crossover","Prone Crucifix Crossover"]},
 {"key":"glute","label":"Glute Activation","levels":["Glute Bridge Hold","Glute Bridge March","SL Glute Bridge"]},
 {"key":"hamstring","label":"Hamstring","levels":["Hamstring Bridge","SL Hamstring Bridging","Hamstring Walk Outs"]},
 {"key":"squat","label":"Squat Pattern","levels":["Full Squat","Squat to Press (MB)","MB Chest Throw"]},
 {"key":"core_hip","label":"Core + Hip ROM","levels":["Spiderman","Spiderman + Rotation","Spiderman + Push Up"]},
 {"key":"lunge","label":"Lunge","levels":["Lunge","Forward Walking Lunge","Reverse Walking Lunge"]},
 {"key":"push","label":"Push","levels":["Full Push Up","Push Up + Rotation","Spiderman Push Up"]},
 {"key":"single_leg","label":"Single Leg","levels":["1 Leg Balance (+skill)","1 Leg 1/2 Squat","1 Leg Running Man"]},
 {"key":"ankle","label":"Ankle","levels":["Ankle March","Ankle Skip","Ankle Bound"]}]', 5, 7, 5);

-- ---------- 範本 block：Programme A ----------
INSERT INTO blocks (id, owner_type, owner_id, title, goal_text, main_axis, intensity, weeks, ramp_template_id, raise_types, am_types, pot_types, sort_order)
VALUES (1, 'template', 0, 'Programme A · 肌力 6 週', 'RAMP → SGM → POWER → STRENGTH。建立六大基本動作模式與跳躍落地技術。', 'strength', 'low', 6, 1, '["sgm"]', '["dynamic_fms"]', '["low_plyo"]', 1);

INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order) VALUES
  (1,'sgm','Pursuit','Acceleration','saq','["✓","","","","",""]',1),
  (1,'sgm','Rats & Rabbits (Side)','Directional Step','saq','["","✓","","","",""]',2),
  (1,'sgm','Rats & Rabbits (Back)','Hip Turn','saq','["","","✓","","",""]',3),
  (1,'sgm','Shake & Bake','Shuffle & Cut','saq','["","","","✓","",""]',4),
  (1,'sgm','Gauntlet','Cutting','saq','["","","","","✓",""]',5),
  (1,'sgm','Figure 8 Chase','Curve Running','saq','["","","","","","✓"]',6),
  (1,'power','Jump to Box (~30cm)','','power','["2x4","2x5","2x6","","",""]',1),
  (1,'power','Land from Box (~30cm)','','power','["2x4","2x5","2x6","","",""]',2),
  (1,'power','Squat Jump Freeze','','power','["","2x5","2x6","2x5","3x4","3x5"]',3),
  (1,'power','Leap In-Place','','plyo','["","","","2x3/leg","3x3/leg","3x4/leg"]',4),
  (1,'power','Hop In-Place','','plyo','["","","","2x3/leg","3x3/leg","3x4/leg"]',5),
  (1,'strength','Kettlebell Deadlift','','strength','["1-2x12","2x12","2x15","2x15","3x10","3x12"]',1),
  (1,'strength','Incline Press Up','','strength','["1-2x12","2x8","2x10","2x12","3x10","3x12"]',2),
  (1,'strength','Split Squat','','strength','["1-2x12","2x8/leg","2x10/leg","2x12/leg","3x10/leg","3x12/leg"]',3),
  (1,'strength','45-degree TRX Row','','strength','["1-2x12","2x8","2x10","2x12","3x10","3x12"]',4),
  (1,'strength','Plank Variations','','strength','["2x15sec","2x20sec","2x25sec","2x30sec","3x25sec","3x30sec"]',5);

-- ---------- 範本 block：Programme B ----------
INSERT INTO blocks (id, owner_type, owner_id, title, goal_text, main_axis, intensity, weeks, ramp_template_id, raise_types, am_types, pot_types, sort_order)
VALUES (2, 'template', 0, 'Programme B · 肌力 6 週', 'RAMP → SGM → POWER → STRENGTH。與 A 平行，肌力動作替換。', 'strength', 'low', 6, 1, '["sgm"]', '["dynamic_fms"]', '["low_plyo"]', 2);

INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order) VALUES
  (2,'sgm','Pursuit','Acceleration','saq','["✓","","","","",""]',1),
  (2,'sgm','Rats & Rabbits (Side)','Directional Step','saq','["","✓","","","",""]',2),
  (2,'sgm','Rats & Rabbits (Back)','Hip Turn','saq','["","","✓","","",""]',3),
  (2,'sgm','Shake & Bake','Shuffle & Cut','saq','["","","","✓","",""]',4),
  (2,'sgm','Gauntlet','Cutting','saq','["","","","","✓",""]',5),
  (2,'sgm','Figure 8 Chase','Curve Running','saq','["","","","","","✓"]',6),
  (2,'power','Jump to Box (~30cm)','','power','["2x4","2x5","2x6","","",""]',1),
  (2,'power','Land from Box (~30cm)','','power','["2x4","2x5","2x6","","",""]',2),
  (2,'power','Squat Jump Freeze','','power','["","2x5","2x6","2x5","3x4","3x5"]',3),
  (2,'power','Leap In-Place','','plyo','["","","","2x3/leg","3x3/leg","3x4/leg"]',4),
  (2,'power','Hop In-Place','','plyo','["","","","2x3/leg","3x3/leg","3x4/leg"]',5),
  (2,'strength','Prisoner Squat','','strength','["1-2x12","2x12","2x15","2x15","3x10","3x12"]',1),
  (2,'strength','Kneeling Overhead Press','','strength','["1-2x12","2x8","2x10","2x15","3x10","3x12"]',2),
  (2,'strength','Band-Resisted Kneeling Hinge','','strength','["1-2x12","2x8","2x10","2x15","3x10/leg","3x12/leg"]',3),
  (2,'strength','45-degree TRX Row','','strength','["1-2x12","2x8","2x10","2x15","3x10","3x12"]',4),
  (2,'strength','Abdominal Crunch','','strength','["2x15sec","2x20sec","2x25sec","2x30sec","3x25sec","3x30sec"]',5),
  (2,'strength','Torso Raise','','strength','["2x15sec","2x20sec","2x25sec","2x30sec","3x25sec","3x30sec"]',6);

-- ---------- 範本 block：Athletics Sprints（速度主軸） ----------
INSERT INTO blocks (id, owner_type, owner_id, title, goal_text, main_axis, intensity, weeks, ramp_template_id, raise_types, am_types, pot_types, sort_order)
VALUES (3, 'template', 0, 'Athletics – Sprints · 線性加速 4 週', 'RAMP → 衝刺技術 → 漸進衝刺；收尾 45° cut。', 'saq', 'mid', 4, 1, '["locomotion"]', '["dynamic_fms"]', '["short_accel","low_plyo"]', 3);

INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order) VALUES
  (3,'main','Wall Drill – Single Exchange','Acceleration','saq','["x5/leg","x5/leg","x6/leg","x6/leg","",""]',1),
  (3,'main','A-March / A-Skip','Acceleration','saq','["2x10m","2x15m","2x15m","2x20m","",""]',2),
  (3,'main','Standing Long Jump','Acceleration','plyo','["2x3","2x4","2x5","2x5","",""]',3),
  (3,'main','Startle Starts','Acceleration','saq','["3x20m","3x20m","4x20m","4x20m","",""]',4),
  (3,'main','Build + GO (20m+20m)','Max Velocity','saq','["","2x40m","3x40m","3x40m","",""]',5),
  (3,'main','45° Cut','Cutting','saq','["4次/側","4次/側","6次/側","6次/側","",""]',6);

-- ---------- 訓練組與學員 ----------
INSERT INTO groups (id, name, notes) VALUES (1, 'A班', '9–12 歲 PHV 前，週二／週五');

UPDATE athletes SET sex = 'M', birth_year = 2019, stage = 'pre', stage_started_on = '2026-08-01', group_id = 1
WHERE public_id = 'Ig9yNWU0sD23';

-- ---------- A班 目前 block（從 Programme A 複製） ----------
INSERT INTO seasons (id, owner_type, owner_id, title, goal_text, start_date, end_date)
VALUES (1, 'group', 1, '2026 秋季', '建立六大動作模式、學會安全落地、把加速姿勢練成習慣', '2026-08-24', '2026-12-13');

INSERT INTO blocks (id, owner_type, owner_id, season_id, title, goal_text, main_axis, intensity, weeks, start_date, end_date, ramp_template_id, raise_types, am_types, pot_types, sort_order)
VALUES (10, 'group', 1, 1, 'Block 1 · 肌力基礎（Programme A）', '徒手與壺鈴基本動作；每週一場 SGM 遊戲學一個變向動作', 'strength', 'low', 6, '2026-08-24', '2026-10-04', 1, '["sgm"]', '["dynamic_fms"]', '["low_plyo"]', 1);

INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order)
SELECT 10, segment, name, target_movement, category, doses, sort_order FROM block_exercises WHERE block_id = 1;

INSERT INTO blocks (id, owner_type, owner_id, season_id, title, goal_text, main_axis, intensity, weeks, start_date, end_date, ramp_template_id, raise_types, am_types, pot_types, sort_order)
VALUES (11, 'group', 1, 1, 'Block 2 · 線性加速（Sprints）', '加速姿勢、手臂擺動、45° cut', 'saq', 'mid', 4, '2026-10-05', '2026-11-01', 1, '["locomotion"]', '["dynamic_fms"]', '["short_accel","low_plyo"]', 2);

INSERT INTO block_exercises (block_id, segment, name, target_movement, category, doses, sort_order)
SELECT 11, segment, name, target_movement, category, doses, sort_order FROM block_exercises WHERE block_id = 3;

-- ---------- 小翔示範 sessions ----------
INSERT INTO sessions (id, athlete_id, block_id, session_date, week_no, main_axis, duration_min, raise_min, am_min, pot_min, main_min, raise_types, am_types, pot_types, session_rpe, coach_note, source)
SELECT 101, id, 10, '2026-08-25', 1, 'strength', 50, 5, 7, 5, 33, '["sgm"]', '["dynamic_fms"]', '["low_plyo"]', 5, '第一堂，Pursuit 玩得很投入；壺鈴硬舉背部保持得不錯', 'app' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';
INSERT INTO sessions (id, athlete_id, block_id, session_date, week_no, main_axis, duration_min, raise_min, am_min, pot_min, main_min, raise_types, am_types, pot_types, session_rpe, coach_note, source)
SELECT 102, id, 10, '2026-08-28', 1, 'strength', 55, 5, 7, 8, 35, '["animal_flow"]', '["dynamic_fms"]', '["low_plyo","iso_hold"]', 6, 'Potentiation 多加了棒式撐住 20 秒', 'app' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';
INSERT INTO sessions (id, athlete_id, block_id, session_date, week_no, main_axis, duration_min, raise_min, am_min, pot_min, main_min, raise_types, am_types, pot_types, session_rpe, coach_note, source)
SELECT 103, id, 10, '2026-09-01', 2, 'strength', 50, 5, 7, 5, 33, '["sgm"]', '["dynamic_fms"]', '["explosive_jump"]', 6, '', 'app' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';

INSERT INTO session_exercises (session_id, name, dose, load_kg, category, target_movement, sort_order, from_plan) VALUES
  (101,'Pursuit','',NULL,'saq','Acceleration',1,1),
  (101,'Jump to Box (~30cm)','2x4',NULL,'power','',2,1),
  (101,'Land from Box (~30cm)','2x4',NULL,'power','',3,1),
  (101,'Kettlebell Deadlift','1-2x12',8,'strength','',4,1),
  (101,'Incline Press Up','1-2x12',NULL,'strength','',5,1),
  (101,'Split Squat','1-2x12',NULL,'strength','',6,1),
  (101,'45-degree TRX Row','1-2x12',NULL,'strength','',7,1),
  (101,'Plank Variations','2x15sec',NULL,'strength','',8,1),
  (102,'Jump to Box (~30cm)','2x4',NULL,'power','',1,1),
  (102,'Land from Box (~30cm)','2x4',NULL,'power','',2,1),
  (102,'Kettlebell Deadlift','2x12',8,'strength','',3,1),
  (102,'Incline Press Up','2x10',NULL,'strength','',4,1),
  (102,'Split Squat','2x8/leg',NULL,'strength','',5,1),
  (102,'45-degree TRX Row','2x8',NULL,'strength','',6,1),
  (102,'Plank Variations','2x20sec',NULL,'strength','',7,1),
  (103,'Rats & Rabbits (Side)','',NULL,'saq','Directional Step',1,1),
  (103,'Jump to Box (~30cm)','2x5',NULL,'power','',2,1),
  (103,'Land from Box (~30cm)','2x5',NULL,'power','',3,1),
  (103,'Squat Jump Freeze','2x5',NULL,'power','',4,1),
  (103,'Kettlebell Deadlift','2x12',10,'strength','',5,1),
  (103,'Incline Press Up','2x8',NULL,'strength','',6,1),
  (103,'Split Squat','2x8/leg',NULL,'strength','',7,1),
  (103,'45-degree TRX Row','2x8',NULL,'strength','',8,1),
  (103,'Plank Variations','2x20sec',NULL,'strength','',9,1);

-- ---------- 動作庫 ----------
INSERT OR IGNORE INTO exercise_catalog (category, name, use_count)
SELECT category, name, 1 FROM block_exercises WHERE block_id IN (1,2,3);

-- ---------- Focus 等級、突破構件、成長紀錄 ----------
INSERT INTO focus_levels (athlete_id, focus_key, level, achieved_on)
SELECT id, 'squat', 1, '2026-08-25' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';
INSERT INTO focus_levels (athlete_id, focus_key, level, achieved_on)
SELECT id, 'squat', 2, '2026-09-01' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';
INSERT INTO focus_levels (athlete_id, focus_key, level, achieved_on)
SELECT id, 'glute', 1, '2026-08-25' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';
INSERT INTO focus_levels (athlete_id, focus_key, level, achieved_on)
SELECT id, 'ankle', 1, '2026-08-25' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';

INSERT INTO turning_blocks (athlete_id, tier, reason_type, sentence, granted_on)
SELECT id, 'silver', 'level_up', 'Squat Pattern 升到 Level 2：藥球深蹲推舉一次到位', '2026-09-01' FROM athletes WHERE public_id = 'Ig9yNWU0sD23';

INSERT INTO growth_log (athlete_id, measured_on, height_cm, weight_kg)
SELECT id, '2026-08-24', 122.5, 23.8 FROM athletes WHERE public_id = 'Ig9yNWU0sD23';
