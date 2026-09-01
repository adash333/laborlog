import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { HARASSMENT_CATEGORIES, SEVERITY_OPTIONS } from '../types'
import { weekdayLabel } from '../lib/time'

export default function Incidents() {
  const incidents = useLiveQuery(() => db.incidents.orderBy('date').reverse().toArray(), [])

  if (incidents === undefined) return null

  const remove = async (id: number | undefined) => {
    if (id === undefined) return
    if (!window.confirm('この出来事の記録を削除しますか?(相談時の資料としては、残しておくことをおすすめします)')) return
    await db.incidents.delete(id)
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold">出来事の記録</h1>
        <p className="mt-1 text-sm text-slate-600">
          ハラスメントや雇用上の圧力など、困った出来事を具体的に記録します。日時・相手・実際の発言を残しておくことが、後であなたを守る材料になります。
        </p>
      </header>

      <Link
        to="/incident/new"
        className="block w-full rounded-xl bg-brand py-3 text-center font-bold text-white"
      >
        + 新しく記録する
      </Link>

      {incidents.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
          まだ記録はありません。
        </p>
      ) : (
        <ul className="space-y-3">
          {incidents.map((inc) => {
            const cat = HARASSMENT_CATEGORIES.find((c) => c.id === inc.category)
            const sev = SEVERITY_OPTIONS.find((s) => s.value === inc.severity)
            return (
              <li key={inc.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">
                      {Number(inc.date.slice(5, 7))}月{Number(inc.date.slice(8, 10))}日(
                      {weekdayLabel(inc.date)})
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">{cat?.label.split('(')[0]}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      inc.severity >= 4
                        ? 'bg-red-100 text-red-700'
                        : inc.severity >= 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {sev?.label.split('(')[0]}
                  </span>
                </div>
                {inc.description && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{inc.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                  {inc.place && <span>場所:{inc.place}</span>}
                  {inc.actor && <span>相手:{inc.actor}</span>}
                  {inc.witness && <span className="text-emerald-700">目撃者あり</span>}
                  {inc.evidence && <span className="text-emerald-700">証拠あり</span>}
                </div>
                <div className="mt-2 text-right">
                  <button onClick={() => remove(inc.id)} className="text-xs text-red-500 underline">
                    削除
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-slate-500">
        記録された出来事は、厚生労働省が示す典型例との共通点をもとにリスクスコアへ反映されます。法的にハラスメントに該当するかどうかは、文脈を含めた個別の判断が必要です。
      </p>
    </div>
  )
}
