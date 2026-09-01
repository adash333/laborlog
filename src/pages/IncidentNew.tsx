import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db'
import {
  HARASSMENT_CATEGORIES,
  SEVERITY_OPTIONS,
  type HarassmentCategory,
  type Incident,
} from '../types'
import { localDateString } from '../lib/time'

export default function IncidentNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState<Incident>({
    date: params.get('date') ?? localDateString(),
    category: 'mental_attack',
    severity: 1,
    place: '',
    actor: '',
    description: '',
    witness: false,
    evidence: false,
    createdAt: new Date().toISOString(),
  })
  const [quickSave, setQuickSave] = useState(false)

  const set = <K extends keyof Incident>(key: K, value: Incident[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    await db.incidents.add({ ...form, createdAt: new Date().toISOString() })
    navigate('/incidents')
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-bold">出来事を記録する</h1>
        <p className="mt-1 text-xs text-slate-500">
          つらいときは「最低限だけ保存」で日付と種類だけ残し、後から詳しく書くこともできます。
        </p>
      </header>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">いつ</span>
          <input
            type="date"
            className="input"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">どんな出来事</span>
          <select
            className="input"
            value={form.category}
            onChange={(e) => set('category', e.target.value as HarassmentCategory)}
          >
            {HARASSMENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-1 block text-sm font-medium">深刻さ</span>
          <div className="space-y-1.5">
            {SEVERITY_OPTIONS.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="severity"
                  checked={form.severity === s.value}
                  onChange={() => set('severity', s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={quickSave}
            onChange={(e) => setQuickSave(e.target.checked)}
          />
          最低限だけ保存する(詳細は後で書く)
        </label>

        {!quickSave && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">場所(任意)</span>
                <input
                  type="text"
                  className="input"
                  placeholder="会議室・フロアなど"
                  value={form.place}
                  onChange={(e) => set('place', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">相手(任意)</span>
                <input
                  type="text"
                  className="input"
                  placeholder="役職・呼び方でOK"
                  value={form.actor}
                  onChange={(e) => set('actor', e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">出来事・実際の発言(任意)</span>
              <textarea
                className="input min-h-28"
                placeholder="できるだけ実際の発言をそのまま。「」付きで書いておくと後で役立ちます"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </label>

            <div className="flex gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.witness}
                  onChange={(e) => set('witness', e.target.checked)}
                />
                目撃者がいた
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.evidence}
                  onChange={(e) => set('evidence', e.target.checked)}
                />
                メール・チャット等の証拠がある
              </label>
            </div>
          </>
        )}
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

      <p className="text-xs text-slate-500">
        この記録はこの端末の中だけに保存されます。外部には送信されません。
      </p>
    </div>
  )
}
