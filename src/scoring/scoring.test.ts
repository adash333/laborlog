import { describe, expect, it } from 'vitest'
import type { MonthlyAggregate } from '../lib/aggregate'
import { emptyMonthlyInput, type Incident } from '../types'
import {
  assessMonth,
  breaksHolidaysScore,
  evaluateRedFlags,
  harassmentScore,
  longHoursScore,
  pressureScore,
  unpaidScore,
} from './scoring'

function incident(overrides: Partial<Incident> = {}): Incident {
  return {
    date: '2026-09-05',
    category: 'mental_attack',
    severity: 1,
    place: '',
    actor: '',
    description: '',
    witness: false,
    evidence: false,
    createdAt: '2026-09-05T12:00:00Z',
    ...overrides,
  }
}

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
    offClockMinutes: 0,
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

describe('unpaidScore(実装仕様書 §12–15)', () => {
  it('会社勤怠が未入力なら差分は判定せず暫定値', () => {
    const result = unpaidScore(agg({ overtimeMinutes: 30 * 60 }), null)
    expect(result.score).toBe(0)
    expect(result.insufficient).toBe(true)
    expect(result.message).toContain('未入力')
  })

  it('差異時間のスコア', () => {
    const input = { ...emptyMonthlyInput('2026-09'), companyOvertimeHours: 10 }
    expect(unpaidScore(agg({ overtimeMinutes: 10 * 60 }), input).score).toBe(0) // 差0h
    expect(unpaidScore(agg({ overtimeMinutes: 12 * 60 }), input).score).toBe(3) // 差2h
    expect(unpaidScore(agg({ overtimeMinutes: 17 * 60 }), input).score).toBe(6) // 差7h
    expect(unpaidScore(agg({ overtimeMinutes: 25 * 60 }), input).score).toBe(12) // 差15h
    expect(unpaidScore(agg({ overtimeMinutes: 35 * 60 }), input).score).toBe(18) // 差25h
    expect(unpaidScore(agg({ overtimeMinutes: 50 * 60 }), input).score).toBe(25) // 差40h
  })

  it('残業申告不可3回以上と勤怠外作業5時間以上で加点', () => {
    const result = unpaidScore(
      agg({ troubleCounts: { overtime_not_reported: 3 }, offClockMinutes: 300 }),
      null,
    )
    expect(result.score).toBe(6)
  })

  it('断定表現を使わない', () => {
    const input = { ...emptyMonthlyInput('2026-09'), companyOvertimeHours: 0 }
    const result = unpaidScore(agg({ overtimeMinutes: 25 * 60 }), input)
    expect(result.message).not.toContain('未払い残業があります')
    expect(result.message).toContain('差')
  })
})

describe('harassmentScore(実装仕様書 §17–19)', () => {
  it('深刻さごとの点数', () => {
    expect(harassmentScore([incident({ severity: 1 })]).score).toBe(1)
    expect(harassmentScore([incident({ severity: 2 })]).score).toBe(3)
    expect(harassmentScore([incident({ severity: 3 })]).score).toBe(6)
    expect(harassmentScore([incident({ severity: 4 })]).score).toBe(10)
  })

  it('同一カテゴリ3回以上で反復加点、上限20', () => {
    const three = [incident(), incident(), incident()]
    expect(harassmentScore(three).score).toBe(3 * 1 + 3)
    const five = [1, 2, 3, 4, 5].map(() => incident({ severity: 3 }))
    expect(harassmentScore(five).score).toBe(20) // 30+5 → クリップ
  })

  it('記録がなければ0', () => {
    expect(harassmentScore([]).score).toBe(0)
  })
})

describe('pressureScore(実装仕様書 §26)', () => {
  it('チェック項目の点数と上限10', () => {
    const input = {
      ...emptyMonthlyInput('2026-09'),
      pressureFlags: ['damage_claim_threat' as const],
    }
    expect(pressureScore(agg(), input).score).toBe(8)
    const both = {
      ...emptyMonthlyInput('2026-09'),
      pressureFlags: ['damage_claim_threat' as const, 'resignation_refused' as const],
    }
    expect(pressureScore(agg(), both).score).toBe(10) // 12 → クリップ
  })

  it('日々の「退職・有休を妨げられた」チェックを補助的に拾う', () => {
    const result = pressureScore(agg({ troubleCounts: { resignation_blocked: 2 } }), null)
    expect(result.score).toBe(2)
  })
})

describe('evaluateRedFlags', () => {
  it('深刻さ4の出来事でクリティカル', () => {
    const flags = evaluateRedFlags(agg(), [incident({ severity: 4 })], null)
    expect(flags.some((f) => f.ruleId === 'RF_HAR_001' && f.severity === 'critical')).toBe(true)
  })

  it('同一カテゴリ5回以上(深刻さ2以上)でhigh', () => {
    const five = [1, 2, 3, 4, 5].map(() => incident({ severity: 2 }))
    const flags = evaluateRedFlags(agg(), five, null)
    expect(flags.some((f) => f.ruleId === 'RF_HAR_004' && f.severity === 'high')).toBe(true)
  })

  it('暴力・重大な脅迫チェックでクリティカル', () => {
    const input = {
      ...emptyMonthlyInput('2026-09'),
      pressureFlags: ['violence_or_serious_threat' as const],
    }
    const flags = evaluateRedFlags(agg(), [], input)
    expect(flags.some((f) => f.ruleId === 'RF_PRESSURE_001' && f.severity === 'critical')).toBe(true)
  })
})

describe('evaluateRedFlags(長時間労働)', () => {
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
    expect(result.totalScore).toBe(0)
  })
  it('highフラッグは最低でもCONSULTに引き上げる', () => {
    const result = assessMonth(agg({ maxConsecutiveDays: 14 }))
    expect(['CONSULT', 'HIGH']).toContain(result.screenLevel)
  })
})
