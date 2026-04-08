# 座間洋ランセンター 作業管理システム

## 概要
洋ラン栽培農場の従業員向け作業記録・ロス管理・出退勤Webアプリ。
iPad横画面キオスク設置前提。

## 技術スタック
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS)
- Vercel デプロイ

## ディレクトリ構造（重要ファイルのみ）
- src/app/page.tsx — 作業報告（TOP）
- src/app/loss/page.tsx — ロス報告
- src/app/timecard/page.tsx — タイムカード
- src/app/analytics/page.tsx — 分析ダッシュボード
- src/app/admin/page.tsx — 管理画面
- src/app/login/page.tsx — ログイン
- src/components/ — 共通コンポーネント
- src/hooks/ — カスタムフック
- src/lib/supabase.ts — Supabaseクライアント
- src/lib/constants.ts — マスタデータ定数（温室・ポジションのみ使用）
- src/lib/types.ts — 型定義
- src/lib/analytics.ts — 分析用クエリ
- src/middleware.ts — 認証ミドルウェア

## 絶対に守ること

### Tailwind CSS（最重要 — 過去に何度も壊れた実績あり）
- globals.css の先頭3行（@tailwind base/components/utilities）は絶対に消さない・移動しない
- globals.css に @import url(...) を書かない（フォントは layout.tsx の <link> で読み込む）
- postcss.config.mjs を変更しない（plugins は tailwindcss のみ）
- tailwind.config.ts の content パスを変更しない
- autoprefixer は追加しない（既にdevDependenciesにあるが postcss.config には入れない）

### ビルド確認
- コード変更後は必ず npm run dev でビルドが通ることを確認してから完了報告する
- ビルドが通ってもスタイルが効かない報告があったら rm -rf .next して dev 再起動

### 変更管理
- 1ファイル変更 → 報告 → 承認 → 次のファイル
- 型定義（types.ts）は触る前に確認を取る
- package.json の変更は事前承認必須

## DB構成（Supabase）
### テーブル
- employees — 従業員マスタ
- work_reports — 作業報告
- loss_reports — ロス報告ヘッダー
- loss_report_items — ロス報告明細
- timecards — タイムカード
- work_master — 作業内容マスタ
- location_master — 場所マスタ
- variety_master — 品種マスタ
- loss_reason_master — ロス理由マスタ

### RLS
- 全テーブル authenticated 全許可（社内用）

## UI方針
- iPad横画面キオスクUI
- 白ベース × ゴールド(#b8963e) × グレー(#6b7280)
- タッチターゲット最低44px
- フォント: Noto Sans JP + DM Mono

## 過去のデグレ履歴
- 2026/04: globals.css に @import url() を @tailwind の後に書いてTailwind CSS が壊れた
- 2026/04: postcss.config.mjs に autoprefixer を追加して未インストールエラー
- 2026/04: .next キャッシュ破損でスタイルが適用されない問題が複数回発生
