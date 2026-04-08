# 座間洋ランセンター 開発TODO

## Phase 1: 基盤
- [ ] Supabase クライアント初期化 (`lib/supabase.ts`)
- [ ] 型定義 (`lib/types.ts`)
- [ ] マスタデータ定数 (`lib/constants.ts`)
- [ ] 認証ミドルウェア (`middleware.ts`)
- [ ] ログイン画面 (`/login`)

## Phase 2: 共通コンポーネント
- [ ] Tailwind設定（カラートークン追加）
- [ ] グローバルCSS（フォント、スライダー）
- [ ] Header（ロゴ + タブトグル + 時計）
- [ ] Chip（選択ボタン）
- [ ] SliderInput（時間/株数スライダー）
- [ ] SelectField（プルダウン）
- [ ] ConfirmModal（確認ダイアログ）
- [ ] SuccessOverlay（登録完了）
- [ ] Label（フォームラベル）

## Phase 3: 画面実装
- [ ] レイアウト (`layout.tsx` — 共通ヘッダー含む)
- [ ] 作業報告画面 (`/`)
- [ ] タイムカード画面 (`/timecard`)
- [ ] ロス報告画面 (`/loss`)

## Phase 4: 仕上げ
- [ ] 全画面動作確認
- [ ] Vercelデプロイ
