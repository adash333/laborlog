import { describe, expect, it } from 'vitest'
import { emptyWorkDay, type WorkDay } from '../types'
import {
  breakDeficitMinutes,
  dailyOvertimeMinutes,
  datesInMonth,
  isNightWork,
  presenceMinutes,
  recordedWorkMinutes,
  requiredBreakMinutes,
} from './time'

function day(overrides: Partial<WorkDay>): WorkDay {
  return { ...emptyWorkDay('2026-09-01'), ...overrides }
}

describe('presenceMinutes', () => {
  it('通常の勤務', () => {
    expect(presenceMinutes('09:00', '18:00')).toBe(540)
  })
  it('日をまたぐ勤務', () => {
    expect(presenceMinutes('22:00', '06:00')).toBe(480)
  })
})

describe('recordedWorkMinutes', () => {
  it('出退勤が揃わなければ null(欠損を0扱いしない)', () => {
    expect(recordedWorkMinutes(day({ clockIn: '09:00' }))).toBeNull()
  })
  it('在社時間 - 休憩', () => {
    expect(recordedWorkMinutes(day({ clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 }))).toBe(480)
  })
  it('始業前・終業後・自宅作業を加算', () => {
    expect(
      recordedWorkMinutes(
        day({
          clockIn: '09:00',
          clockOut: '18:00',
          breakMinutes: 60,
          preShiftWorkMinutes: 30,
          postShiftWorkMinutes: 15,
          homeWorkMinutes: 45,
        }),
      ),
    ).toBe(570)
  })
  it('休憩未入力は0として在社時間から引かない', () => {
    expect(recordedWorkMinutes(day({ clockIn: '09:00', clockOut: '18:00' }))).toBe(540)
  })
})

describe('requiredBreakMinutes(労基法34条の一般則)', () => {
  it('6時間以下は0分', () => {
    expect(requiredBreakMinutes(360)).toBe(0)
  })
  it('6時間超は45分', () => {
    expect(requiredBreakMinutes(361)).toBe(45)
    expect(requiredBreakMinutes(480)).toBe(45)
  })
  it('8時間超は60分', () => {
    expect(requiredBreakMinutes(481)).toBe(60)
  })
})

describe('breakDeficitMinutes', () => {
  it('休憩未入力は判定不能(null)', () => {
    expect(breakDeficitMinutes(day({ clockIn: '09:00', clockOut: '19:00' }))).toBeNull()
  })
  it('9時間勤務で休憩30分なら30分不足', () => {
    expect(breakDeficitMinutes(day({ clockIn: '09:00', clockOut: '19:00', breakMinutes: 30 }))).toBe(30)
  })
  it('十分な休憩なら0', () => {
    expect(breakDeficitMinutes(day({ clockIn: '09:00', clockOut: '19:00', breakMinutes: 60 }))).toBe(0)
  })
})

describe('dailyOvertimeMinutes', () => {
  it('8時間以内は0', () => {
    expect(dailyOvertimeMinutes(day({ clockIn: '09:00', clockOut: '18:00', breakMinutes: 60 }))).toBe(0)
  })
  it('8時間を超えた分', () => {
    expect(dailyOvertimeMinutes(day({ clockIn: '09:00', clockOut: '20:00', breakMinutes: 60 }))).toBe(120)
  })
})

describe('isNightWork', () => {
  it('22時以降の退勤は深夜勤務', () => {
    expect(isNightWork(day({ clockIn: '09:00', clockOut: '22:30' }))).toBe(true)
  })
  it('通常勤務は深夜でない', () => {
    expect(isNightWork(day({ clockIn: '09:00', clockOut: '18:00' }))).toBe(false)
  })
  it('日をまたぐ勤務は深夜勤務', () => {
    expect(isNightWork(day({ clockIn: '13:00', clockOut: '01:00' }))).toBe(true)
  })
})

describe('datesInMonth', () => {
  it('9月は30日', () => {
    const dates = datesInMonth('2026-09')
    expect(dates).toHaveLength(30)
    expect(dates[0]).toBe('2026-09-01')
    expect(dates[29]).toBe('2026-09-30')
  })
  it('うるう年の2月', () => {
    expect(datesInMonth('2028-02')).toHaveLength(29)
  })
})
