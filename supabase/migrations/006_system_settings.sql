-- =============================================
-- システム設定: system_settings テーブル
-- key / value の汎用設定ストア。第一号は time_step_minutes
-- （作業報告「対応時間」入力の分刻み。'10' / '15' / '30'）。
-- value は TEXT。admin 設定画面「時間入力設定」から変更する。
--
-- 追加のみ・既存テーブル不変 → 無害。冪等（再実行しても安全）。
-- フロント側は未作成でも既定 10 分でフォールバックするため、
-- このSQL適用前にデプロイしても壊れない（適用後に設定変更が効くようになる）。
-- Supabase ダッシュボード → SQL Editor で実行。
-- =============================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated 全許可（既存マスタ 002 / 004 / 005 と同じ社内ポリシー）
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON system_settings;
CREATE POLICY "auth_all" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

-- 初期データ: time_step_minutes = 10（既に有れば触らない → 冪等）
INSERT INTO system_settings (key, value)
VALUES ('time_step_minutes', '10')
ON CONFLICT (key) DO NOTHING;

-- 確認用（実行後）:
-- SELECT * FROM system_settings;
