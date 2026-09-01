# 相談用PDF出力とGitHub Pagesデプロイ

日付:2026-09-01

## プロンプト本文

> お願いします

(前ターンで提案した「相談用PDF出力(Sprint 7)とGitHub Pagesへのデプロイ設定」の実行依頼)

## 結果の内容

### 相談用レポート(PDF出力)— Sprint 7

`src/pages/PrintReport.tsx`(ルート `/print/:month`)を新設。月次レポート画面の「相談用レポートを作成(PDF保存)」ボタンから開き、ブラウザの印刷機能でPDF保存する方式(印刷CSSベース)。

実装仕様書 §37 に準拠した「勤務状況記録レポート」:

- 対象期間・作成日・出典(本人記録である旨)
- 月間サマリ(勤務日数・勤務時間・推定時間外・最長勤務・連勤・休憩不足・休日・深夜)
- 会社側の記録との比較(入力がある場合のみ。「差」として表示し未払いを断定しない)
- 日別の勤務記録表(出退勤・休憩・実勤務・特記事項)
- 出来事の記録(カテゴリ・程度・場所・相手・発言・目撃者・証拠の有無)
- 記録の修正履歴(後から修正した日と保存回数。当日入力のみなら「修正なし」と明記)
- 免責フッター

「ブラック企業」「違法」等の断定表現・リスクスコアは含めない(相談先に事実として提出できる体裁)。印刷時はナビゲーション・操作ボタンを非表示(`print:hidden`)。

### GitHub Pages 自動デプロイ

`.github/workflows/deploy.yml` を追加。main への push ごとに `npm ci` → `npm test`(49件)→ `npm run build` → `dist/` を `gh-pages` ブランチへ publish(peaceiris/actions-gh-pages)。

- 当初は `actions/configure-pages`(enablement)+`deploy-pages` 方式を試したが、標準の GITHUB_TOKEN では Pages サイト作成の権限がなく失敗(`Resource not accessible by integration`)
- そのため **gh-pages ブランチ方式**に切り替え。gh-pages ブランチの作成で GitHub が Pages を自動有効化するため、手動設定が不要
- 初回はローカルビルドを gh-pages に直接 push して公開を開始した(gh-pages はデプロイ成果物専用ブランチ。開発はすべて main)

公開URL:https://adash333.github.io/laborlog/

※Pagesの有効化(Settings → Pages → gh-pages ブランチ)のみ手動操作が必要だった。有効化後、本番URLで index.html・JS・CSS・PWA manifest・service worker がすべて配信されていることを確認済み(公開確認:2026-09-01)。

Vite は相対パス(`base: './'`)+HashRouter 構成のため、サブパス配信でもそのまま動作する。

### 検証

- ビルド・型チェック・テスト成功
- Playwright:勤務記録+出来事を作成→月次レポート→相談用レポート画面→全セクション表示確認→禁止表現(「ブラック企業」「違法です」)が含まれないことを確認→実際にA4のPDF生成に成功
