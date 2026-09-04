-- 訓練護照 v7：動作示範影片
-- 只存 YouTube 影片 ID（11 碼），縮圖與播放器都由 ID 推導，不下載也不自行截圖（那違反 YT 條款）
-- video_status: none 沒設 / pending 待搜尋 / suggested AI 找到待審 / ok 教練確認 / skip 這動作不用影片

ALTER TABLE exercise_catalog ADD COLUMN video_id TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise_catalog ADD COLUMN video_title TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise_catalog ADD COLUMN video_channel TEXT NOT NULL DEFAULT '';
ALTER TABLE exercise_catalog ADD COLUMN video_seconds INTEGER;
ALTER TABLE exercise_catalog ADD COLUMN video_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE exercise_catalog ADD COLUMN video_alts TEXT NOT NULL DEFAULT '[]';
ALTER TABLE exercise_catalog ADD COLUMN video_checked_on TEXT;

-- 既有動作全部排進待搜尋佇列
UPDATE exercise_catalog SET video_status = 'pending' WHERE is_library = 1 AND video_id = '';

CREATE INDEX IF NOT EXISTS idx_cat_video ON exercise_catalog(video_status, sort_order);
