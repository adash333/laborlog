# webアプリ作成計画と save-prompt スキル作成

日付:2026-09-01

## プロンプト本文

> アップロードしたファイルをもとに、webアプリを作成したいです。計画をたてて下さい。また、docs/prompt/ フォルダに、上の プロンプト本文 と その結果の内容をまとめたものを YYMMDD-(複数あれば連番 01 など)-題名.md という名前で保存して、それまでのすべての変更をgit addしてmainにpushすることを、 スキル /save-prompt として保存して下さい

添付ファイル:

- `black_work_risk_app_product_plan.md` — ブラック企業対策アプリ プロダクト企画書
- `black_work_risk_algorithm_and_black_company_award.md` — ブラック度アルゴリズム案+ブラック企業大賞調査
- `black_work_risk_app_implementation_spec.md` — 実装仕様書(入力値→判定ロジック→点数→警告文→相談先)
- `mamolog_branding.md` — アプリ名・ブランド方針(まもログ)

## 結果の内容

空のリポジトリ(laborlog)に対して、以下の初期構成を作成した。

### 作成したファイル

| ファイル | 内容 |
|---|---|
| `README.md` | まもログの概要、ドキュメント一覧、開発方針、免責 |
| `docs/specs/product-plan.md` | アップロードされた企画書をそのまま取り込み |
| `docs/specs/scoring-algorithm-research.md` | アルゴリズム案・ブラック企業大賞調査を取り込み |
| `docs/specs/implementation-spec.md` | 実装仕様書を取り込み |
| `docs/specs/branding.md` | ブランド方針を取り込み |
| `docs/plan/development-plan.md` | **Webアプリ開発計画(本プロンプトの主成果物)** |
| `.claude/skills/save-prompt/SKILL.md` | `/save-prompt` スキル |
| `docs/prompt/260901-01-...md` | 本ファイル(プロンプト記録) |

### 開発計画の要点(docs/plan/development-plan.md)

- **ローカルファーストの PWA** とする:データはブラウザ内 IndexedDB のみに保存し、サーバー送信なし。企画書の「会社に見られたくないアプリ」「原則ローカル保存」要件に対応。
- 技術スタック:Vite + React + TypeScript + Tailwind CSS + Dexie.js(IndexedDB)+ vite-plugin-pwa。静的ホスティングで配信。
- スコアリングルール(閾値・点数・警告文・出典URL)は JSON として外部化し、法改正時にルール更新だけで対応できる設計。
- 総合スコア(A長時間労働30/B未払い25/Cハラスメント20/D休憩・休日15/E雇用上の圧力10)とレッドフラッグを分離実装。断定表現(「違法です」等)は使わない。
- 画面構成13画面、Sprint 0〜8 の開発順(勤務記録→月次集計→スコア→出来事記録→記録差異→相談ルーティング→出力→証拠保存コンテンツ)。
- MVPスコープ外:GPS常時取得、給与明細OCR、AI法的判定、企業ランキング、クラウド同期。

### /save-prompt スキル

`.claude/skills/save-prompt/SKILL.md` として作成。内容:

1. `date +%y%m%d` で日付を取得し、`docs/prompt/` 内の同日付ファイルから連番を決定
2. 「YYMMDD-連番-題名.md」にプロンプト本文(原文)と結果の要約を保存
3. `git add -A` → コミット → `origin main` に push(ネットワークエラー時は指数バックオフで最大4回リトライ。main への push が禁止された環境では指定作業ブランチに push して報告)

### 補足

- 本セッションはリモート実行環境の制約により、作業ブランチ `claude/webapp-creation-plan-k0db3h` に push した(main への直接 push は不可)。main への反映はこのブランチのマージで行う。

### 次のアクション

1. 開発計画の承認
2. Sprint 0:プロジェクト雛形の作成(Vite + React + TS + Tailwind + Dexie + PWA)
3. `scoring-rules.json` 初版の作成
