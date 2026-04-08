-- =============================================
-- マスタテーブル作成 + 初期データ
-- Supabase SQL Editor で実行
-- =============================================

-- 作業内容マスタ
CREATE TABLE work_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('A', 'B')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 場所マスタ
CREATE TABLE location_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 品種マスタ
CREATE TABLE variety_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ロス理由マスタ
CREATE TABLE loss_reason_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  loss_type TEXT NOT NULL CHECK (loss_type IN ('discard', 'downgrade')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: authenticated 全許可
ALTER TABLE work_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE variety_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE loss_reason_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON work_master FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON location_master FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON variety_master FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON loss_reason_master FOR ALL USING (auth.role() = 'authenticated');

-- =============================================
-- 初期データ（constants.ts のハードコード値）
-- =============================================

-- 作業内容マスタ: カテゴリA（仕立て系）
INSERT INTO work_master (label, category, display_order) VALUES
  ('作り（直売）大', 'A', 1),
  ('作り（直売）ミディ', 'A', 2),
  ('作り（2番）', 'A', 3);

-- 作業内容マスタ: カテゴリB（その他）
INSERT INTO work_master (label, category, display_order) VALUES
  ('植え', 'B', 10),
  ('組み', 'B', 11),
  ('仮曲げ', 'B', 12),
  ('支柱立て', 'B', 13),
  ('出荷', 'B', 14),
  ('苔のせ', 'B', 15),
  ('潅水', 'B', 16),
  ('苗出し', 'B', 17),
  ('宅急便', 'B', 18),
  ('ラボ準備', 'B', 19),
  ('薬剤散布', 'B', 20),
  ('ピカク', 'B', 21),
  ('支柱曲げ', 'B', 22),
  ('その他', 'B', 99);

-- 場所マスタ
INSERT INTO location_master (label, display_order) VALUES
  ('直売', 1),
  ('2番温室', 2),
  ('3番温室', 3),
  ('4番温室', 4);

-- 品種マスタ
INSERT INTO variety_master (label, display_order) VALUES
  ('ベトナム バーク4寸', 1),
  ('タイ 3寸ロング', 2),
  ('台湾水苔 3.5寸', 3),
  ('タイ 3.8寸 スタンダード', 4),
  ('タイ 3.8寸 若苗', 5);

-- ロス理由マスタ: 破棄
INSERT INTO loss_reason_master (label, loss_type, display_order) VALUES
  ('病気', 'discard', 1),
  ('折れ', 'discard', 2),
  ('ねじれ', 'discard', 3),
  ('自然キズ', 'discard', 4),
  ('ぶつかり傷', 'discard', 5),
  ('その他', 'discard', 6);

-- ロス理由マスタ: B・C品
INSERT INTO loss_reason_master (label, loss_type, display_order) VALUES
  ('病気', 'downgrade', 1),
  ('折れ', 'downgrade', 2),
  ('ねじれ', 'downgrade', 3),
  ('自然キズ', 'downgrade', 4),
  ('ぶつかり傷', 'downgrade', 5),
  ('先止め', 'downgrade', 6);
