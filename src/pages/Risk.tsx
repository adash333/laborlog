import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addMonths, localDateString, monthOf } from '../lib/time'
import { aggregateMonth, dataConfidence } from '../lib/aggregate'
import { LEVEL_LABELS, assessMonth, type CategoryScore } from '../scoring/scoring'
import ScoreBar from '../components/ScoreBar'
import rules from '../scoring/rules.json'

export default function Risk() {
  const [month, setMonth] = useState(monthOf(localDateString()))
  const days = useLiveQuery(() => db.workdays.where('date').startsWith(month).toArray(), [month])
  const profile = useLiveQuery(() => db.profile.get(1), [])

  if (days === undefined) return null
  const agg = aggregateMonth(month, days)
  const risk = assessMonth(agg)
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
          <h2 className="text-sm font-bold">総合評価(参考値)</h2>
          <span className="text-sm font-bold">{levelInfo.label}</span>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums text-brand">
          {risk.availableScore}
          <span className="text-base font-normal text-slate-500"> / {risk.availableMax}</span>
        </p>
        <p className="mt-2 text-sm text-slate-600">{levelInfo.message}</p>
        <p className="mt-2 text-xs text-slate-500">
          現在は「長時間労働(30点)」「休憩・休日(15点)」のみ評価しています。未払い(25点)・ハラスメント(20点)・雇用上の圧力(10点)は今後のアップデートで追加されます。
        </p>
      </section>

      <CategoryCard title="長時間労働・過重労働" cat={risk.longHours} />
      <CategoryCard title="休憩・休日" cat={risk.breaksHolidays} />

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

function CategoryCard({ title, cat }: { title: string; cat: CategoryScore }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      <ScoreBar label="スコア" score={cat.score} max={cat.maxScore} />
      <p className="mt-1 text-sm text-slate-600">{cat.message}</p>
      {cat.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {cat.reasons.map((r) => (
            <li key={r.label} className="flex justify-between">
              <span>{r.label}</span>
              <span className="tabular-nums">+{r.points}点</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
