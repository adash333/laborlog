// スコアリングエンジン(実装仕様書 §8–11, §22–24, §27–30 準拠・暫定)
// 閾値・点数・警告文は rules.json に外部化し、法改正時はルール更新で対応する。
import rules from './rules.json'
import type { MonthlyAggregate } from '../lib/aggregate'

export interface ScoreReason {
  label: string
  points: number
}

export interface CategoryScore {
  score: number
  maxScore: number
  reasons: ScoreReason[]
  message: string
}

export interface RedFlag {
  ruleId: string
  severity: 'critical' | 'high'
  message: string
  sourceName: string
  sourceUrl: string
}

export type TotalLevel = 'LOW' | 'CAUTION' | 'REVIEW' | 'CONSULT' | 'HIGH' | 'CRITICAL'

export interface RiskAssessment {
  longHours: CategoryScore
  breaksHolidays: CategoryScore
  // B(未払い差異)・C(ハラスメント)・E(雇用圧力)は今後のスプリントで実装
  availableScore: number // 実装済みカテゴリの得点合計
  availableMax: number
  redFlags: RedFlag[]
  screenLevel: TotalLevel
  rulesetVersion: string
}

function tableLookup(table: { minHours?: number; minDays?: number; score?: number; bonus?: number }[], value: number): number {
  for (const row of table) {
    const threshold = row.minHours ?? row.minDays ?? 0
    if (value >= threshold) return row.score ?? row.bonus ?? 0
  }
  return 0
}

/** A:長時間労働・過重労働(0〜30) */
export function longHoursScore(agg: MonthlyAggregate): CategoryScore {
  const cfg = rules.longHours
  const overtimeHours = agg.overtimeMinutes / 60
  const reasons: ScoreReason[] = []

  const base = tableLookup(cfg.overtimeBase, overtimeHours)
  if (base > 0) reasons.push({ label: `推定時間外労働 約${Math.floor(overtimeHours)}時間/月`, points: base })

  const consecutive = tableLookup(cfg.consecutiveBonus, agg.maxConsecutiveDays)
  if (consecutive > 0) reasons.push({ label: `最大連続勤務 ${agg.maxConsecutiveDays}日`, points: consecutive })

  let longDay = 0
  if (agg.days14hOrMore >= 1) longDay = cfg.longDayBonus.day14hOnce
  else if (agg.days12hOrMore >= 3) longDay = cfg.longDayBonus.day12hThreeTimes
  else if (agg.days12hOrMore >= 1) longDay = cfg.longDayBonus.day12hOnce
  if (longDay > 0) {
    const label = agg.days14hOrMore >= 1 ? '14時間以上の勤務日あり' : `12時間以上の勤務日 ${agg.days12hOrMore}日`
    reasons.push({ label, points: longDay })
  }

  const night = tableLookup(cfg.nightWorkBonus, agg.nightWorkDays)
  if (night > 0) reasons.push({ label: `深夜勤務 ${agg.nightWorkDays}日`, points: night })

  const score = Math.min(cfg.maxScore, base + consecutive + longDay + night)
  return { score, maxScore: cfg.maxScore, reasons, message: longHoursMessage(score) }
}

/** 長時間労働の警告文(実装仕様書 §10) */
function longHoursMessage(score: number): string {
  if (score >= 30)
    return '極めて長い時間外労働が記録されています。総合点にかかわらず、勤務記録を保存し、早めの外部相談を検討してください。'
  if (score >= 24)
    return '非常に長い時間外労働が記録されています。健康への負担も含め、早めに相談することをおすすめします。'
  if (score >= 17)
    return '長時間労働のリスクが高くなっています。勤務記録を保存し、必要に応じて外部相談を検討してください。'
  if (score >= 10)
    return '今月の時間外労働は、一般的な上限の目安である月45時間を超えています。36協定や勤務制度によって評価が異なるため、勤務条件を確認してください。'
  if (score >= 5) return '勤務時間が増えています。記録を継続し、月間の時間外労働を確認しましょう。'
  return '現在の記録からは、長時間労働について大きなリスクは検出されていません。'
}

/** D:休憩・休日(0〜15。有休関連の自己申告は今後のスプリントで追加) */
export function breaksHolidaysScore(agg: MonthlyAggregate): CategoryScore {
  const cfg = rules.breaksHolidays
  const reasons: ScoreReason[] = []

  const breakScore = tableLookup(cfg.breakDeficitDays, agg.breakDeficitDays)
  if (breakScore > 0) reasons.push({ label: `休憩不足 ${agg.breakDeficitDays}日`, points: breakScore })

  const consecutiveScore = tableLookup(cfg.consecutiveDays, agg.maxConsecutiveDays)
  if (consecutiveScore > 0)
    reasons.push({ label: `連続勤務 ${agg.maxConsecutiveDays}日`, points: consecutiveScore })

  const score = Math.min(cfg.maxScore, breakScore + consecutiveScore)
  return { score, maxScore: cfg.maxScore, reasons, message: breaksMessage(score, agg) }
}

function breaksMessage(score: number, agg: MonthlyAggregate): string {
  if (score >= 8)
    return '休憩や休日が十分に取れていない状態が続いています。記録を保存し、勤務条件の確認や相談を検討してください。'
  if (score >= 4)
    return '休憩不足または連続勤務が複数回記録されています。労働基準法の一般則では、6時間超の勤務に45分以上、8時間超の勤務に60分以上の休憩が必要とされています。'
  if (score >= 1) return '休憩が不足した日があります。記録を継続しましょう。'
  if (agg.breakUnknownDays > 0)
    return '休憩が未入力の日があります。退勤時に休憩も記録すると、より正確に判定できます。'
  return '現在の記録からは、休憩・休日について大きなリスクは検出されていません。'
}

/** レッドフラッグ判定(総合点と独立:§30) */
export function evaluateRedFlags(agg: MonthlyAggregate): RedFlag[] {
  const metrics: Record<string, number> = {
    monthly_overtime_hours: agg.overtimeMinutes / 60,
    max_consecutive_days: agg.maxConsecutiveDays,
  }
  const flags: RedFlag[] = []
  for (const rf of rules.redFlags) {
    const v = metrics[rf.metric]
    if (v === undefined) continue
    if (rf.operator === '>=' && v >= rf.value) {
      const source = rules.sources.find((s) => s.id === rf.sourceId)
      flags.push({
        ruleId: rf.ruleId,
        severity: rf.severity as 'critical' | 'high',
        message: rf.message,
        sourceName: source?.name ?? '',
        sourceUrl: source?.url ?? '',
      })
    }
  }
  // 同一メトリクスで最上位のみ残す(100h到達時に80hフラッグを重複表示しない)
  if (flags.some((f) => f.ruleId === 'RF_LONG_001')) {
    return flags.filter((f) => f.ruleId !== 'RF_LONG_080')
  }
  return flags
}

/** 月次のリスク評価をまとめて計算する */
export function assessMonth(agg: MonthlyAggregate): RiskAssessment {
  const longHours = longHoursScore(agg)
  const breaksHolidays = breaksHolidaysScore(agg)
  const redFlags = evaluateRedFlags(agg)

  const availableScore = longHours.score + breaksHolidays.score
  const availableMax = longHours.maxScore + breaksHolidays.maxScore

  // 総合レベル(§28)。未実装カテゴリがあるため 100点換算した参考値で判定する
  const normalized = availableMax > 0 ? Math.round((availableScore / availableMax) * 100) : 0
  let level: TotalLevel
  if (normalized >= 85) level = 'HIGH'
  else if (normalized >= 70) level = 'CONSULT'
  else if (normalized >= 50) level = 'REVIEW'
  else if (normalized >= 30) level = 'CAUTION'
  else level = 'LOW'

  // レッドフラッグ優先(§30)
  let screenLevel: TotalLevel = level
  if (redFlags.some((f) => f.severity === 'critical')) screenLevel = 'CRITICAL'
  else if (redFlags.some((f) => f.severity === 'high')) {
    const order: TotalLevel[] = ['LOW', 'CAUTION', 'REVIEW', 'CONSULT', 'HIGH', 'CRITICAL']
    screenLevel = order.indexOf(level) >= order.indexOf('CONSULT') ? level : 'CONSULT'
  }

  return {
    longHours,
    breaksHolidays,
    availableScore,
    availableMax,
    redFlags,
    screenLevel,
    rulesetVersion: rules.rulesetVersion,
  }
}

export const LEVEL_LABELS: Record<TotalLevel, { label: string; message: string }> = {
  LOW: {
    label: '低リスク',
    message: '現在の記録からは大きな労働リスクは検出されていません。この結果は職場の安全性や適法性を保証するものではありません。',
  },
  CAUTION: {
    label: '注意',
    message: 'いくつか気になる勤務状況があります。引き続き出勤・退勤や出来事を記録しておきましょう。',
  },
  REVIEW: {
    label: '要確認',
    message: '確認した方がよい勤務上の問題が複数あります。雇用契約書、就業規則、給与明細、勤務記録などを確認してください。',
  },
  CONSULT: {
    label: '相談検討',
    message: '複数の労働リスクが高くなっています。記録を保存し、公的相談窓口などへの相談を検討してください。',
  },
  HIGH: {
    label: '高リスク',
    message: '高い労働リスクが検出されています。記録を失わないように保存し、早めの外部相談を検討してください。',
  },
  CRITICAL: {
    label: '緊急',
    message: '重大なリスクが記録されています。総合点にかかわらず、記録を保存し、早めの外部相談を検討してください。',
  },
}
