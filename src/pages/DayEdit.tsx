import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, saveWorkDay } from '../db'
import { TROUBLE_ITEMS, emptyWorkDay, type TroubleId, type WorkDay } from '../types'
import { formatMinutes, recordedWorkMinutes, weekdayLabel } from '../lib/time'

export default function DayEdit() {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const [day, setDay] = useState<WorkDay | null>(null)

  useEffect(() => {
    if (!date) return
    db.workdays.get(date).then((d) => setDay(d ?? emptyWorkDay(date)))
  }, [date])

  if (!date || !day) return null

  const set = <K extends keyof WorkDay>(key: K, value: WorkDay[K]) =>
    setDay((d) => (d ? { ...d, [key]: value } : d))

  const toggleTrouble = (id: TroubleId) =>
    set(
      'troubles',
      day.troubles.includes(id) ? day.troubles.filter((t) => t !== id) : [...day.troubles, id],
    )

  const save = async () => {
    await saveWorkDay(day)
    navigate(-1)
  }

  const work = recordedWorkMinutes(day)

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-bold">
          {Number(date.slice(5, 7))}月{Number(date.slice(8, 10))}日({weekdayLabel(date)})の記録
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          修正した内容は履歴として内部に保存されます(相談時に記録の信頼性を示すためです)。
        </p>
      </header>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">出勤時刻</span>
            <input
              type="time"
              className="input"
              value={day.clockIn ?? ''}
              onChange={(e) => set('clockIn', e.target.value || null)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">退勤時刻</span>
            <input
              type="time"
              className="input"
              value={day.clockOut ?? ''}
              onChange={(e) => set('clockOut', e.target.value || null)}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">休憩(分)</span>
          <input
            type="number"
            min={0}
            className="input"
            value={day.breakMinutes ?? ''}
            placeholder="未入力"
            onChange={(e) =>
              set('breakMinutes', e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </label>

        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium">始業前作業(分)</span>
            <input
              type="number"
              min={0}
              className="input"
              value={day.preShiftWorkMinutes}
              onChange={(e) => set('preShiftWorkMinutes', Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">終業後作業(分)</span>
            <input
              type="number"
              min={0}
              className="input"
              value={day.postShiftWorkMinutes}
              onChange={(e) => set('postShiftWorkMinutes', Number(e.target.value) || 0)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium">自宅作業(分)</span>
            <input
              type="number"
              min={0}
              className="input"
              value={day.homeWorkMinutes}
              onChange={(e) => set('homeWorkMinutes', Number(e.target.value) || 0)}
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={day.holidayWork}
            onChange={(e) => set('holidayWork', e.target.checked)}
          />
          休日勤務だった
        </label>

        {work !== null && (
          <p className="text-sm">
            記録上の実勤務時間 <span className="font-bold">{formatMinutes(work)}</span>
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-bold">この日、困ったこと</h2>
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
        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-medium">出来事メモ(任意)</span>
          <textarea
            className="input min-h-24"
            placeholder="日時・場所・相手・実際の発言・目撃者・関連メールの有無など"
            value={day.memo}
            onChange={(e) => set('memo', e.target.value)}
          />
        </label>
      </section>

      <div className="flex gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex-1 rounded-xl border border-slate-300 bg-white py-3 font-medium"
        >
          キャンセル
        </button>
        <button onClick={save} className="flex-1 rounded-xl bg-brand py-3 font-bold text-white">
          保存
        </button>
      </div>
    </div>
  )
}
