-- 訓練護照 v6
-- (1) 學員頭像：內建 5 款或自己上傳
-- (2) block 升級成「中期目標」：4–6 週的訓練方向，教練選定後教練與學員都看得到
--     一般能力發展（無專項）或比賽週期化（準備期→強化期→爆發期→減量→恢復）

ALTER TABLE athletes ADD COLUMN avatar TEXT NOT NULL DEFAULT '';

ALTER TABLE blocks ADD COLUMN goal_kind TEXT NOT NULL DEFAULT 'general';  -- general / competition
ALTER TABLE blocks ADD COLUMN phase TEXT NOT NULL DEFAULT '';             -- 比賽期別
ALTER TABLE blocks ADD COLUMN emphasis TEXT NOT NULL DEFAULT '{}';        -- JSON {分類: 百分比}；空＝沿用階段建議值
ALTER TABLE blocks ADD COLUMN goal_template_id INTEGER;

-- ---------- 中期目標範本（教練可自訂） ----------
CREATE TABLE IF NOT EXISTS goal_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'general',
  phase TEXT NOT NULL DEFAULT '',
  weeks INTEGER NOT NULL DEFAULT 6,
  main_axis TEXT NOT NULL DEFAULT 'strength',
  emphasis TEXT NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT '',
  is_builtin INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO goal_templates (id, name, kind, phase, weeks, main_axis, emphasis, note, is_builtin, sort_order) VALUES
 (1,'提升速度與敏捷','general','',6,'saq',
  '{"fms":15,"strength":13,"power":12,"plyo":15,"saq":35,"energy":2,"mobility":8}',
  '沒有專項與賽事需求的孩子：把時間押在跑動、變向與落地控制。',1,1),
 (2,'建立肌力基礎','general','',6,'strength',
  '{"fms":18,"strength":35,"power":12,"plyo":10,"saq":15,"energy":2,"mobility":8}',
  '徒手與低負荷把六大動作模式練穩，肌力吃掉三分之一時間。',1,2),
 (3,'動作品質與活動度','general','',4,'strength',
  '{"fms":30,"strength":18,"power":3,"plyo":7,"saq":15,"energy":2,"mobility":25}',
  '生長期 ROM 受限、動作跑掉時用這個把底盤修回來。',1,3),
 (4,'爆發力與彈性','general','',6,'power',
  '{"fms":7,"strength":20,"power":25,"plyo":25,"saq":18,"energy":2,"mobility":3}',
  '跳躍落地與增強式為主，需要先有肌力基礎再進。',1,4),
 (5,'體能與恢復力','general','',4,'energy',
  '{"fms":8,"strength":18,"power":8,"plyo":10,"saq":22,"energy":30,"mobility":4}',
  '賽季前把可重複衝刺的底子墊起來。',1,5),
 (6,'準備期（賽前 12–9 週）','competition','prep',4,'strength',
  '{"fms":15,"strength":30,"power":7,"plyo":10,"saq":15,"energy":18,"mobility":5}',
  '量大強度低：肌力與能量系統打底，技術動作重新校正。',1,11),
 (7,'專項強化期（賽前 8–5 週）','competition','build',4,'strength',
  '{"fms":5,"strength":25,"power":18,"plyo":15,"saq":22,"energy":10,"mobility":5}',
  '肌力轉換成速度與爆發，開始加入專項情境。',1,12),
 (8,'爆發期（賽前 4–2 週）','competition','peak',3,'power',
  '{"fms":3,"strength":15,"power":28,"plyo":20,"saq":28,"energy":4,"mobility":2}',
  '強度最高、量下降：最大速度與爆發輸出。',1,13),
 (9,'賽前減量（賽前 1 週）','competition','taper',1,'saq',
  '{"fms":5,"strength":15,"power":25,"plyo":15,"saq":30,"energy":2,"mobility":8}',
  '維持刺激、砍掉疲勞：短、快、少量。',1,14),
 (10,'賽後恢復','competition','recovery',2,'strength',
  '{"fms":28,"strength":18,"power":2,"plyo":4,"saq":10,"energy":8,"mobility":30}',
  '活動度與動作品質為主，讓身體回到基準線。',1,15);

-- 既有 block 沿用主軸推一個合理的目標比重（空著就會用階段建議值，不強制）
UPDATE blocks SET goal_kind = 'general' WHERE goal_kind = '';
