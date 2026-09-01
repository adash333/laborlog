import type { WorkDay } from '../types'

/** "HH:MM" → 0時からの分数 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

/** 在社時間(分)。退勤が出勤より前の場合は日をまたいだとみなす */
export function presenceMinutes(clockIn: string, clockOut: string): number {
  const inMin = toMinutes(clockIn)
  const outMin = toMinutes(clockOut)
  return outMin >= inMin ? outMin - inMin : outMin + 24 * 60 - inMin
}

/**
 * 記録上の実勤務時間(分)。出退勤が揃っていなければ null(欠損を0扱いしない)。
 * 実装仕様書 §6:在社時間 - 休憩 + 自宅作業 + 始業前後の作業(出退勤時刻の外のみ)
 */
export function recordedWorkMinutes(day: WorkDay): number | null {
  if (!day.clockIn || !day.clockOut) return null
  const presence = presenceMinutes(day.clockIn, day.clockOut)
  const breakMin = day.breakMinutes ?? 0
  return Math.max(
    0,
    presence - breakMin + day.homeWorkMinutes + day.preShiftWorkMinutes + day.postShiftWorkMinutes,
  )
}

/** 労基法34条の一般則に基づく必要休憩(分)。6時間超→45分、8時間超→60分 */
export function requiredBreakMinutes(workMinutes: number): number {
  if (workMinutes > 480) return 60
  if (workMinutes > 360) return 45
  return 0
}

/**
 * 休憩不足(分)。休憩が未入力の場合は判定不能として null。
 * 必要休憩は「休憩を除く前の在社ベース」ではなく記録上の勤務時間で近似する(暫定)。
 */
export function breakDeficitMinutes(day: WorkDay): number | null {
  const work = recordedWorkMinutes(day)
  if (work === null) return null
  if (day.breakMinutes === null) return null
  return Math.max(requiredBreakMinutes(work) - day.breakMinutes, 0)
}

/**
 * 1日の推定時間外労働(分)= 記録上の勤務時間 - 8時間(下限0)。
 * 変形労働時間制等は考慮しない暫定推計であり、法的な時間外労働を確定しない。
 */
export function dailyOvertimeMinutes(day: WorkDay): number {
  const work = recordedWorkMinutes(day)
  if (work === null) return 0
  return Math.max(work - 480, 0)
}

/** 深夜勤務(22時〜5時)に一部でもかかるか(暫定判定) */
export function isNightWork(day: WorkDay): boolean {
  if (!day.clockIn || !day.clockOut) return false
  const inMin = toMinutes(day.clockIn)
  const outMin = toMinutes(day.clockOut)
  const overnight = outMin < inMin
  if (overnight) return true // 日をまたぐ勤務は深夜帯を含む
  return outMin > 22 * 60 || inMin < 5 * 60
}

/** ローカルタイムの "YYYY-MM-DD" */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 現在時刻の "HH:MM" */
export function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "YYYY-MM" 月内の全日付を返す */
export function datesInMonth(month: string): string[] {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function weekdayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}
