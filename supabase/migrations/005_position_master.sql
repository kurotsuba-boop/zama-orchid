-- =============================================
-- 作業区域マスタ: position_master テーブル
-- これまで constants.ts にハードコードしていた作業区域(POSITIONS)を
-- DBマスタ化し、管理画面から増減できるようにする。
-- ロス報告の作業区域選択(loss_reports.positions TEXT[])の保存形式は不変
-- （ラベル文字列の配列のまま）。
--
-- 追加のみ・既存テーブル不変 → 無害。冪等（再実行しても安全）。
-- Supabase ダッシュボード → SQL Editor で実行。
-- 適用順: 004 → 005 の順（005を後に）。
-- =============================================

CREATE TABLE IF NOT EXISTS position_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated 全許可（既存マスタ 002 と同じ社内ポリシー）
ALTER TABLE position_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON position_master;
CREATE POLICY "auth_all" ON position_master FOR ALL USING (auth.role() = 'authenticated');

-- 初期データ（同名が無いときだけ INSERT → 冪等）
INSERT INTO position_master (label, display_order)
SELECT v.label, v.display_order
FROM (VALUES
  ('支柱立', 1),
  ('仮曲げ', 2),
  ('組み',   3),
  ('その他', 4),
  ('植え',   5),
  ('作り',   6),
  ('ラボ',   7)
) AS v(label, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM position_master pm WHERE pm.label = v.label
);

-- 確認用（実行後）:
-- SELECT label, display_order, is_active FROM position_master ORDER BY display_order;
