// まもログ データモデル(docs/specs/implementation-spec.md §3–4 準拠)

export type EmploymentType = 'regular_employee' | 'contract_employee' | 'other_direct_employee'

export type IndustryException =
  | 'none'
  | 'doctor'
  | 'driver'
  | 'construction'
  | 'other'
  | 'unknown'

export type WorkScheduleType = 'standard' | 'variable_working_hours' | 'flex' | 'shift' | 'unknown'

export interface Profile {
  id: number // 常に 1(シングルトン)
  employmentType: EmploymentType
  industryException: IndustryException
  workScheduleType: WorkScheduleType
  scheduledStart: string // "09:00"
  scheduledEnd: string // "18:00"
  scheduledBreakMinutes: number
  workdaysPerWeek: number
  hasFixedOvertimePay: boolean
  fixedOvertimeHours: number | null
}

// 「今日、困ったこと」チェック項目(§5)
export const TROUBLE_ITEMS = [
  { id: 'overtime_not_reported', label: '残業を申告できなかった' },
  { id: 'pre_shift_work', label: '始業前に仕事をした' },
  { id: 'post_shift_work', label: '退勤後に仕事をした' },
  { id: 'home_work', label: '自宅で仕事をした' },
  { id: 'holiday_work', label: '休日に仕事をした' },
  { id: 'shouted_at', label: '怒鳴られた・侮辱された' },
  { id: 'ignored', label: '無視・仲間外れにされた' },
  { id: 'sexual', label: '性的に不快な言動等があった' },
  { id: 'resignation_blocked', label: '退職・有休を妨げられた' },
  { id: 'sick_forced', label: '体調不良でも勤務を求められた' },
  { id: 'other', label: 'その他' },
] as const

export type TroubleId = (typeof TROUBLE_ITEMS)[number]['id']

export interface WorkDay {
  date: string // "YYYY-MM-DD"(主キー)
  clockIn: string | null // "08:42"
  clockOut: string | null
  breakMinutes: number | null // null = 未入力(0扱いしない:§39)
  homeWorkMinutes: number
  preShiftWorkMinutes: number
  postShiftWorkMinutes: number
  holidayWork: boolean
  troubles: TroubleId[]
  memo: string
  updatedAt: string // ISO8601
}

export function emptyWorkDay(date: string): WorkDay {
  return {
    date,
    clockIn: null,
    clockOut: null,
    breakMinutes: null,
    homeWorkMinutes: 0,
    preShiftWorkMinutes: 0,
    postShiftWorkMinutes: 0,
    holidayWork: false,
    troubles: [],
    memo: '',
    updatedAt: new Date().toISOString(),
  }
}

// 記録の修正履歴(企画書 §4.2:修正履歴は内部に残す)
export interface AuditEntry {
  id?: number
  date: string // 対象の勤務日
  at: string // 記録時刻 ISO8601
  snapshot: string // WorkDay の JSON
}
