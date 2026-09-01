// スコアリングエンジン(実装仕様書 §8–11, §22–24, §27–30 準拠・暫定)
// 閾値・点数・警告文は rules.json に外部化し、法改正時はルール更新で対応する。
import rules from './rules.json'
import type { MonthlyAggregate } from '../lib/aggregate'
import {
  HARASSMENT_CATEGORIES,
  PRESSURE_ITEMS,
  type Incident,
  type MonthlyInput,
  type PressureItemId,
} from '../types'

export interface ScoreReason {
  label: string
  points: number
}

export interface CategoryScore {
  score: number
  maxScore: number
  reasons: ScoreReason[]
  message: string
  /** 判定材料が不足しており暫定値であることを示す(§39) */
  insufficient?: boolean
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
  unpaid: CategoryScore
  harassment: CategoryScore
  breaksHolidays: CategoryScore
  pressure: CategoryScore
  totalScore: number // 総合ブラック度(0〜100)
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

/** B:未払い・勤務記録差異(0〜25。実装仕様書 §12–15) */
export function unpaidScore(agg: MonthlyAggregate, input: MonthlyInput | null): CategoryScore {
  const cfg = rules.unpaid
  const reasons: ScoreReason[] = []
  const selfOvertimeHours = agg.overtimeMinutes / 60

  // 会社側の記録との差(会社勤怠が未入力なら差分は判定しない:§39)
  const companyH = input?.companyOvertimeHours ?? null
  let diffScore = 0
  let diffHours = 0
  if (companyH !== null) {
    diffHours = Math.max(selfOvertimeHours - companyH, 0)
    diffScore = tableLookup(cfg.differenceHours, diffHours)
    if (diffScore > 0)
      reasons.push({ label: `あなたの記録と会社側の記録に約${Math.floor(diffHours)}時間の差`, points: diffScore })
  }

  let bonus = 0
  const unableCount = agg.troubleCounts.overtime_not_reported ?? 0
  if (unableCount >= cfg.unableToReportBonus.minCount) {
    bonus += cfg.unableToReportBonus.bonus
    reasons.push({ label: `残業を申告できなかった ${unableCount}回`, points: cfg.unableToReportBonus.bonus })
  }
  if (agg.offClockMinutes >= cfg.offClockBonus.minMinutes) {
    bonus += cfg.offClockBonus.bonus
    reasons.push({
      label: `始業前・終業後・自宅での作業 計${Math.floor(agg.offClockMinutes / 60)}時間`,
      points: cfg.offClockBonus.bonus,
    })
  }

  const score = Math.min(cfg.maxScore, diffScore + bonus)
  return {
    score,
    maxScore: cfg.maxScore,
    reasons,
    message: unpaidMessage(diffHours, companyH !== null, score),
    insufficient: companyH === null,
  }
}

function unpaidMessage(diffHours: number, hasCompanyData: boolean, score: number): string {
  if (!hasCompanyData) {
    return score > 0
      ? '会社の勤怠・給与明細が未入力のため暫定値です。月次レポート画面から会社側の残業時間を入力すると、記録の差を確認できます。'
      : '会社の勤怠・給与明細が未入力のため、記録の差はまだ判定できません。月次レポート画面から入力できます。'
  }
  if (diffHours >= 20)
    return '勤務記録と会社側の記録に大きな差があります。勤務条件や計算方法を確認し、必要に応じて労働基準監督署等への相談を検討してください。'
  if (diffHours >= 5)
    return 'あなたの勤務記録と会社側の記録に継続的な差があります。タイムカード、給与明細、業務メール等も保存しておくことをおすすめします。'
  if (diffHours >= 1)
    return 'あなたの記録と会社側の記録に少し差があります。入力ミス等もあり得るため、内容を確認してください。'
  return '現在の記録からは、会社側の記録との大きな差は検出されていません。'
}

/** C:ハラスメント(0〜20。実装仕様書 §17–19)。incidents は対象月の出来事のみを渡す */
export function harassmentScore(incidents: Incident[]): CategoryScore {
  const cfg = rules.harassment
  const reasons: ScoreReason[] = []
  const eventScores = cfg.eventScores as Record<string, number>

  let sum = 0
  const byCategory = new Map<string, number>()
  for (const inc of incidents) {
    sum += eventScores[String(inc.severity)] ?? 0
    byCategory.set(inc.category, (byCategory.get(inc.category) ?? 0) + 1)
  }
  if (incidents.length > 0) {
    reasons.push({ label: `記録された出来事 ${incidents.length}件`, points: Math.min(sum, cfg.maxScore) })
  }

  // 同一カテゴリの反復(§18。月内の件数で近似)
  let repeatBonus = 0
  let repeatCategory = ''
  for (const [cat, count] of byCategory) {
    const bonus = tableLookup(
      cfg.repeatBonus.map((r) => ({ minDays: r.minCount, bonus: r.bonus })),
      count,
    )
    if (bonus > repeatBonus) {
      repeatBonus = bonus
      repeatCategory = cat
    }
  }
  if (repeatBonus > 0) {
    const label = HARASSMENT_CATEGORIES.find((c) => c.id === repeatCategory)?.label ?? repeatCategory
    reasons.push({
      label: `同様の出来事の反復(${label.split('(')[0]})`,
      points: repeatBonus,
    })
  }

  const score = Math.min(cfg.maxScore, sum + repeatBonus)
  return { score, maxScore: cfg.maxScore, reasons, message: harassmentMessage(score) }
}

function harassmentMessage(score: number): string {
  if (score >= 15)
    return '重大または反復する出来事が記録されています。総合点にかかわらず、記録を保存し、早めの相談を検討してください。'
  if (score >= 10)
    return '継続的または強いハラスメントリスクが検出されています。社内窓口だけでなく、外部の相談窓口も検討できます。'
  if (score >= 5)
    return '同様の出来事が複数回記録されています。厚生労働省が示すハラスメントの典型例と共通する可能性があります。記録を継続してください。'
  if (score >= 1)
    return '不快な出来事が記録されています。日時・場所・相手・具体的な発言等を残しておくと、後で状況を整理しやすくなります。'
  return '現在の記録からは、ハラスメントに関する出来事は記録されていません。'
}

/** E:雇用上の圧力・退職妨害(0〜10。実装仕様書 §26) */
export function pressureScore(agg: MonthlyAggregate, input: MonthlyInput | null): CategoryScore {
  const cfg = rules.pressure
  const itemPoints = cfg.itemPoints as Record<PressureItemId, number>
  const reasons: ScoreReason[] = []

  let sum = 0
  for (const flag of input?.pressureFlags ?? []) {
    const points = itemPoints[flag] ?? 0
    sum += points
    const label = PRESSURE_ITEMS.find((i) => i.id === flag)?.label ?? flag
    reasons.push({ label, points })
  }

  // 日々の「退職・有休を妨げられた」チェックも補助的に加点(チェックリスト未記入でも拾う)
  const dailyCount = agg.troubleCounts.resignation_blocked ?? 0
  if (dailyCount >= 1 && !(input?.pressureFlags.length)) {
    sum += cfg.dailyTroubleBonus
    reasons.push({ label: `「退職・有休を妨げられた」の記録 ${dailyCount}日`, points: cfg.dailyTroubleBonus })
  }

  const score = Math.min(cfg.maxScore, sum)
  return { score, maxScore: cfg.maxScore, reasons, message: pressureMessage(score) }
}

function pressureMessage(score: number): string {
  if (score >= 8)
    return '強い圧力・脅しに当たり得る出来事が記録されています。記録を保存し、総合労働相談コーナーや法テラス等への相談を検討してください。'
  if (score >= 4)
    return '雇用上の圧力に当たり得る出来事が記録されています。経緯・発言・書面などを保存しておきましょう。'
  if (score >= 1)
    return '気になる出来事が記録されています。記録を継続してください。'
  return '現在の記録からは、雇用上の圧力について大きなリスクは検出されていません。'
}

/** レッドフラッグ判定(総合点と独立:§30) */
export function evaluateRedFlags(
  agg: MonthlyAggregate,
  incidents: Incident[] = [],
  input: MonthlyInput | null = null,
): RedFlag[] {
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
    const i = flags.findIndex((f) => f.ruleId === 'RF_LONG_080')
    if (i >= 0) flags.splice(i, 1)
  }

  const harassmentSource = rules.sources.find((s) => s.id === 'mhlw_harassment')

  // 重大な出来事(暴力・重大な性的言動・強い脅迫:§20)
  if (incidents.some((inc) => inc.severity >= 4)) {
    flags.push({
      ruleId: 'RF_HAR_001',
      severity: 'critical',
      message:
        '暴力・重大な性的言動・強い脅迫に当たり得る出来事が記録されています。総合点にかかわらず、記録を保存し、早めの外部相談を検討してください。身の危険を感じる場合は警察(110)への相談も選択肢です。',
      sourceName: harassmentSource?.name ?? '',
      sourceUrl: harassmentSource?.url ?? '',
    })
  } else {
    // 同一カテゴリが月5回以上かつ深刻さ2以上(§20 RF_HAR_004 の近似)
    const byCategory = new Map<string, number>()
    for (const inc of incidents) {
      if (inc.severity >= 2) byCategory.set(inc.category, (byCategory.get(inc.category) ?? 0) + 1)
    }
    if ([...byCategory.values()].some((c) => c >= 5)) {
      flags.push({
        ruleId: 'RF_HAR_004',
        severity: 'high',
        message:
          '同様の出来事が繰り返し記録されています。厚生労働省が示すハラスメントの典型例と共通する可能性があります。記録を保存し、外部相談を検討してください。',
        sourceName: harassmentSource?.name ?? '',
        sourceUrl: harassmentSource?.url ?? '',
      })
    }
  }

  // 雇用上の圧力での暴力・重大な脅迫(§26)
  if (input?.pressureFlags.includes('violence_or_serious_threat')) {
    flags.push({
      ruleId: 'RF_PRESSURE_001',
      severity: 'critical',
      message:
        '暴力・重大な脅迫を受けたことが記録されています。総合点にかかわらず、記録を保存し、早めの外部相談を検討してください。',
      sourceName: harassmentSource?.name ?? '',
      sourceUrl: harassmentSource?.url ?? '',
    })
  }

  return flags
}

/** 月次のリスク評価をまとめて計算する(§27–30) */
export function assessMonth(
  agg: MonthlyAggregate,
  incidents: Incident[] = [],
  input: MonthlyInput | null = null,
): RiskAssessment {
  const longHours = longHoursScore(agg)
  const unpaid = unpaidScore(agg, input)
  const harassment = harassmentScore(incidents)
  const breaksHolidays = breaksHolidaysScore(agg)
  const pressure = pressureScore(agg, input)
  const redFlags = evaluateRedFlags(agg, incidents, input)

  const totalScore = Math.min(
    100,
    longHours.score + unpaid.score + harassment.score + breaksHolidays.score + pressure.score,
  )

  // 総合レベル(§28)
  let level: TotalLevel
  if (totalScore >= 85) level = 'HIGH'
  else if (totalScore >= 70) level = 'CONSULT'
  else if (totalScore >= 50) level = 'REVIEW'
  else if (totalScore >= 30) level = 'CAUTION'
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
    unpaid,
    harassment,
    breaksHolidays,
    pressure,
    totalScore,
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
