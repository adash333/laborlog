import { describe, expect, it } from 'vitest'
import type { MonthlyAggregate } from '../lib/aggregate'
import {
  assessMonth,
  breaksHolidaysScore,
  evaluateRedFlags,
  longHoursScore,
} from './scoring'

function agg(overrides: Partial<MonthlyAggregate> = {}): MonthlyAggregate {
  return {
    month: '2026-09',
    recordedDays: 20,
    totalWorkMinutes: 0,
    overtimeMinutes: 0,
    longestDayMinutes: 0,
    maxConsecutiveDays: 5,
    breakDeficitDays: 0,
    breakUnknownDays: 0,
    holidayWorkDays: 0,
    nightWorkDays: 0,
    days12hOrMore: 0,
    days14hOrMore: 0,
    troubleCounts: {},
    ...overrides,
  }
}

describe('longHoursScore(実装仕様書 §9)', () => {
  it('時間外労働の基本点', () => {
    expect(longHoursScore(agg({ overtimeMinutes: 0 })).score).toBe(0)
    expect(longHoursScore(agg({ overtimeMinutes: 25 * 60 })).score).toBe(2)
    expect(longHoursScore(agg({ overtimeMinutes: 35 * 60 })).score).toBe(5)
    expect(longHoursScore(agg({ overtimeMinutes: 50 * 60 })).score).toBe(10)
    expect(longHoursScore(agg({ overtimeMinutes: 70 * 60 })).score).toBe(17)
    expect(longHoursScore(agg({ overtimeMinutes: 90 * 60 })).score).toBe(24)
    expect(longHoursScore(agg({ overtimeMinutes: 100 * 60 })).score).toBe(30)
  })

  it('補正を加えても30点でクリップ', () => {
    const result = longHoursScore(
      agg({
        overtimeMinutes: 100 * 60,
        maxConsecutiveDays: 14,
        days14hOrMore: 2,
        nightWorkDays: 10,
      }),
    )
    expect(result.score).toBe(30)
  })

  it('連勤・長い1日・深夜の補正', () => {
    const result = longHoursScore(
      agg({
        overtimeMinutes: 50 * 60, // base 10
        maxConsecutiveDays: 7, // +1
        days12hOrMore: 1, // +1
        nightWorkDays: 4, // +1
      }),
    )
    expect(result.score).toBe(13)
    expect(result.reasons).toHaveLength(4)
  })

  it('月45時間超で確認を促す警告文(断定しない)', () => {
    const result = longHoursScore(agg({ overtimeMinutes: 50 * 60 }))
    expect(result.message).toContain('月45時間を超えています')
    expect(result.message).not.toContain('違法')
  })
})

describe('breaksHolidaysScore(実装仕様書 §23–24)', () => {
  it('休憩不足日数のスコア', () => {
    expect(breaksHolidaysScore(agg({ breakDeficitDays: 0 })).score).toBe(0)
    expect(breaksHolidaysScore(agg({ breakDeficitDays: 1 })).score).toBe(1)
    expect(breaksHolidaysScore(agg({ breakDeficitDays: 4 })).score).toBe(3)
    expect(breaksHolidaysScore(agg({ breakDeficitDays: 7 })).score).toBe(5)
    expect(breaksHolidaysScore(agg({ breakDeficitDays: 12 })).score).toBe(6)
  })
  it('連勤の加点', () => {
    expect(breaksHolidaysScore(agg({ maxConsecutiveDays: 14 })).score).toBe(6)
  })
})

describe('evaluateRedFlags', () => {
  it('月100時間でクリティカル(80時間フラッグは重複表示しない)', () => {
    const flags = evaluateRedFlags(agg({ overtimeMinutes: 100 * 60 }))
    expect(flags.map((f) => f.ruleId)).toContain('RF_LONG_001')
    expect(flags.map((f) => f.ruleId)).not.toContain('RF_LONG_080')
    expect(flags[0].severity).toBe('critical')
  })
  it('月80時間でhigh', () => {
    const flags = evaluateRedFlags(agg({ overtimeMinutes: 85 * 60 }))
    expect(flags.map((f) => f.ruleId)).toContain('RF_LONG_080')
  })
  it('リスクなしなら空', () => {
    expect(evaluateRedFlags(agg())).toHaveLength(0)
  })
})

describe('assessMonth(§30 レッドフラッグ優先)', () => {
  it('クリティカルフラッグがあれば総合点にかかわらずCRITICAL', () => {
    const result = assessMonth(agg({ overtimeMinutes: 100 * 60 }))
    expect(result.screenLevel).toBe('CRITICAL')
  })
  it('リスクが低ければLOW', () => {
    const result = assessMonth(agg())
    expect(result.screenLevel).toBe('LOW')
    expect(result.availableScore).toBe(0)
  })
  it('highフラッグは最低でもCONSULTに引き上げる', () => {
    const result = assessMonth(agg({ maxConsecutiveDays: 14 }))
    expect(['CONSULT', 'HIGH']).toContain(result.screenLevel)
  })
})
