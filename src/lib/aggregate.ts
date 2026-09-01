import type { TroubleId, WorkDay } from '../types'
import {
  breakDeficitMinutes,
  dailyOvertimeMinutes,
  isNightWork,
  recordedWorkMinutes,
} from './time'

export interface MonthlyAggregate {
  month: string // "YYYY-MM"
  recordedDays: number // 出退勤が揃っている日数
  totalWorkMinutes: number
  overtimeMinutes: number // 推定時間外労働(暫定推計)
  longestDayMinutes: number
  maxConsecutiveDays: number // 月内での最大連続勤務日数
  breakDeficitDays: number
  breakUnknownDays: number // 休憩未入力で判定できなかった日数
  holidayWorkDays: number
  nightWorkDays: number
  days12hOrMore: number
  days14hOrMore: number
  offClockMinutes: number // 始業前・終業後・自宅作業の合計(勤怠に載りにくい作業の目安)
  troubleCounts: Partial<Record<TroubleId, number>>
}

/** 月内の勤務記録を集計する。days は同一月のレコードのみを渡す */
export function aggregateMonth(month: string, days: WorkDay[]): MonthlyAggregate {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))

  let recordedDays = 0
  let totalWorkMinutes = 0
  let overtimeMinutes = 0
  let longestDayMinutes = 0
  let breakDeficitDays = 0
  let breakUnknownDays = 0
  let holidayWorkDays = 0
  let nightWorkDays = 0
  let days12hOrMore = 0
  let days14hOrMore = 0
  let offClockMinutes = 0
  const troubleCounts: Partial<Record<TroubleId, number>> = {}

  for (const day of sorted) {
    const work = recordedWorkMinutes(day)
    if (work !== null) {
      recordedDays += 1
      totalWorkMinutes += work
      overtimeMinutes += dailyOvertimeMinutes(day)
      longestDayMinutes = Math.max(longestDayMinutes, work)
      if (work >= 12 * 60) days12hOrMore += 1
      if (work >= 14 * 60) days14hOrMore += 1
      const deficit = breakDeficitMinutes(day)
      if (deficit === null) {
        if (requiredBreakPossible(work)) breakUnknownDays += 1
      } else if (deficit > 0) {
        breakDeficitDays += 1
      }
      if (isNightWork(day)) nightWorkDays += 1
    }
    offClockMinutes += day.preShiftWorkMinutes + day.postShiftWorkMinutes + day.homeWorkMinutes
    if (day.holidayWork || day.troubles.includes('holiday_work')) holidayWorkDays += 1
    for (const t of day.troubles) {
      troubleCounts[t] = (troubleCounts[t] ?? 0) + 1
    }
  }

  return {
    month,
    recordedDays,
    totalWorkMinutes,
    overtimeMinutes,
    longestDayMinutes,
    maxConsecutiveDays: maxConsecutiveWorkedDays(sorted),
    breakDeficitDays,
    breakUnknownDays,
    holidayWorkDays,
    nightWorkDays,
    days12hOrMore,
    days14hOrMore,
    offClockMinutes,
    troubleCounts,
  }
}

function requiredBreakPossible(workMinutes: number): boolean {
  return workMinutes > 360
}

/** 勤務記録のある日の最大連続日数(暦日ベース) */
export function maxConsecutiveWorkedDays(sortedDays: WorkDay[]): number {
  let max = 0
  let streak = 0
  let prev: string | null = null
  for (const day of sortedDays) {
    if (!day.clockIn) continue
    if (prev !== null && isNextDay(prev, day.date)) {
      streak += 1
    } else {
      streak = 1
    }
    max = Math.max(max, streak)
    prev = day.date
  }
  return max
}

function isNextDay(a: string, b: string): boolean {
  const [y, m, d] = a.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
  return nextStr === b
}

/** データ信頼度(実装仕様書 §38 の簡易版:MVPでは記録日数のみで判定) */
export function dataConfidence(recordedDays: number): 'high' | 'medium' | 'low' {
  if (recordedDays >= 30) return 'high'
  if (recordedDays >= 14) return 'medium'
  return 'low'
}
