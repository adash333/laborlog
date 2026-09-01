import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addMonths, localDateString, monthOf } from '../lib/time'
import { aggregateMonth, dataConfidence, overtimeHistoryByMonth } from '../lib/aggregate'
import { normalizeMonthlyInput } from '../types'
import { LEVEL_LABELS, assessMonth, type CategoryScore } from '../scoring/scoring'
import ScoreBar from '../components/ScoreBar'
import rules from '../scoring/rules.json'

export default function Risk() {
  const [month, setMonth] = useState(monthOf(localDateString()))
  const days = useLiveQuery(() => db.workdays.where('date').startsWith(month).toArray(), [month])
  const incidents = useLiveQuery(
    () => db.incidents.where('date').startsWith(month).toArray(),
    [month],
  )
  const monthlyInput = useLiveQuery(
    async () => (await db.monthlyInputs.get(month)) ?? null,
    [month],
  )
  const profile = useLiveQuery(() => db.profile.get(1), [])
  const allDays = useLiveQuery(() => db.workdays.toArray(), [])

  if (
    days === undefined ||
    incidents === undefined ||
    monthlyInput === undefined ||
    allDays === undefined
  )
    return null
  const agg = aggregateMonth(month, days)
  const history = overtimeHistoryByMonth(allDays)
  const risk = assessMonth(agg, incidents, normalizeMonthlyInput(monthlyInput), history)
  const recentMonths = Array.from({ length: 6 }, (_, i) => addMonths(month, -i)).filter(
    (m) => (history[m] ?? 0) > 0 || m === month,
  )
  const levelInfo = LEVEL_LABELS[risk.screenLevel]
  const confidence = dataConfidence(agg.recordedDays)
  const hasScheduleException =
    profile &&
    (profile.industryException !== 'none' || profile.workScheduleType !== 'standard')

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <button onClick={() => setMonth((m) => addMonths(m, -1))} className="px-3 py-1 text-brand">
          ←
        </button>
        <h1 className="text-lg font-bold">
          {Number(month.slice(0, 4))}年{Number(month.slice(5, 7))}月の勤務リスク
        </h1>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="px-3 py-1 text-brand">
          →
        </button>
      </header>

      {/* レッドフラッグ(総合点より優先表示:§30) */}
      {risk.redFlags.map((f) => (
        <section
          key={f.ruleId}
          className={`rounded-2xl p-4 text-sm ${
            f.severity === 'critical'
              ? 'bg-red-50 text-red-800'
              : 'bg-orange-50 text-orange-800'
          }`}
        >
          <p className="font-bold">🚨 {f.severity === 'critical' ? '重要な注意' : '注意'}</p>
          <p className="mt-1">{f.message}</p>
          {f.sourceUrl && (
            <a
              href={f.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block underline"
            >
              {f.sourceName}
            </a>
          )}
          <p className="mt-2">
            <Link to="/consult" className="font-bold underline">
              相談先を見る
            </Link>
          </p>
        </section>
      ))}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold">総合ブラック度</h2>
          <span className="text-sm font-bold">{levelInfo.label}</span>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums text-brand">
          {risk.totalScore}
          <span className="text-base font-normal text-slate-500"> / 100</span>
        </p>
        <p className="mt-2 text-sm text-slate-600">{levelInfo.message}</p>
      </section>

      <CategoryCard title="長時間労働・過重労働(30点)" cat={risk.longHours} />
      <CategoryCard title="未払い・勤務記録差異(25点)" cat={risk.unpaid}>
        <Link to={`/report/${month}`} className="text-xs text-brand underline">
          会社側の残業時間を入力する →
        </Link>
      </CategoryCard>
      <CategoryCard title="ハラスメント(20点)" cat={risk.harassment}>
        <Link to="/incidents" className="text-xs text-brand underline">
          出来事を記録・確認する →
        </Link>
      </CategoryCard>
      <CategoryCard title="休憩・休日(15点)" cat={risk.breaksHolidays} />
      <CategoryCard title="雇用上の圧力・退職妨害(10点)" cat={risk.pressure}>
        <Link to={`/report/${month}`} className="text-xs text-brand underline">
          該当項目をチェックする →
        </Link>
      </CategoryCard>

      {recentMonths.length >= 2 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">月別の推定時間外労働(直近)</h2>
          <ul className="space-y-1 text-sm">
            {recentMonths.map((m) => {
              const h = (history[m] ?? 0) / 60
              return (
                <li key={m} className="flex justify-between">
                  <span>
                    {Number(m.slice(0, 4))}年{Number(m.slice(5, 7))}月
                  </span>
                  <span className={`tabular-nums ${h >= 80 ? 'font-bold text-red-600' : h >= 45 ? 'text-amber-600' : 'text-slate-600'}`}>
                    約{Math.floor(h)}時間
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            2〜6か月平均で月80時間超、または月45時間超が年7か月以上になると、総合点とは別に注意を表示します。
          </p>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-bold">なぜこの点数?</h2>
        <p className="text-xs text-slate-600">
          スコアは、あなたの勤務記録と厚生労働省等の公的基準(月45時間の時間外労働の上限の目安、労基法の休憩基準など)を照らし合わせた参考指標です。以下の一次資料に基づいています。
        </p>
        <ul className="mt-2 space-y-1 text-xs">
          {rules.sources.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-brand underline">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">ルールセット版:{risk.rulesetVersion}</p>
      </section>

      {hasScheduleException && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
          あなたの勤務制度・職種では、一般的な労働時間ルールと異なる扱いがある可能性があります。スコアは勤務負荷を知る参考値として表示しています。
        </p>
      )}

      <p className="text-xs text-slate-500">
        データ信頼度:{confidence === 'high' ? '高' : confidence === 'medium' ? '中' : '低(まだ記録が少ないため、結果は参考値です)'}
        <br />
        このスコアは働き方のリスクを可視化した参考指標であり、会社の違法性や「ブラック企業」であることを法的に判定するものではありません。
      </p>
    </div>
  )
}

function CategoryCard({
  title,
  cat,
  children,
}: {
  title: string
  cat: CategoryScore
  children?: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {cat.insufficient && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            暫定値
          </span>
        )}
      </div>
      <ScoreBar label="スコア" score={cat.score} max={cat.maxScore} />
      <p className="mt-1 text-sm text-slate-600">{cat.message}</p>
      {cat.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {cat.reasons.map((r) => (
            <li key={r.label} className="flex justify-between gap-2">
              <span>{r.label}</span>
              <span className="shrink-0 tabular-nums">+{r.points}点</span>
            </li>
          ))}
        </ul>
      )}
      {children && <p className="mt-2">{children}</p>}
    </section>
  )
}
