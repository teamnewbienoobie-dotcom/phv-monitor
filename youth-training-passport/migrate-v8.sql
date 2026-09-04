-- 訓練護照 v8：記下 AI 挑這支影片的理由，教練事後看得懂它為什麼這樣選
ALTER TABLE exercise_catalog ADD COLUMN video_reason TEXT NOT NULL DEFAULT '';
