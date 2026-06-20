-- =============================================
-- 作業報告: 種類別個数カラム追加（宅急便 / ラボ準備）
-- 宅急便  = ミディ(count_midi) + 大輪(count_orin)
-- ラボ準備 = ミディ(count_midi) + その他(count_other)
--
-- 追加のみ・すべて NULL 許容 → 既存レコードは全部 NULL になるだけで無害。
-- Supabase ダッシュボード → SQL Editor で実行。冪等（再実行しても安全）。
-- =============================================

ALTER TABLE work_reports
  ADD COLUMN IF NOT EXISTS count_midi  integer,  -- ミディ（宅急便・ラボ準備 共通）
  ADD COLUMN IF NOT EXISTS count_orin  integer,  -- 大輪（宅急便）
  ADD COLUMN IF NOT EXISTS count_other integer;  -- その他（ラボ準備）

-- 確認用（実行後、3列が存在することを確認）:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'work_reports'
--   AND column_name IN ('count_midi','count_orin','count_other');
