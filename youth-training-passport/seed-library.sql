-- 訓練護照 · 動作庫（菜逼爸常用動作，取自 LTAD Network 教材與自編課表）
-- 欄位：category 能力分類 / segment 預設板塊 / family 動作家族 / level 分級 / def_sets 預設組數 / def_reps 預設次數
-- 重跑安全：同 (category,name) 會更新內容、保留 use_count

INSERT INTO exercise_catalog (category, name, segment, family, level, note, def_sets, def_reps, is_library, sort_order, use_count) VALUES
-- ===== 速度敏捷遊戲（SGM）｜Raise =====
('saq','Pursuit','raise','速度敏捷遊戲',NULL,'換對手、變換起跑位置',2,'3ES (10-15m)',1,101,0),
('saq','Shake & Bake','raise','速度敏捷遊戲',NULL,'攻守對抗，三戰兩勝',2,'3 (5-10m)',1,102,0),
('saq','Gauntlet','raise','速度敏捷遊戲',NULL,'攻守對抗',2,'5 (20m)',1,103,0),
('saq','Seaweed','raise','速度敏捷遊戲',NULL,'攻守對抗，移動信號',1,'5 (20-30m)',1,104,0),
('saq','Sharks & Fish','raise','速度敏捷遊戲',NULL,'攻守對抗，移動信號',2,'3 (20-30m)',1,105,0),
('saq','Separate & Devastate','raise','速度敏捷遊戲',NULL,'必須面向圓心，強迫後退步',2,'3 (5-10m)',1,106,0),
('saq','Follow The Leader (Box)','raise','速度敏捷遊戲',NULL,'必須面向前方，強迫後退步',2,'2 (4m x 4m)',1,107,0),
('saq','Rats & Rabbits (Side)','raise','速度敏捷遊戲',NULL,'目標動作：方向步',2,'3ES',1,108,0),
('saq','Rats & Rabbits (Back)','raise','速度敏捷遊戲',NULL,'目標動作：轉髖',2,'3ES',1,109,0),
('saq','Figure 8 Chase','raise','速度敏捷遊戲',NULL,'目標動作：弧線跑',2,'3ES',1,110,0),
('saq','Lateral Mirror (Tracking)','raise','速度敏捷遊戲',NULL,'反應式追蹤，移動觸發',1,'3 (3-5m)',1,111,0),

-- ===== 加速 =====
('saq','Fall & Go','main','加速',NULL,'',1,'4 (10m)',1,201,0),
('saq','Acceleration (Ready Position)','main','加速',NULL,'減速至弓箭步停',1,'2ES (10m)',1,202,0),
('saq','Acceleration (Staggered)','main','加速',NULL,'兩點起跑，減速至側向停',1,'3ES (10m)',1,203,0),
('saq','Acceleration (Square)','main','加速',NULL,'由準備姿勢加速',2,'3 (10m)',1,204,0),
('saq','Acceleration (From Floor)','main','加速',NULL,'',1,'4 (10m)',1,205,0),
('saq','Acceleration (3 Point Start)','main','加速',NULL,'',1,'4 (15m)',1,206,0),
('saq','Acceleration to Back Pedal','main','加速',NULL,'減速至弓箭步停；開放式可用教練口令',1,'3ES (5-8m 進出)',1,207,0),
('saq','Back Pedal to Acceleration','main','加速',NULL,'減速至反向弓箭步停',1,'3ES (5-8m 進出)',1,208,0),

-- ===== 減速與後退 =====
('saq','Back Pedal','main','減速與後退',NULL,'減速至反向弓箭步停',1,'3ES (3m)',1,301,0),
('saq','Back Track Jockey','main','減速與後退',NULL,'後退移動導入 drop step 與 shuffle',1,'4 (10m)',1,302,0),
('saq','Directional Step','main','減速與後退',NULL,'手勢信號決定方向',1,'3ES (10m)',1,303,0),

-- ===== 橫向與切入 =====
('saq','Lateral Shuffle','main','橫向與切入',NULL,'教練手勢決定方向，於錐筒停住',1,'3ES (20-30m)',1,401,0),
('saq','Lateral Shuffle & Stick','main','橫向與切入',NULL,'專注「待在管道裡」',1,'3ES (3m)',1,402,0),
('saq','Crossover Step','main','橫向與切入',NULL,'教練手勢決定方向',1,'3ES (3-15m)',1,403,0),
('saq','Crossover Run','main','橫向與切入',NULL,'減速回準備姿勢',1,'3ES (10-15m)',1,404,0),
('saq','Lateral Shuffle into Sprint','main','橫向與切入',NULL,'方向步接衝刺',1,'3ES (5m + 10m)',1,405,0),
('saq','Lazy S-Line','main','橫向與切入',NULL,'變換跑動路線，深淺弧度都做',1,'4 (20-30m)',1,406,0),
('saq','Speed Cut','main','橫向與切入',NULL,'角度小於 45 度，通過錐筒維持速度',1,'3ES (10m 進 10m 出)',1,407,0),

-- ===== 技術鑽練｜加速 =====
('saq','Wall Drill Holds','main','技術鑽練｜加速',1,'維持體線（頭到腳跟）與骨盆中立',2,'10-20 秒',1,501,0),
('saq','Wall Drill (Single Exchange)','main','技術鑽練｜加速',2,'前側：高抬膝＋勾腳背',2,'6 每側',1,502,0),
('saq','Wall Drill (Double Exchange)','main','技術鑽練｜加速',3,'後側：向下向後扒地',2,'6',1,503,0),
('saq','Walking A','main','技術鑽練｜加速',1,'',2,'10m',1,504,0),
('saq','Marching A','main','技術鑽練｜加速',2,'',3,'10m',1,505,0),
('saq','Skipping A','main','技術鑽練｜加速',3,'',3,'10m',1,506,0),
('saq','A-March into A-Skip','main','技術鑽練｜加速',4,'可加阻力帶',3,'5m + 10m',1,507,0),

-- ===== 技術鑽練｜最大速度 =====
('saq','Wall Drill: Isometric Holds','main','技術鑽練｜最大速度',1,'維持高髖、骨盆中立',3,'10-15 秒',1,521,0),
('saq','Wall Drill: Strike & Recover','main','技術鑽練｜最大速度',2,'腳掌在重心正下方向下向後',2,'8 / 腳',1,522,0),
('saq','Wall Drill: Full Cycle','main','技術鑽練｜最大速度',3,'循環動作，過膝再落地',2,'8 / 腳',1,523,0),
('saq','Straight Leg March','main','技術鑽練｜最大速度',1,'',2,'10m',1,524,0),
('saq','Straight Leg Skip','main','技術鑽練｜最大速度',2,'',3,'10m',1,525,0),
('saq','Straight Leg Bound','main','技術鑽練｜最大速度',3,'',3,'10m',1,526,0),

-- ===== 最大速度跑 =====
('saq','Wicket Runs','main','最大速度跑',NULL,'技術重點：前側力學；恢復 1-2 分',4,'20-30m',1,541,0),
('saq','Build & Go','main','最大速度跑',NULL,'20m 加速帶入；>95% 最大速度；恢復 2-3 分',4,'20-30m',1,542,0),
('saq','Sprint – Float – Sprint','main','最大速度跑',NULL,'20m 衝 + 10m float + 20m 衝；恢復 >3 分',4,'20m+10m+20m',1,543,0),
('energy','High Speed Volume 檢核','main','最大速度跑',NULL,'第 1-3 週 160/180/200m，第 4-6 週 240m',NULL,'',1,544,0)
ON CONFLICT(category, name) DO UPDATE SET
  segment=excluded.segment, family=excluded.family, level=excluded.level, note=excluded.note,
  def_sets=excluded.def_sets, def_reps=excluded.def_reps, is_library=1, sort_order=excluded.sort_order;

INSERT INTO exercise_catalog (category, name, segment, family, level, note, def_sets, def_reps, is_library, sort_order, use_count) VALUES
-- ===== 跳躍落地 A｜慢 SSC、原地、雙腳為主 =====
('power','Jump To Box','pot','跳躍落地 A · 原地雙腳',1,'單次起跳／落地，原地',2,'4-6',1,601,0),
('power','Altitude Landing','pot','跳躍落地 A · 原地雙腳',1,'只練落地吸震',2,'4-6',1,602,0),
('power','Squat Jump Freeze','pot','跳躍落地 A · 原地雙腳',1,'落地定住三秒',2,'4-6',1,603,0),
('plyo','Leap In Place','pot','跳躍落地 A · 原地雙腳',1,'單腳換腳，原地',2,'3-4 / 腳',1,604,0),
('plyo','Hop In Place','pot','跳躍落地 A · 原地雙腳',1,'單腳同腳，原地',2,'3-4 / 腳',1,605,0),

-- ===== 跳躍落地 B｜水平位移、雙腳與單腳 =====
('power','Repeat Squat Jump','pot','跳躍落地 B · 水平位移',2,'連續起跳',2,'5',1,611,0),
('power','Broad Jump & Stick','pot','跳躍落地 B · 水平位移',2,'立定跳遠，落地定住',2,'3-5',1,612,0),
('power','1-2 Jump & Stick','pot','跳躍落地 B · 水平位移',2,'雙腳起跳、單腳落地',2,'3 / 腳',1,613,0),
('power','2-1 Jump & Stick','pot','跳躍落地 B · 水平位移',2,'單腳起跳、雙腳落地',2,'3 / 腳',1,614,0),
('plyo','Linear Leap & Stick','pot','跳躍落地 B · 水平位移',2,'',2,'3 / 腳',1,615,0),
('plyo','Linear Hop & Stick','pot','跳躍落地 B · 水平位移',2,'',2,'3 / 腳',1,616,0),

-- ===== 跳躍落地 C｜多平面、單腳為主 =====
('power','Backwards Jump','pot','跳躍落地 C · 多平面單腳',3,'',2,'3-5',1,621,0),
('plyo','Lateral Leap & Stick','pot','跳躍落地 C · 多平面單腳',3,'',2,'3 / 邊',1,622,0),
('plyo','Diagonal Leap & Stick','pot','跳躍落地 C · 多平面單腳',3,'',2,'3 / 邊',1,623,0),
('plyo','Rotational Leap 90-180°','pot','跳躍落地 C · 多平面單腳',3,'',2,'3 / 邊',1,624,0),
('plyo','Lateral Hop & Stick','pot','跳躍落地 C · 多平面單腳',3,'左右腳都做',2,'3 / 腳',1,625,0),
('plyo','Medial Hop & Stick','pot','跳躍落地 C · 多平面單腳',3,'左右腳都做',2,'3 / 腳',1,626,0),

-- ===== FMS 地板熱身 =====
('mobility','Happy Cat & Angry Cat','mobilize','地板熱身｜脊椎',1,'',1,'10',1,701,0),
('mobility','Cat, Caterpillar, Cobra','mobilize','地板熱身｜脊椎',2,'',1,'10',1,702,0),
('fms','Glute Bridge','activation','地板熱身｜臀橋',1,'',1,'10',1,711,0),
('fms','Knee Pull To Bridge','activation','地板熱身｜臀橋',2,'',1,'10',1,712,0),
('mobility','Rock to Squat','mobilize','地板熱身｜臀橋',3,'',1,'10',1,713,0),
('fms','Slow Tempo Squat','activation','地板熱身｜深蹲',1,'',1,'10-12',1,721,0),
('mobility','Spiderman','mobilize','地板熱身｜髖',1,'',1,'5 / 邊',1,731,0),
('mobility','Spiderman + Rotation','mobilize','地板熱身｜髖',2,'',1,'6 / 邊',1,732,0),
('mobility','Spiderman + Elbow Drive','mobilize','地板熱身｜髖',3,'停三秒',1,'6 / 邊',1,733,0),
('mobility','Low Squat Walk','mobilize','地板熱身｜髖',3,'',1,'10m',1,734,0),
('mobility','Gorilla Squat & Hold','mobilize','地板熱身｜蹲走',1,'',1,'20-30 秒',1,741,0),
('mobility','Gorilla Squat to Walk Out','mobilize','地板熱身｜蹲走',2,'',1,'10',1,742,0),
('fms','Duck Walk','mobilize','地板熱身｜蹲走',3,'',1,'10m',1,743,0),
('fms','Hand Walk Out','mobilize','地板熱身｜手走',1,'',1,'10',1,751,0),
('fms','Inchworm','mobilize','地板熱身｜手走',2,'',1,'10',1,752,0),
('fms','Bear Crawl','mobilize','地板熱身｜手走',3,'',1,'10m',1,753,0),
('fms','Reverse Bridge & Reach','activation','地板熱身｜反向支撐',1,'',1,'5 / 邊',1,761,0),
('fms','Crab Walk','activation','地板熱身｜反向支撐',2,'',1,'10m',1,762,0),
('fms','Hand Transfer (Lateral)','activation','地板熱身｜反向支撐',3,'左右都帶',1,'10m',1,763,0)
ON CONFLICT(category, name) DO UPDATE SET
  segment=excluded.segment, family=excluded.family, level=excluded.level, note=excluded.note,
  def_sets=excluded.def_sets, def_reps=excluded.def_reps, is_library=1, sort_order=excluded.sort_order;
