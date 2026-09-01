import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db, saveWorkDay } from '../db'
import { TROUBLE_ITEMS, emptyWorkDay, type TroubleId } from '../types'
import {
  formatMinutes,
  localDateString,
  monthOf,
  nowHHMM,
  recordedWorkMinutes,
  weekdayLabel,
} from '../lib/time'
import { aggregateMonth } from '../lib/aggregate'
import { LEVEL_LABELS, assessMonth } from '../scoring/scoring'
import ScoreBar from '../components/ScoreBar'

const BREAK_OPTIONS = [
  { label: '60分以上', minutes: 60 },
  { label: '45〜59分', minutes: 45 },
  { label: '30〜44分', minutes: 30 },
  { label: '1〜29分', minutes: 15 },
  { label: 'ほぼ取れなかった', minutes: 0 },
]

export default function Home() {
  const today = localDateString()
  const month = monthOf(today)
  const day = useLiveQuery(async () => (await db.workdays.get(today)) ?? null, [today])
  const monthDays = useLiveQuery(
    () => db.workdays.where('date').startsWith(month).toArray(),
    [month],
  )

  if (day === undefined || monthDays === undefined) return null

  const agg = aggregateMonth(month, monthDays)
  const risk = assessMonth(agg)
  const levelInfo = LEVEL_LABELS[risk.screenLevel]
  const work = day ? recordedWorkMinutes(day) : null

  const clockIn = async () => {
    await saveWorkDay({ ...(day ?? emptyWorkDay(today)), clockIn: nowHHMM() })
  }
  const clockOut = async () => {
    await saveWorkDay({ ...(day ?? emptyWorkDay(today)), clockOut: nowHHMM() })
  }
  const setBreak = async (minutes: number) => {
    if (!day) return
    await saveWorkDay({ ...day, breakMinutes: minutes })
  }
  const toggleTrouble = async (id: TroubleId) => {
    if (!day) return
    const troubles = day.troubles.includes(id)
      ? day.troubles.filter((t) => t !== id)
      : [...day.troubles, id]
    await saveWorkDay({ ...day, troubles })
  }

  return (
    <div className="space-y-5">
      <header className="flex items-baseline justify-between">
        <h1 className="text-lg font-bold">
          {Number(today.slice(5, 7))}月{Number(today.slice(8, 10))}日({weekdayLabel(today)})
        </h1>
        <span className="text-xs text-slate-500">まもログ</span>
      </header>

      {/* 出退勤カード */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={clockIn}
            disabled={!!day?.clockIn}
            className="rounded-xl bg-brand py-4 text-lg font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
          >
            {day?.clockIn ? `出勤 ${day.clockIn}` : '出勤'}
          </button>
          <button
            onClick={clockOut}
            disabled={!day?.clockIn || !!day?.clockOut}
            className="rounded-xl bg-slate-700 py-4 text-lg font-bold text-white disabled:bg-slate-200 disabled:text-slate-500"
          >
            {day?.clockOut ? `退勤 ${day.clockOut}` : '退勤'}
          </button>
        </div>
        {work !== null && (
          <p className="mt-3 text-center text-sm">
            実勤務時間 <span className="font-bold">{formatMinutes(work)}</span>
          </p>
        )}
        {day?.clockIn && (
          <p className="mt-2 text-center">
            <Link to={`/day/${today}`} className="text-xs text-brand underline">
              時刻を修正・詳細を入力する
            </Link>
          </p>
        )}
      </section>

      {/* 退勤後の追加入力(通常日は任意) */}
      {day?.clockOut && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <h2 className="mb-2 text-sm font-bold">今日の休憩は?</h2>
            <div className="flex flex-wrap gap-2">
              {BREAK_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  onClick={() => setBreak(o.minutes)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    day.breakMinutes === o.minutes
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-bold">今日、困ったことは?(なければそのままでOK)</h2>
            <div className="space-y-1.5">
              {TROUBLE_ITEMS.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={day.troubles.includes(t.id)}
                    onChange={() => toggleTrouble(t.id)}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 今月のリスク概要 */}
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold">今月の勤務リスク</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${levelBadgeClass(risk.screenLevel)}`}
          >
            {levelInfo.label}
          </span>
        </div>
        <ScoreBar label="長時間労働" score={risk.longHours.score} max={risk.longHours.maxScore} />
        <ScoreBar
          label="休憩・休日"
          score={risk.breaksHolidays.score}
          max={risk.breaksHolidays.maxScore}
        />
        <p className="mt-2 text-xs text-slate-500">
          未払い・ハラスメント・雇用圧力の評価は今後のアップデートで追加されます。
        </p>
        {risk.redFlags.length > 0 && (
          <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-medium text-red-700">
            🚨 重要な注意があります。「リスク」タブで確認してください。
          </p>
        )}
        <div className="mt-3 flex gap-3">
          <Link to="/risk" className="text-sm font-medium text-brand underline">
            詳しく見る
          </Link>
          <Link to={`/report/${month}`} className="text-sm font-medium text-brand underline">
            月次レポート
          </Link>
        </div>
      </section>
    </div>
  )
}

function levelBadgeClass(level: string): string {
  switch (level) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-red-100 text-red-700'
    case 'CONSULT':
      return 'bg-orange-100 text-orange-700'
    case 'REVIEW':
      return 'bg-amber-100 text-amber-700'
    case 'CAUTION':
      return 'bg-yellow-100 text-yellow-700'
    default:
      return 'bg-emerald-100 text-emerald-700'
  }
}
