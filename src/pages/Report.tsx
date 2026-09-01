import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  LEAVE_ITEMS,
  PRESSURE_ITEMS,
  TROUBLE_ITEMS,
  emptyMonthlyInput,
  normalizeMonthlyInput,
  type LeaveItemId,
  type MonthlyInput,
  type PressureItemId,
  type WorkDay,
} from '../types'
import { formatMinutes, recordedWorkMinutes } from '../lib/time'
import { aggregateMonth, dataConfidence } from '../lib/aggregate'

export default function Report() {
  const { month } = useParams<{ month: string }>()
  const days = useLiveQuery(
    () =>
      month
        ? db.workdays.where('date').startsWith(month).toArray()
        : Promise.resolve<WorkDay[]>([]),
    [month],
  )

  if (!month || days === undefined) return null
  const agg = aggregateMonth(month, days)
  const confidence = dataConfidence(agg.recordedDays)

  const downloadCsv = () => {
    const header = '日付,出勤,退勤,休憩(分),始業前(分),終業後(分),自宅(分),休日勤務,実勤務(分),困ったこと,メモ'
    const rows = [...days]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const work = recordedWorkMinutes(d)
        const troubles = d.troubles
          .map((t) => TROUBLE_ITEMS.find((i) => i.id === t)?.label ?? t)
          .join('・')
        return [
          d.date,
          d.clockIn ?? '',
          d.clockOut ?? '',
          d.breakMinutes ?? '',
          d.preShiftWorkMinutes,
          d.postShiftWorkMinutes,
          d.homeWorkMinutes,
          d.holidayWork ? '1' : '',
          work ?? '',
          csvEscape(troubles),
          csvEscape(d.memo),
        ].join(',')
      })
    const bom = '﻿'
    const blob = new Blob([bom + [header, ...rows].join('\r\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mamolog-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">
          {Number(month.slice(0, 4))}年{Number(month.slice(5, 7))}月の勤務レポート
        </h1>
        <Link to="/calendar" className="text-sm text-brand underline">
          カレンダー
        </Link>
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <dl className="space-y-2 text-sm">
          <Row label="記録のある勤務日" value={`${agg.recordedDays}日`} />
          <Row label="記録上の勤務時間" value={formatMinutes(agg.totalWorkMinutes)} />
          <Row label="推定時間外労働" value={formatMinutes(agg.overtimeMinutes)} />
          <Row
            label="最長勤務時間"
            value={agg.longestDayMinutes > 0 ? formatMinutes(agg.longestDayMinutes) : '—'}
          />
          <Row label="最大連続勤務" value={`${agg.maxConsecutiveDays}日`} />
          <Row label="休憩不足" value={`${agg.breakDeficitDays}日`} />
          <Row label="休日勤務" value={`${agg.holidayWorkDays}日`} />
          <Row label="深夜勤務(22時〜5時)" value={`${agg.nightWorkDays}日`} />
        </dl>
        {agg.breakUnknownDays > 0 && (
          <p className="mt-2 text-xs text-amber-600">
            休憩が未入力の日が{agg.breakUnknownDays}日あります(その日は休憩不足の判定をしていません)。
          </p>
        )}
      </section>

      {Object.keys(agg.troubleCounts).length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">困った出来事</h2>
          <dl className="space-y-1.5 text-sm">
            {TROUBLE_ITEMS.filter((t) => agg.troubleCounts[t.id]).map((t) => (
              <Row key={t.id} label={t.label} value={`${agg.troubleCounts[t.id]}回`} />
            ))}
          </dl>
        </section>
      )}

      <MonthlyInputCard month={month} selfOvertimeMinutes={agg.overtimeMinutes} />

      <Link
        to={`/print/${month}`}
        className="block w-full rounded-xl bg-brand py-3 text-center font-bold text-white"
      >
        相談用レポートを作成(PDF保存)
      </Link>
      <button
        onClick={downloadCsv}
        className="w-full rounded-xl border border-brand bg-white py-3 font-bold text-brand"
      >
        CSVをダウンロード
      </button>

      <p className="text-xs text-slate-500">
        データ信頼度:{confidence === 'high' ? '高' : confidence === 'medium' ? '中' : '低(記録が少ないため参考値です)'}
        <br />
        推定時間外労働は「1日8時間を超えた分」の暫定推計です。変形労働時間制・フレックスタイム制等では実際の法的評価と異なる場合があり、法的な労働時間・残業代を確定するものではありません。
      </p>
    </div>
  )
}

/** 会社側の記録との比較入力+雇用上の圧力チェック(月単位) */
function MonthlyInputCard({
  month,
  selfOvertimeMinutes,
}: {
  month: string
  selfOvertimeMinutes: number
}) {
  const stored = useLiveQuery(async () => (await db.monthlyInputs.get(month)) ?? null, [month])
  const [input, setInput] = useState<MonthlyInput | null>(null)

  useEffect(() => {
    if (stored !== undefined)
      setInput(normalizeMonthlyInput(stored) ?? emptyMonthlyInput(month))
  }, [stored, month])

  if (!input) return null

  const save = async (next: MonthlyInput) => {
    setInput(next)
    await db.monthlyInputs.put({ ...next, updatedAt: new Date().toISOString() })
  }

  const togglePressure = (id: PressureItemId) => {
    const flags = input.pressureFlags.includes(id)
      ? input.pressureFlags.filter((f) => f !== id)
      : [...input.pressureFlags, id]
    save({ ...input, pressureFlags: flags })
  }

  const toggleLeave = (id: LeaveItemId) => {
    const flags = input.leaveFlags.includes(id)
      ? input.leaveFlags.filter((f) => f !== id)
      : [...input.leaveFlags, id]
    save({ ...input, leaveFlags: flags })
  }

  const selfH = Math.floor(selfOvertimeMinutes / 60)
  const diff =
    input.companyOvertimeHours !== null
      ? Math.max(selfOvertimeMinutes / 60 - input.companyOvertimeHours, 0)
      : null

  return (
    <>
      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">会社側の記録との比較</h2>
        <p className="text-xs text-slate-600">
          会社の勤怠システムや給与明細に記載された残業時間を入力すると、あなたの記録(推定時間外労働
          約{selfH}時間)との差を確認できます。
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium">会社の勤怠上の残業(時間/月)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              className="input"
              placeholder="未入力"
              value={input.companyOvertimeHours ?? ''}
              onChange={(e) =>
                save({
                  ...input,
                  companyOvertimeHours: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">給与明細の残業(時間/月)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              className="input"
              placeholder="未入力"
              value={input.payslipOvertimeHours ?? ''}
              onChange={(e) =>
                save({
                  ...input,
                  payslipOvertimeHours: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </label>
        </div>
        {diff !== null && diff >= 1 && (
          <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
            あなたの記録と会社側の記録に約{Math.floor(diff)}時間の差があります。
            計算方法や勤務条件を確認してください(この表示は未払いを断定するものではありません)。
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">有給休暇について(この月に該当があればチェック)</h2>
        <div className="space-y-1.5">
          {LEAVE_ITEMS.map((item) => (
            <label key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={input.leaveFlags.includes(item.id)}
                onChange={() => toggleLeave(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>
        <label className="block pt-1">
          <span className="mb-1 block text-xs font-medium">この月に取得した有休(日数・任意)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            className="input"
            placeholder="未入力"
            value={input.paidLeaveDays ?? ''}
            onChange={(e) =>
              save({ ...input, paidLeaveDays: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </label>
        <p className="text-xs text-slate-500">
          年次有給休暇は労働基準法で定められた権利です。断られた場合は、日時とやり取りを出来事メモに残しておきましょう。
        </p>
      </section>

      <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">雇用上の圧力(この月に該当があればチェック)</h2>
        <div className="space-y-1.5">
          {PRESSURE_ITEMS.map((item) => (
            <label key={item.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={input.pressureFlags.includes(item.id)}
                onChange={() => togglePressure(item.id)}
              />
              {item.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          具体的な経緯は
          <Link to="/incident/new" className="text-brand underline">
            出来事の記録
          </Link>
          に残しておくことをおすすめします。
        </p>
      </section>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function csvEscape(s: string): string {
  if (s === '') return ''
  return `"${s.replaceAll('"', '""')}"`
}
