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

// ハラスメント等の出来事カテゴリ(実装仕様書 §16:厚労省パワハラ6類型+セクハラ等)
export const HARASSMENT_CATEGORIES = [
  { id: 'physical_attack', label: '身体的な攻撃(叩かれた・蹴られた・物を投げられた等)' },
  { id: 'mental_attack', label: '精神的な攻撃(怒鳴られた・人格否定・脅された等)' },
  { id: 'isolation', label: '人間関係からの切り離し(無視・仲間外れ・会議から外される等)' },
  { id: 'excessive_demand', label: '過大な要求(明らかに達成困難な仕事の強制等)' },
  { id: 'insufficient_demand', label: '過小な要求(仕事を与えられない等)' },
  { id: 'privacy_intrusion', label: '個の侵害(私生活への執拗な介入等)' },
  { id: 'sexual_harassment', label: '性的な言動・接触等' },
  { id: 'pregnancy_parental', label: '妊娠・出産・育休等に関する不利益・嫌がらせ' },
  { id: 'other', label: 'その他' },
] as const

export type HarassmentCategory = (typeof HARASSMENT_CATEGORIES)[number]['id']

// 深刻さ(実装仕様書 §17)
export const SEVERITY_OPTIONS = [
  { value: 1, label: '不快だった' },
  { value: 2, label: '繰り返された・皆の前で屈辱的だった' },
  { value: 3, label: '深刻だった(強い威圧・継続的な隔離など)' },
  { value: 4, label: '暴力・重大な性的言動・強い脅迫があった' },
] as const

export interface Incident {
  id?: number
  date: string // "YYYY-MM-DD"
  category: HarassmentCategory
  severity: 1 | 2 | 3 | 4
  place: string
  actor: string // 相手(役職や呼び方でよい)
  description: string // 出来事・実際の発言
  witness: boolean // 目撃者がいた
  evidence: boolean // メール・チャット等の証拠がある
  createdAt: string
}

// 雇用上の圧力チェック項目(実装仕様書 §26)
export const PRESSURE_ITEMS = [
  { id: 'resignation_refused', label: '退職届を受け取ってもらえない・退職を妨げられた' },
  { id: 'threatened_after_resignation', label: '退職を申し出た後に威圧された' },
  { id: 'damage_claim_threat', label: '「損害賠償を請求する」などと脅された' },
  { id: 'penalty_or_fine', label: '不合理な罰金・弁償を求められた' },
  { id: 'retaliation_after_consultation', label: '相談・通報したことへの報復を受けた' },
  { id: 'union_related_disadvantage', label: '労働組合に関することで不利益な扱いを受けた' },
  { id: 'leave_related_disadvantage', label: '有休・産休・育休等を理由に不利益な扱いを受けた' },
  { id: 'forced_illegal_action', label: '明らかな違法行為への加担を強要された' },
  { id: 'violence_or_serious_threat', label: '暴力・重大な脅迫を受けた' },
] as const

export type PressureItemId = (typeof PRESSURE_ITEMS)[number]['id']

// 月次入力(会社側の記録との比較・雇用上の圧力チェック)
export interface MonthlyInput {
  month: string // "YYYY-MM"(主キー)
  companyOvertimeHours: number | null // 会社の勤怠上の残業時間
  payslipOvertimeHours: number | null // 給与明細に記載された残業時間
  pressureFlags: PressureItemId[]
  updatedAt: string
}

export function emptyMonthlyInput(month: string): MonthlyInput {
  return {
    month,
    companyOvertimeHours: null,
    payslipOvertimeHours: null,
    pressureFlags: [],
    updatedAt: new Date().toISOString(),
  }
}
