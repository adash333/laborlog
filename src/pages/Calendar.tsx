import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  addMonths,
  datesInMonth,
  formatMinutes,
  localDateString,
  monthOf,
  recordedWorkMinutes,
  weekdayLabel,
} from '../lib/time'

export default function Calendar() {
  const [month, setMonth] = useState(monthOf(localDateString()))
  const days = useLiveQuery(() => db.workdays.where('date').startsWith(month).toArray(), [month])

  if (days === undefined) return null
  const byDate = new Map(days.map((d) => [d.date, d]))
  const today = localDateString()

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={() => setMonth((m) => addMonths(m, -1))} className="px-3 py-1 text-brand">
          ← 前月
        </button>
        <h1 className="text-lg font-bold">
          {Number(month.slice(0, 4))}年{Number(month.slice(5, 7))}月
        </h1>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="px-3 py-1 text-brand">
          翌月 →
        </button>
      </header>

      <div className="text-right">
        <Link to={`/report/${month}`} className="text-sm font-medium text-brand underline">
          この月のレポートを見る
        </Link>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm">
        {datesInMonth(month).map((date) => {
          const d = byDate.get(date)
          const work = d ? recordedWorkMinutes(d) : null
          const wd = weekdayLabel(date)
          const isFuture = date > today
          return (
            <li key={date}>
              <Link
                to={`/day/${date}`}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isFuture ? 'pointer-events-none opacity-40' : ''}`}
              >
                <span
                  className={`w-14 shrink-0 tabular-nums ${wd === '日' ? 'text-red-500' : wd === '土' ? 'text-blue-500' : ''}`}
                >
                  {Number(date.slice(8, 10))}日({wd})
                </span>
                {d?.clockIn ? (
                  <>
                    <span className="tabular-nums text-slate-600">
                      {d.clockIn}〜{d.clockOut ?? '未退勤'}
                    </span>
                    {work !== null && <span className="font-medium">{formatMinutes(work)}</span>}
                    {d.troubles.length > 0 && <span title="困ったことあり">⚠️</span>}
                    {d.holidayWork && <span className="text-xs text-red-500">休日出勤</span>}
                  </>
                ) : (
                  <span className="text-slate-300">記録なし</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
