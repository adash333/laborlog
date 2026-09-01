# まもログ

**働いた記録が、あなたを守る。**

まもログは、毎日の出勤・退勤などを簡単に記録し、
長時間労働、未払い残業、ハラスメント、休憩・休日などの
労働上のリスクを可視化するアプリです。

企業を「ブラック企業」と断定することを目的とせず、
働く個人が自分の状況を客観的に把握し、
必要な記録を守り、適切な相談先につながることを目指します。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/plan/development-plan.md](docs/plan/development-plan.md) | Webアプリ開発計画 |
| [docs/specs/product-plan.md](docs/specs/product-plan.md) | プロダクト企画書 |
| [docs/specs/implementation-spec.md](docs/specs/implementation-spec.md) | 実装仕様書(判定ロジック詳細) |
| [docs/specs/scoring-algorithm-research.md](docs/specs/scoring-algorithm-research.md) | ブラック度アルゴリズム案・調査資料 |
| [docs/specs/branding.md](docs/specs/branding.md) | アプリ名・ブランド方針 |
| docs/prompt/ | 開発プロンプトと結果の記録 |

## 開発方針(概要)

- ローカルファーストの PWA(データはブラウザ内 IndexedDB のみ、サーバー送信なし)
- Vite + React + TypeScript + Tailwind CSS + Dexie.js
- スコアリングルールは JSON として外部化し、法改正時にルール更新だけで対応
- 「違法です」等の断定表現は使わず、確認・相談を促す表現に統一

詳細は [docs/plan/development-plan.md](docs/plan/development-plan.md) を参照してください。

## 免責

本アプリが表示する「ブラック度」等のスコアは、勤務記録から働き方のリスクを可視化した参考指標であり、会社の違法性や「ブラック企業」であることを法的に判定するものではありません。
