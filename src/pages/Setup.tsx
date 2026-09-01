import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import type { EmploymentType, IndustryException, Profile, WorkScheduleType } from '../types'

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'regular_employee', label: '正社員' },
  { value: 'contract_employee', label: '契約社員' },
  { value: 'other_direct_employee', label: 'その他の直接雇用' },
]

const SCHEDULE_OPTIONS: { value: WorkScheduleType; label: string }[] = [
  { value: 'standard', label: '通常(固定時間制)' },
  { value: 'variable_working_hours', label: '変形労働時間制' },
  { value: 'flex', label: 'フレックスタイム制' },
  { value: 'shift', label: 'シフト制' },
  { value: 'unknown', label: 'わからない' },
]

const INDUSTRY_OPTIONS: { value: IndustryException; label: string }[] = [
  { value: 'none', label: '特になし' },
  { value: 'doctor', label: '医師' },
  { value: 'driver', label: '自動車運転業務' },
  { value: 'construction', label: '建設業' },
  { value: 'other', label: 'その他の特例対象' },
  { value: 'unknown', label: 'わからない' },
]

export default function Setup() {
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState<Profile>({
    id: 1,
    employmentType: 'regular_employee',
    industryException: 'none',
    workScheduleType: 'standard',
    scheduledStart: '09:00',
    scheduledEnd: '18:00',
    scheduledBreakMinutes: 60,
    workdaysPerWeek: 5,
    hasFixedOvertimePay: false,
    fixedOvertimeHours: null,
  })

  useEffect(() => {
    db.profile.get(1).then((p) => {
      if (p) setForm(p)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return null

  const save = async () => {
    await db.profile.put(form)
    navigate('/')
  }

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-brand">勤務条件の登録</h1>
        <p className="mt-1 text-sm text-slate-600">
          あなたの所定勤務条件を登録します。すべての情報はこの端末の中だけに保存され、外部には送信されません。
        </p>
      </header>

      <Field label="雇用形態">
        <select
          className="input"
          value={form.employmentType}
          onChange={(e) => set('employmentType', e.target.value as EmploymentType)}
        >
          {EMPLOYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="所定勤務開始">
          <input
            type="time"
            className="input"
            value={form.scheduledStart}
            onChange={(e) => set('scheduledStart', e.target.value)}
          />
        </Field>
        <Field label="所定勤務終了">
          <input
            type="time"
            className="input"
            value={form.scheduledEnd}
            onChange={(e) => set('scheduledEnd', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="所定休憩(分)">
          <input
            type="number"
            min={0}
            className="input"
            value={form.scheduledBreakMinutes}
            onChange={(e) => set('scheduledBreakMinutes', Number(e.target.value))}
          />
        </Field>
        <Field label="週の勤務日数">
          <input
            type="number"
            min={1}
            max={7}
            className="input"
            value={form.workdaysPerWeek}
            onChange={(e) => set('workdaysPerWeek', Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="勤務制度">
        <select
          className="input"
          value={form.workScheduleType}
          onChange={(e) => set('workScheduleType', e.target.value as WorkScheduleType)}
        >
          {SCHEDULE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="職種・業種の特例">
        <select
          className="input"
          value={form.industryException}
          onChange={(e) => set('industryException', e.target.value as IndustryException)}
        >
          {INDUSTRY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.hasFixedOvertimePay}
            onChange={(e) => set('hasFixedOvertimePay', e.target.checked)}
          />
          固定残業代(みなし残業代)がある
        </label>
        {form.hasFixedOvertimePay && (
          <Field label="固定残業時間(時間/月・分かる場合)">
            <input
              type="number"
              min={0}
              className="input"
              value={form.fixedOvertimeHours ?? ''}
              onChange={(e) =>
                set('fixedOvertimeHours', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </Field>
        )}
      </div>

      <button
        onClick={save}
        className="w-full rounded-xl bg-brand py-3 font-bold text-white active:bg-brand-light"
      >
        保存してはじめる
      </button>

      <p className="text-xs text-slate-500">
        まもログが表示するスコアは、勤務記録から働き方のリスクを可視化した参考指標です。会社の違法性や「ブラック企業」であることを法的に判定するものではありません。
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
