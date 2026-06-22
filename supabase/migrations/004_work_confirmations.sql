-- =============================================
-- 作業確定ロック: work_confirmations テーブル
-- 従業員が「本日の作業はこれで確定」を宣言した記録。
-- (employee_id, confirmed_date) で一意 → 1人1日1確定。
-- 確定済みの当日分は入力・編集不可。解除は管理者のみ(admin画面)。
--
-- 追加のみ・既存テーブル不変 → 無害。冪等（再実行しても安全）。
-- Supabase ダッシュボード → SQL Editor で実行。
-- 適用順: 004 → 005 の順（004を先に）。
-- =============================================

CREATE TABLE IF NOT EXISTS work_confirmations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  confirmed_date DATE NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, confirmed_date)
);

-- RLS: authenticated 全許可（既存マスタ 002 と同じ社内ポリシー）
ALTER TABLE work_confirmations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON work_confirmations;
CREATE POLICY "auth_all" ON work_confirmations FOR ALL USING (auth.role() = 'authenticated');

-- 確認用（実行後）:
-- SELECT * FROM work_confirmations ORDER BY confirmed_date DESC;
