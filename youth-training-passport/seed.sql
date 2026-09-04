-- 訓練護照 · 起始資料
-- 這份 seed 建立：1 位示範學員、4 個 mesocycle（2 個已結束、1 個進行中、1 個下一期）、
-- 3 堂示範訓練紀錄（可在教練模式刪除/替換成真實紀錄）、以及依 YPD 五分類草擬的動作起始清單。
-- 學員網址 slug 是隨機字串，之後要新增學員時比照 INSERT 一筆 athletes + 對應 mesocycle 即可。

INSERT INTO athletes (slug, nickname, avatar_initial) VALUES
  ('Ig9yNWU0sD23', '小翔', '翔');

INSERT INTO mesocycles (athlete_id, chapter_no, title, goal_text, start_date, end_date) VALUES
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'), 1, '基礎動作建立期',
   '建立基礎動作素養與身體覺察，熟悉暖身與伸展常規。', '2026-06-09', '2026-07-06'),
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'), 2, '肌力銜接期',
   '銜接自身體重訓練與基礎負重動作，建立蹲、推、拉、髖屈的動作模式。', '2026-07-07', '2026-08-17'),
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'), 3, '肌力發展期',
   '建立蹲舉、硬舉基礎動作模式，強化核心穩定度，為下一階段的爆發力訓練打好地基。', '2026-08-18', '2026-09-21'),
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'), 4, '爆發力啟動期',
   '以蹲跳與藥球擲遠等基礎爆發力訓練，銜接下一階段的速度與變向能力。', '2026-09-22', '2026-11-02');

INSERT INTO sessions (athlete_id, mesocycle_id, session_date, session_rpe, duration_min, coach_note)
VALUES
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'),
   (SELECT id FROM mesocycles WHERE athlete_id=(SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23') AND chapter_no=3),
   '2026-08-21', 5, 35, '今天精神很好，動作品質很穩定。'),
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'),
   (SELECT id FROM mesocycles WHERE athlete_id=(SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23') AND chapter_no=3),
   '2026-08-25', 7, 40, ''),
  ((SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23'),
   (SELECT id FROM mesocycles WHERE athlete_id=(SELECT id FROM athletes WHERE slug='Ig9yNWU0sD23') AND chapter_no=3),
   '2026-08-28', 6, 45, '蹲姿深度進步很多，膝蓋不再內夾了。');

INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'foundation', '動物爬行', NULL, NULL, 10, 1 FROM sessions s WHERE s.session_date='2026-08-21';
INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'strength', '彈力帶划船', 3, 12, 7, 2 FROM sessions s WHERE s.session_date='2026-08-21';
INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'recovery', '動態伸展', NULL, NULL, 10, 3 FROM sessions s WHERE s.session_date='2026-08-21';

INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'power', '跳箱', 4, 5, 8, 1 FROM sessions s WHERE s.session_date='2026-08-25';
INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'agility', '側併步', 3, NULL, 6, 2 FROM sessions s WHERE s.session_date='2026-08-25';
INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'foundation', '核心棒式', 3, NULL, 4, 3 FROM sessions s WHERE s.session_date='2026-08-25';

INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'strength', '高腳杯蹲', 3, 8, 8, 1 FROM sessions s WHERE s.session_date='2026-08-28';
INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'strength', '農夫走路', 3, NULL, 6, 2 FROM sessions s WHERE s.session_date='2026-08-28';
INSERT INTO exercises (session_id, category, name, sets, reps, duration_min, sort_order)
SELECT s.id, 'agility', '敏捷梯', NULL, NULL, 10, 3 FROM sessions s WHERE s.session_date='2026-08-28';

-- 動作起始清單（依 YPD 五分類草擬，教練輸入新名稱時會自動加入這份清單）
INSERT INTO exercise_catalog (category, name) VALUES
  ('foundation', '核心棒式'),
  ('foundation', '側棒式'),
  ('foundation', '動物爬行'),
  ('foundation', '熊爬'),
  ('foundation', '蟹步'),
  ('foundation', '前滾翻'),
  ('foundation', '單腳平衡站立'),
  ('foundation', '徒手深蹲'),
  ('foundation', '交叉爬行'),

  ('strength', '高腳杯蹲'),
  ('strength', '分腿蹲'),
  ('strength', '弓箭步'),
  ('strength', '伏地挺身'),
  ('strength', '彈力帶划船'),
  ('strength', '懸吊反向划船'),
  ('strength', '農夫走路'),
  ('strength', '死蟲式'),
  ('strength', '藥球旋轉丟擲'),

  ('power', '跳箱'),
  ('power', '立定跳遠'),
  ('power', '藥球胸前推擲'),
  ('power', '單腳跳'),
  ('power', '側向跳'),
  ('power', '深蹲跳'),
  ('power', '落地穩定跳'),
  ('power', '蛙跳'),

  ('agility', '敏捷梯'),
  ('agility', '高抬腿'),
  ('agility', '牆壁加速姿勢'),
  ('agility', '鏡子追逐'),
  ('agility', '8字繞跑'),
  ('agility', '側併步'),
  ('agility', '急停變向'),
  ('agility', '30公尺加速衝刺'),

  ('recovery', '動態伸展'),
  ('recovery', '靜態伸展'),
  ('recovery', '泡棉滾筒放鬆'),
  ('recovery', '呼吸訓練'),
  ('recovery', '低強度有氧'),
  ('recovery', '瑜伽流動'),
  ('recovery', '冷身走');
