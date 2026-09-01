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

## 開発

```bash
npm install
npm run dev      # 開発サーバー
npm test         # ユニットテスト(集計・スコアリング)
npm run build    # 型チェック + 本番ビルド(dist/)
npm run preview  # ビルド結果のプレビュー
```

### 実装済み(v0.2.0)

- 勤務条件の登録(雇用形態・所定時間・勤務制度・業種特例・固定残業代)
- 出勤・退勤の2タップ記録、休憩・「今日困ったこと」チェック、自由メモ
- 日別の修正(修正履歴を内部保存)
- カレンダー・月次レポート(推定時間外・連勤・休憩不足など)・CSV出力
- ハラスメント等の出来事の詳細記録(カテゴリ・深刻さ・場所・相手・発言・目撃者・証拠)
- 会社勤怠・給与明細の残業時間との比較入力、雇用上の圧力チェック(月次)
- **総合ブラック度(100点満点)**:長時間労働30・未払い25・ハラスメント20・休憩・休日15・雇用圧力10
- レッドフラッグ(月80h/100h、14連勤、暴力・重大な性的言動・脅迫等)を総合点と独立に判定
- スコアリングルールの JSON 外部化(`src/scoring/rules.json`、出典URL付き)
- 相談先案内(スコア条件による「あなたの記録に関連」表示)・「証拠を守る」読み物
- JSONバックアップ(ダウンロード/メール・Googleドライブ共有)・復元・全データ削除
- PWA(オフライン動作・ホーム画面追加)

### 今後の予定

- 相談用PDF出力(勤務状況記録レポート)
- 有給休暇関連の記録・スコア反映の拡充
- アプリロック(PIN)

## 免責

本アプリが表示する「ブラック度」等のスコアは、勤務記録から働き方のリスクを可視化した参考指標であり、会社の違法性や「ブラック企業」であることを法的に判定するものではありません。
