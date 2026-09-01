import { describe, expect, it } from 'vitest'
import { emptyWorkDay, type WorkDay } from '../types'
import { aggregateMonth, dataConfidence, maxConsecutiveWorkedDays } from './aggregate'

function day(date: string, overrides: Partial<WorkDay> = {}): WorkDay {
  return {
    ...emptyWorkDay(date),
    clockIn: '09:00',
    clockOut: '18:00',
    breakMinutes: 60,
    ...overrides,
  }
}

describe('aggregateMonth', () => {
  it('基本集計', () => {
    const days = [
      day('2026-09-01'), // 8h
      day('2026-09-02', { clockOut: '22:00' }), // 12h、深夜(22時)ではない(>22:00でないため)
      day('2026-09-03', { clockOut: '23:30' }), // 13.5h、深夜
    ]
    const agg = aggregateMonth('2026-09', days)
    expect(agg.recordedDays).toBe(3)
    expect(agg.totalWorkMinutes).toBe(480 + 720 + 810)
    expect(agg.overtimeMinutes).toBe(0 + 240 + 330)
    expect(agg.longestDayMinutes).toBe(810)
    expect(agg.days12hOrMore).toBe(2)
    expect(agg.days14hOrMore).toBe(0)
    expect(agg.nightWorkDays).toBe(1)
    expect(agg.maxConsecutiveDays).toBe(3)
  })

  it('休憩不足と未入力を区別する', () => {
    const days = [
      day('2026-09-01', { clockOut: '19:00', breakMinutes: 30 }), // 9.5h勤務・休憩30分 → 不足
      day('2026-09-02', { clockOut: '19:00', breakMinutes: null }), // 未入力 → 判定不能
      day('2026-09-03'), // 8h・60分 → 問題なし
    ]
    const agg = aggregateMonth('2026-09', days)
    expect(agg.breakDeficitDays).toBe(1)
    expect(agg.breakUnknownDays).toBe(1)
  })

  it('困ったことを数える', () => {
    const days = [
      day('2026-09-01', { troubles: ['shouted_at', 'overtime_not_reported'] }),
      day('2026-09-02', { troubles: ['shouted_at'] }),
    ]
    const agg = aggregateMonth('2026-09', days)
    expect(agg.troubleCounts.shouted_at).toBe(2)
    expect(agg.troubleCounts.overtime_not_reported).toBe(1)
  })
})

describe('maxConsecutiveWorkedDays', () => {
  it('連続が途切れる場合', () => {
    const days = [
      day('2026-09-01'),
      day('2026-09-02'),
      day('2026-09-04'),
      day('2026-09-05'),
      day('2026-09-06'),
    ]
    expect(maxConsecutiveWorkedDays(days)).toBe(3)
  })
  it('記録なしの日は数えない', () => {
    const days = [day('2026-09-01'), day('2026-09-02', { clockIn: null })]
    expect(maxConsecutiveWorkedDays(days)).toBe(1)
  })
})

describe('dataConfidence', () => {
  it('しきい値', () => {
    expect(dataConfidence(5)).toBe('low')
    expect(dataConfidence(14)).toBe('medium')
    expect(dataConfidence(30)).toBe('high')
  })
})
