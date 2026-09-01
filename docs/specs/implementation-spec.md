# ブラック企業対策アプリ 実装仕様書
## 入力値 → 判定ロジック → 点数 → 警告文 → 相談先

更新日：2026-09-01  
ステータス：MVP実装用・暫定仕様

---

# 1. 目的

本仕様書は、会社勤務者向け「ブラック企業対策アプリ」のMVPについて、開発者が実装可能な粒度まで判定ロジックを落とし込むことを目的とする。

本アプリの目的は企業を法的に「ブラック企業」と認定することではなく、利用者本人の勤務記録から、

1. 労働上のリスクを可視化する
2. 問題の兆候に早く気づかせる
3. 証拠となり得る記録を残す
4. 適切な相談先へ案内する
5. 相談用資料を出力する

ことである。

---

# 2. 最重要原則

## 2.1 「違法判定アプリ」にしない

アプリ内で原則として、

- 「違法です」
- 「未払い残業です」
- 「パワハラです」
- 「この会社はブラック企業です」

とは断定しない。

代わりに、

- 「一般的な基準を超えています」
- 「確認が必要な可能性があります」
- 「厚生労働省が示す典型例と共通点があります」
- 「外部相談を検討してください」

と表示する。

---

## 2.2 総合点とレッドフラッグを分離する

総合ブラック度は理解しやすさのための指標。

重大事象は総合点とは無関係にレッドフラッグを出す。

```text
総合ブラック度 38 / 100

ただし

🚨 重大な身体的攻撃が記録されています。
総合点にかかわらず、早めの外部相談を検討してください。
```

---

# 3. MVPで取得するデータ

## 3.1 ユーザープロフィール

```yaml
employment_type:
  - regular_employee
  - contract_employee
  - other_direct_employee

industry_exception:
  - none
  - doctor
  - driver
  - construction
  - other
  - unknown

work_schedule_type:
  - standard
  - variable_working_hours
  - flex
  - shift
  - unknown
```

MVPでは業種特例を完全自動判定しない。

`industry_exception != none` の場合は、

> 「職種・業種によって時間外労働の上限等に特例があります」

を表示する。

---

# 4. 1日の勤務記録

```yaml
work_date:
clock_in:
clock_out:
break_minutes:
home_work_minutes:
pre_shift_work_minutes:
post_shift_work_minutes:
holiday_work:
night_work_minutes:
record_source:
  - manual
  - imported
  - estimated
```

---

# 5. 1日の簡易入力UI

基本操作は2タップ。

```text
[ 出勤 ]

      ↓

[ 退勤 ]
```

退勤後のみ、

```text
今日の休憩は？

○ 60分以上
○ 45〜59分
○ 30〜44分
○ 1〜29分
○ ほぼ取れなかった

今日、困ったことは？

□ 残業を申告できなかった
□ 始業前に仕事をした
□ 退勤後に仕事をした
□ 自宅で仕事をした
□ 休日に仕事をした
□ 怒鳴られた・侮辱された
□ 無視・仲間外れにされた
□ 性的に不快な言動等があった
□ 退職・有休を妨げられた
□ その他
```

問題がなければ追加入力なしで完了できる。

---

# 6. 労働時間の基本計算

## 6.1 在社時間

```text
presence_minutes =
clock_out - clock_in
```

## 6.2 記録上の実勤務時間

```text
recorded_work_minutes =
presence_minutes
- break_minutes
+ home_work_minutes
```

始業前・終業後作業が `clock_in/clock_out` の外にある場合のみ加算する。

```text
recorded_work_minutes +=
pre_shift_work_minutes
+ post_shift_work_minutes
```

二重計上を避ける。

---

# 7. 法定労働時間に関する基礎ルール

一般則として労働基準法では、

- 1日8時間
- 週40時間

が法定労働時間。

時間外労働の上限は原則、

- 月45時間
- 年360時間

特別条項がある場合でも一般則では、

- 年720時間以内
- 時間外労働＋休日労働が単月100時間未満
- 2～6か月平均80時間以内
- 月45時間超は年6か月まで

とされる。

ただし、業種・職種・変形労働時間制等に例外や特例があるため、アプリは法的違反を自動確定しない。

参考：
https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudouseisaku/chushoukigyou/joken_kankyou_rule.html

https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/gyosyu/topics/01.html

---

# 8. 総合スコア構成

| カテゴリ | 配点 |
|---|---:|
| A. 長時間労働・過重労働 | 30 |
| B. 未払い・勤務記録差異 | 25 |
| C. ハラスメント | 20 |
| D. 休憩・休日・休暇 | 15 |
| E. 雇用上の圧力・退職妨害等 | 10 |
| **合計** | **100** |

---

# 9. A：長時間労働スコア 0〜30

## 9.1 基本点

`monthly_overtime_hours`

| 時間 | base_score |
|---|---:|
| < 20h | 0 |
| 20–29.9h | 2 |
| 30–44.9h | 5 |
| 45–59.9h | 10 |
| 60–79.9h | 17 |
| 80–99.9h | 24 |
| >= 100h | 30 |

---

## 9.2 追加補正

以下を加点し、最大30点でクリップする。

### 連勤

```text
max_consecutive_days
```

| 最大連勤 | 加点 |
|---|---:|
| <= 6日 | 0 |
| 7–9日 | +1 |
| 10–13日 | +2 |
| 14日以上 | +4 |

これは法的違反を直接意味する点数ではなく、過重労働リスクの補助指標。

### 極端に長い1日

直近30日で、

| 1日の記録上勤務 | 加点 |
|---|---:|
| 12時間以上が1回 | +1 |
| 12時間以上が3回以上 | +2 |
| 14時間以上が1回以上 | +3 |

### 深夜勤務

22時〜5時の勤務が、

| 月回数 | 加点 |
|---|---:|
| 0–3回 | 0 |
| 4–7回 | +1 |
| 8回以上 | +2 |

---

## 9.3 算式

```python
long_hours_score = min(
    30,
    overtime_base
    + consecutive_days_bonus
    + long_day_bonus
    + night_work_bonus
)
```

---

# 10. 長時間労働の警告文

## 0〜4点

```text
現在の記録からは、長時間労働について大きなリスクは検出されていません。
```

## 5〜9点

```text
勤務時間が増えています。
記録を継続し、月間の時間外労働を確認しましょう。
```

## 10〜16点

```text
今月の時間外労働は、一般的な上限の目安である月45時間を超えています。
36協定や勤務制度によって評価が異なるため、勤務条件を確認してください。
```

## 17〜23点

```text
長時間労働のリスクが高くなっています。
勤務記録を保存し、必要に応じて外部相談を検討してください。
```

## 24〜29点

```text
非常に長い時間外労働が記録されています。
健康への負担も含め、早めに相談することをおすすめします。
```

## 30点

```text
極めて長い時間外労働が記録されています。
総合点にかかわらず、勤務記録を保存し、早めの外部相談を検討してください。
```

---

# 11. 長時間労働レッドフラッグ

以下を独立判定。

```yaml
RF_LONG_001:
  condition: monthly_overtime >= 100h
  severity: critical

RF_LONG_002:
  condition: average_overtime_2_to_6_months >= 80h
  severity: critical

RF_LONG_003:
  condition: overtime_over_45h_months_in_year > 6
  severity: high
```

※業種等の特例を考慮し、法令違反とは断定しない。

---

# 12. B：未払い・勤務記録差異 0〜25

## 12.1 MVPで入力する項目

```yaml
self_recorded_overtime_minutes:
company_recorded_overtime_minutes:
payslip_overtime_minutes:
unable_to_report_overtime_count:
off_clock_work_minutes:
```

給与明細を登録していない場合は、Bスコアの信頼度を下げる。

```yaml
score_confidence:
  - high
  - medium
  - low
```

---

# 13. 勤務記録差異

```text
difference_minutes =
max(
  self_recorded_overtime_minutes
  - company_recorded_overtime_minutes,
  0
)
```

給与明細が入力されている場合は別に、

```text
payroll_difference_minutes =
max(
  self_recorded_overtime_minutes
  - payslip_overtime_minutes,
  0
)
```

を表示する。

---

# 14. 未払いリスク仮スコア

| 月間差異 | 点数 |
|---|---:|
| < 1h | 0 |
| 1–4.9h | 3 |
| 5–9.9h | 6 |
| 10–19.9h | 12 |
| 20–39.9h | 18 |
| >= 40h | 25 |

追加要素：

```text
unable_to_report_overtime_count >= 3 → +3
off_clock_work_minutes >= 300       → +3
```

最大25。

---

# 15. 未払いリスク警告文

## 差異 < 5h

```text
あなたの記録と会社側の記録に少し差があります。
入力ミス等もあり得るため、内容を確認してください。
```

## 5〜19.9h

```text
あなたの勤務記録と会社側の記録に継続的な差があります。
タイムカード、給与明細、業務メール等も保存しておくことをおすすめします。
```

## 20h以上

```text
勤務記録と会社側の記録に大きな差があります。
勤務条件や計算方法を確認し、必要に応じて労働基準監督署等への相談を検討してください。
```

禁止表現：

```text
× 20時間分の未払い残業があります。
```

推奨表現：

```text
○ 約20時間の記録差があります。
```

---

# 16. C：ハラスメント 0〜20

厚生労働省が整理するパワーハラスメントの代表的6類型を基本カテゴリとして使用する。

```yaml
physical_attack
mental_attack
isolation
excessive_demand
insufficient_demand
privacy_intrusion
sexual_harassment
pregnancy_parental_harassment
other
```

参考：
https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/seisaku06/

---

# 17. ハラスメントイベントの入力

```yaml
event_id:
date:
category:
severity:
frequency:
public_or_private:
witness_present:
evidence_available:
free_text:
```

`severity`

```yaml
1: uncomfortable
2: repeated_or_humiliating
3: severe
4: physical_or_serious_sexual_or_threat
```

---

# 18. ハラスメントイベント点数

1件ごとに仮点数を付与。

| severity | 点数 |
|---|---:|
| 1 | 1 |
| 2 | 3 |
| 3 | 6 |
| 4 | 10 |

同一カテゴリが30日以内に3回以上：

```text
repeat_bonus = +3
```

5回以上：

```text
repeat_bonus = +5
```

最大20。

```python
harassment_score = min(
    20,
    sum(event_scores) + repeat_bonus
)
```

---

# 19. ハラスメント警告

## 1〜4点

```text
不快な出来事が記録されています。
日時・場所・相手・具体的な発言等を残しておくと、後で状況を整理しやすくなります。
```

## 5〜9点

```text
同様の出来事が複数回記録されています。
厚生労働省が示すハラスメントの典型例と共通する可能性があります。
記録を継続してください。
```

## 10〜14点

```text
継続的または強いハラスメントリスクが検出されています。
社内窓口だけでなく、外部の相談窓口も検討できます。
```

## 15〜20点

```text
重大または反復する出来事が記録されています。
総合点にかかわらず、記録を保存し、早めの相談を検討してください。
```

---

# 20. ハラスメントのレッドフラッグ

```yaml
RF_HAR_001:
  condition: physical_attack severity >= 3
  severity: critical

RF_HAR_002:
  condition: serious_sexual_event
  severity: critical

RF_HAR_003:
  condition: explicit_threat
  severity: critical

RF_HAR_004:
  condition: same_category_count_30d >= 5 and severity >= 2
  severity: high
```

---

# 21. 「無視・挨拶を返さない」の扱い

単発では自動的にハラスメント扱いしない。

以下を組み合わせて評価する。

```text
継続性
+ 特定人物だけが対象か
+ 業務上必要な情報から排除されているか
+ 会議・連絡網から外されているか
+ 他の侮辱・威圧行為が併存するか
```

### UI例

```text
無視・仲間外れについて

□ 挨拶を繰り返し無視される
□ 自分だけ業務連絡が来ない
□ 会議から外される
□ 他の社員には普通に接している
□ 1週間以上続いている
```

複数該当時に `isolation` リスクを上げる。

---

# 22. D：休憩・休日・休暇 0〜15

労働基準法上、一般則では、

- 6時間を超える勤務 → 少なくとも45分
- 8時間を超える勤務 → 少なくとも60分

の休憩が必要。

参考：
https://www.mhlw.go.jp/web/t_doc?dataId=73022000&dataType=0&pageNo=1

---

# 23. 休憩不足判定

```python
if work_minutes > 480:
    required_break = 60
elif work_minutes > 360:
    required_break = 45
else:
    required_break = 0
```

```text
break_deficit =
max(required_break - actual_break_minutes, 0)
```

## 月間スコア

| 休憩不足日数 | 点数 |
|---|---:|
| 0 | 0 |
| 1–2日 | 1 |
| 3–5日 | 3 |
| 6–9日 | 5 |
| 10日以上 | 6 |

---

# 24. 休日・連勤

労働基準法の一般則では、少なくとも毎週1回の休日が必要。

ただし4週間を通じ4日以上の休日を与える変形休日制等があり得るため、自動違法判定はしない。

```text
14日以上連続勤務 → high warning
```

休日リスク最大6点。

---

# 25. 有給休暇関連

MVPでは次を自己申告。

```text
□ 有休申請を断られた
□ 有休を取ると評価を下げると言われた
□ 有休取得を理由に嫌がらせを受けた
```

最大3点。

---

# 26. E：雇用上の圧力・退職妨害 0〜10

チェック項目：

```yaml
resignation_refused
threatened_after_resignation
damage_claim_threat
penalty_or_fine
retaliation_after_consultation
union_related_disadvantage
leave_related_disadvantage
forced_illegal_action
other_pressure
```

## 点数例

| 内容 | 点数 |
|---|---:|
| 軽度の圧力 | 2 |
| 反復する圧力 | 4 |
| 強い威圧・報復 | 6 |
| 損害賠償等を用いた強い脅し | 8 |
| 暴力・重大な脅迫等 | 10 + レッドフラッグ |

---

# 27. 総合ブラック度

```python
total_score = (
    long_hours_score
    + unpaid_score
    + harassment_score
    + break_holiday_score
    + employment_pressure_score
)

total_score = min(total_score, 100)
```

---

# 28. 総合レベル

```yaml
0-29:
  level: LOW

30-49:
  level: CAUTION

50-69:
  level: REVIEW

70-84:
  level: CONSULT

85-100:
  level: HIGH
```

---

# 29. 総合メッセージ

## LOW

```text
現在の記録からは大きな労働リスクは検出されていません。

この結果は職場の安全性や適法性を保証するものではありません。
```

## CAUTION

```text
いくつか気になる勤務状況があります。

引き続き出勤・退勤や出来事を記録しておきましょう。
```

## REVIEW

```text
確認した方がよい勤務上の問題が複数あります。

雇用契約書、就業規則、給与明細、勤務記録などを確認してください。
```

## CONSULT

```text
複数の労働リスクが高くなっています。

記録を保存し、公的相談窓口などへの相談を検討してください。
```

## HIGH

```text
高い労働リスクが検出されています。

記録を失わないように保存し、早めの外部相談を検討してください。
```

---

# 30. レッドフラッグ優先ロジック

```python
if critical_red_flag:
    screen_level = "CRITICAL"
elif high_red_flag:
    screen_level = max(total_level, "CONSULT")
else:
    screen_level = total_level
```

つまり、

```text
総合点20
+ 暴行
```

でも最上位警告を出す。

---

# 31. 相談先ルーティング

## 31.1 労働時間・残業代

条件：

```text
long_hours_score >= 10
OR unpaid_score >= 10
```

優先表示：

1. 労働条件相談ほっとライン
2. 労働基準監督署
3. 総合労働相談コーナー

---

## 31.2 ハラスメント

条件：

```text
harassment_score >= 5
```

優先表示：

1. 総合労働相談コーナー
2. 都道府県労働局 雇用環境・均等部（室）
3. 法律相談
4. 労働組合等

---

## 31.3 退職・解雇・職場トラブル

条件：

```text
employment_pressure_score >= 4
```

優先表示：

1. 総合労働相談コーナー
2. 法テラス・弁護士等
3. 労働組合等

---

# 32. 公的窓口の説明

厚生労働省の案内では、

### 総合労働相談コーナー

労働条件、解雇、いじめ・嫌がらせ等を含む幅広い労働問題を扱う。

https://www.mhlw.go.jp/general/seido/chihou/kaiketu/soudan.html

### 労働基準監督署

労働時間、賃金、安全衛生、労災等。

### 労働条件相談ほっとライン

違法な時間外労働、過重労働による健康障害、賃金不払残業等について、夜間・土日祝日を含め相談できる厚生労働省委託事業。

https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/kijyungaiyou/kijyungaiyou06.html

---

# 33. 「相談してください」の表示方式

NG：

```text
あなたは労基署へ行くべきです。
```

推奨：

```text
この問題について相談できる公的窓口があります。

[ 労働条件相談ほっとライン ]
時間外労働・残業代など

[ 総合労働相談コーナー ]
ハラスメント・解雇など幅広い相談

[ 労働基準監督署 ]
労働時間・賃金・安全衛生など
```

利用者本人が選択できるようにする。

---

# 34. 証拠保存ナビ

リスク検出後、

```text
この問題について残しておくとよい記録

□ 出勤・退勤記録
□ 給与明細
□ タイムカード
□ 雇用契約書
□ 就業規則
□ 業務メール
□ チャット
□ シフト表
□ 出来事メモ
```

を提示する。

---

# 35. Google Maps タイムライン

MVPでは自動GPS取得はしない。

「証拠を守る」読み物として、

- Google Maps タイムラインを任意でONにする方法
- 自動削除設定の確認
- バックアップ
- データエクスポート
- 削除・停止方法
- プライバシー上の注意

を説明する。

位置記録は、

> 「職場にいた可能性を示す補助情報」

として扱う。

```text
職場滞在時間 ≠ 労働時間
```

であり、自動的な残業確定には使わない。

---

# 36. 月次レポート

```text
2026年9月 勤務レポート

勤務日数              22日
記録上勤務時間        214時間
推定時間外労働         54時間
最長勤務              13時間22分
最大連勤               9日
休憩不足               6日

勤務記録との差        12時間40分

困った出来事
精神的な攻撃           3件
人間関係からの切離し   4件
```

---

# 37. 相談用PDF

相談用出力では感情的な「ブラック企業」表現を抑える。

タイトル例：

```text
勤務状況記録レポート
```

含める：

- 対象期間
- 日別出退勤
- 休憩
- 推定勤務時間
- 出来事一覧
- 給与・勤怠との差
- 添付証拠一覧
- 記録の修正履歴

含めない：

- 「この会社は違法」
- 「ブラック企業確定」
- 「パワハラ確定」

---

# 38. データ信頼度

各スコアに信頼度を付ける。

```yaml
HIGH:
  勤務記録30日以上
  + 給与明細
  + 会社勤怠情報

MEDIUM:
  勤務記録14日以上

LOW:
  記録7日未満
```

表示例：

```text
未払いリスク 64 / 100
データ信頼度：低

まだ記録が少ないため、結果は参考値です。
```

---

# 39. 欠損値の扱い

入力されていない項目を0として扱わない。

例：

```text
給与明細未登録
```

の場合、

```text
未払いリスク：判定材料不足
```

または自己記録だけで算出した「暫定値」とする。

---

# 40. AIの役割

MVPでAIを使うなら補助用途に限定する。

### 使用可能

- 自由記述を出来事カテゴリへ分類
- 日記から日時・相手・発言等を整理
- 相談用メモの要約
- 証拠候補を提示

### AI単独に任せない

- 違法判定
- ハラスメント確定
- 未払い額確定
- 労災認定可能性の確定
- 相談不要の判断

---

# 41. 将来的な「給与明細OCR」

OCR後に、

```text
残業時間
深夜時間
休日労働
基本給
固定残業代
```

を抽出。

ただし必ずユーザー確認画面を入れる。

```text
読み取り結果を確認してください
```

OCR結果のみで未払い判定しない。

---

# 42. 例外処理

次の場合は一般アルゴリズム適用前に注意表示。

```yaml
doctor
driver
construction
variable_working_hours
flex
management_supervisor_claimed
discretionary_work
unknown_special_system
```

表示：

```text
あなたの勤務制度では、一般的な労働時間ルールと異なる扱いがある可能性があります。

スコアは勤務負荷を知る参考値として表示しています。
```

---

# 43. 2026年10月以降の法改正等への対応

ハラスメント関連制度等は改正・施行があり得るため、

```yaml
ruleset_version:
ruleset_effective_date:
source_url:
source_checked_at:
```

を内部データに持つ。

法律・指針をコードにハードコードしすぎず、ルールセット更新可能な設計にする。

---

# 44. JSONルール案

例：

```json
{
  "rule_id": "LONG_MONTH_45",
  "category": "long_hours",
  "condition": {
    "metric": "monthly_overtime_hours",
    "operator": ">=",
    "value": 45
  },
  "score": 10,
  "severity": "warning",
  "message_key": "long_month_45",
  "consultation_routes": [
    "labor_hotline",
    "labor_standards_office"
  ],
  "legal_claim": false
}
```

---

# 45. レッドフラッグJSON例

```json
{
  "rule_id": "LONG_MONTH_100",
  "category": "long_hours",
  "condition": {
    "metric": "monthly_overtime_hours",
    "operator": ">=",
    "value": 100
  },
  "red_flag": true,
  "severity": "critical",
  "override_score_level": "CONSULT",
  "legal_claim": false
}
```

---

# 46. ルールに必須のメタデータ

すべてのルールに、

```yaml
rule_id:
title:
category:
condition:
score:
severity:
user_message:
consultation_routes:
source_name:
source_url:
effective_from:
checked_at:
legal_claim:
```

を持たせる。

これにより、

> 「なぜこの警告が出たのか」

を説明できる。

---

# 47. アプリ内「なぜ？」画面

例：

```text
なぜ長時間労働リスクが高いの？

あなたの今月の記録
時間外労働：58時間

一般的な時間外労働の上限
月45時間

そのためリスクスコアが上がっています。

※36協定、勤務制度、職種等によって法的な扱いは異なります。

[ 厚生労働省の資料を見る ]
```

説明可能性をプロダクトの主要価値にする。

---

# 48. MVPで最初に実装するルール

優先順位A：

1. 出退勤記録
2. 月間勤務時間
3. 月45時間
4. 月80時間
5. 月100時間
6. 休憩45分・60分
7. 連勤
8. 勤怠との差
9. 残業申告不可
10. パワハラ6類型
11. セクハラ等
12. 退職妨害
13. レッドフラッグ
14. 相談先表示
15. 月次PDF

---

# 49. MVPで後回し

- 企業ランキング
- 企業名口コミ
- AIによる法律相談
- 労災認定予測
- GPS常時取得
- 録音機能
- 給与計算の完全自動化
- 法的残業代の確定額表示
- フリーランス労働者性判定
- 派遣契約の詳細判定

---

# 50. 推奨開発順

## Sprint 1
勤務記録

## Sprint 2
月次集計

## Sprint 3
長時間労働・休憩スコア

## Sprint 4
出来事記録・ハラスメント

## Sprint 5
勤務記録差異

## Sprint 6
相談ルーティング

## Sprint 7
PDF出力

## Sprint 8
証拠保存コンテンツ

---

# 51. 最終的なUX

利用者が毎日すること：

```text
朝   [出勤]
夜   [退勤]
```

問題があった日だけ、

```text
[今日困ったこと]
```

アプリ側が自動で、

```text
記録
 ↓
集計
 ↓
リスク検出
 ↓
警告
 ↓
証拠保存
 ↓
相談先提示
 ↓
相談用PDF
```

まで行う。

---

# 52. プロダクトの一文定義

> **毎日「出勤」「退勤」を押すだけ。働き方の異常を早期に見つけ、記録を守り、必要な相談につなぐ労働リスク管理アプリ。**

---

# 53. 主要一次資料

## 厚生労働省：労働条件・職場環境に関するルール
https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudouseisaku/chushoukigyou/joken_kankyou_rule.html

## 厚生労働省：建設業・ドライバー・医師等の時間外労働の上限規制
https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/gyosyu/topics/01.html

## 労働基準法
https://www.mhlw.go.jp/web/t_doc?dataId=73022000&dataType=0&pageNo=1

## 厚生労働省：職場におけるハラスメントの防止
https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/seisaku06/

## 厚生労働省：労働基準行政の相談窓口
https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/kijyungaiyou/kijyungaiyou06.html

## 厚生労働省：総合労働相談コーナー
https://www.mhlw.go.jp/general/seido/chihou/kaiketu/soudan.html

---

# 54. 実装前レビュー項目

正式公開前に、少なくとも以下の専門家レビューを推奨する。

- 労働法に詳しい弁護士
- 社会保険労務士
- 労働安全衛生の専門家
- 情報セキュリティ・プライバシー専門家

特に、

- スコア閾値
- 警告文
- レッドフラッグ
- 相談先ルーティング
- PDFの表現

について確認する。

---

# 55. 次の仕様化候補

次段階では以下を別ファイル化すると開発しやすい。

1. `data-model.md`
2. `scoring-rules.json`
3. `screen-flow.md`
4. `consultation-routing.md`
5. `evidence-guide.md`
6. `privacy-security.md`
7. `legal-disclaimer.md`
8. `mvp-backlog.md`

特に `scoring-rules.json` を独立させると、法改正時にアプリ本体を大きく変更せずルール更新できる設計にしやすい。
