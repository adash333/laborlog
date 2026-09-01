import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  HARASSMENT_CATEGORIES,
  SEVERITY_OPTIONS,
  TROUBLE_ITEMS,
  type AuditEntry,
  type Incident,
  type WorkDay,
} from '../types'
import { formatMinutes, recordedWorkMinutes, weekdayLabel } from '../lib/time'
import { aggregateMonth } from '../lib/aggregate'

/**
 * 相談用「勤務状況記録レポート」(実装仕様書 §37)。
 * 事実の記録のみを載せ、「ブラック企業」「違法」等の断定表現・スコアは含めない。
 * ブラウザの印刷機能からPDFとして保存する。
 */
export default function PrintReport() {
  const { month } = useParams<{ month: string }>()
  const days = useLiveQuery(
    () => (month ? db.workdays.where('date').startsWith(month).toArray() : Promise.resolve<WorkDay[]>([])),
    [month],
  )
  const incidents = useLiveQuery(
    () =>
      month
        ? db.incidents.where('date').startsWith(month).toArray()
        : Promise.resolve<Incident[]>([]),
    [month],
  )
  const input = useLiveQuery(
    async () => (month ? ((await db.monthlyInputs.get(month)) ?? null) : null),
    [month],
  )
  const audits = useLiveQuery(
    () =>
      month
        ? db.auditLog.where('date').startsWith(month).toArray()
        : Promise.resolve<AuditEntry[]>([]),
    [month],
  )

  if (!month || days === undefined || incidents === undefined || input === undefined || audits === undefined)
    return null

  const agg = aggregateMonth(month, days)
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const sortedIncidents = [...incidents].sort((a, b) => a.date.localeCompare(b.date))
  const selfOvertimeH = agg.overtimeMinutes / 60
  const diff =
    input?.companyOvertimeHours != null ? Math.max(selfOvertimeH - input.companyOvertimeHours, 0) : null
  const payslipDiff =
    input?.payslipOvertimeHours != null ? Math.max(selfOvertimeH - input.payslipOvertimeHours, 0) : null

  // 修正履歴:日ごとの保存回数(2回以上=修正あり)
  const auditByDate = new Map<string, number>()
  for (const a of audits) auditByDate.set(a.date, (auditByDate.get(a.date) ?? 0) + 1)
  const editedDays = [...auditByDate.entries()].filter(([, n]) => n >= 2)

  const yearNum = Number(month.slice(0, 4))
  const monthNum = Number(month.slice(5, 7))

  return (
    <div className="mx-auto max-w-2xl bg-white p-6 text-[13px] leading-relaxed text-black print:max-w-none print:p-0">
      <div className="mb-4 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl bg-brand py-3 font-bold text-white"
        >
          印刷 / PDFとして保存
        </button>
        <button
          onClick={() => history.back()}
          className="rounded-xl border border-slate-300 px-4 font-medium"
        >
          戻る
        </button>
      </div>
      <p className="mb-4 text-xs text-slate-500 print:hidden">
        印刷画面で送信先を「PDFに保存」にすると、PDFファイルとして保存できます。
      </p>

      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-lg font-bold">勤務状況記録レポート</h1>
        <p className="mt-1">
          対象期間:{yearNum}年{monthNum}月1日〜{monthNum}月末日
          <span className="ml-4">作成日:{new Date().toLocaleDateString('ja-JP')}</span>
        </p>
        <p className="text-[11px] text-slate-600">
          本レポートは本人がアプリ「まもログ」に日々記録した内容の出力であり、法的な労働時間・賃金等を確定するものではありません。
        </p>
      </header>

      <section className="mb-4">
        <h2 className="mb-1 font-bold">1. 月間サマリ</h2>
        <table className="w-full border-collapse">
          <tbody>
            <SummaryRow label="記録のある勤務日" value={`${agg.recordedDays}日`} />
            <SummaryRow label="記録上の勤務時間" value={formatMinutes(agg.totalWorkMinutes)} />
            <SummaryRow label="推定時間外労働(1日8時間超過分の合計)" value={formatMinutes(agg.overtimeMinutes)} />
            <SummaryRow
              label="最長勤務時間"
              value={agg.longestDayMinutes > 0 ? formatMinutes(agg.longestDayMinutes) : '—'}
            />
            <SummaryRow label="最大連続勤務" value={`${agg.maxConsecutiveDays}日`} />
            <SummaryRow label="休憩不足の日数(労基法34条の一般則を目安)" value={`${agg.breakDeficitDays}日`} />
            <SummaryRow label="休日勤務" value={`${agg.holidayWorkDays}日`} />
            <SummaryRow label="深夜勤務(22時〜5時)" value={`${agg.nightWorkDays}日`} />
          </tbody>
        </table>
      </section>

      {(diff !== null || payslipDiff !== null) && (
        <section className="mb-4">
          <h2 className="mb-1 font-bold">2. 会社側の記録との比較</h2>
          <table className="w-full border-collapse">
            <tbody>
              <SummaryRow label="本人の記録による推定時間外労働" value={`約${selfOvertimeH.toFixed(1)}時間`} />
              {input?.companyOvertimeHours != null && (
                <>
                  <SummaryRow label="会社の勤怠上の残業時間(本人入力)" value={`${input.companyOvertimeHours}時間`} />
                  <SummaryRow label="差" value={`約${diff!.toFixed(1)}時間`} />
                </>
              )}
              {input?.payslipOvertimeHours != null && (
                <>
                  <SummaryRow label="給与明細に記載された残業時間(本人入力)" value={`${input.payslipOvertimeHours}時間`} />
                  <SummaryRow label="差" value={`約${payslipDiff!.toFixed(1)}時間`} />
                </>
              )}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-600">
            ※記録間の差を示すものであり、未払い賃金の額を確定するものではありません。
          </p>
        </section>
      )}

      <section className="mb-4">
        <h2 className="mb-1 font-bold">{diff !== null || payslipDiff !== null ? '3' : '2'}. 日別の勤務記録</h2>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-0.5 pr-2">日付</th>
              <th className="pr-2">出勤</th>
              <th className="pr-2">退勤</th>
              <th className="pr-2">休憩</th>
              <th className="pr-2">実勤務</th>
              <th>特記事項</th>
            </tr>
          </thead>
          <tbody>
            {sortedDays.map((d) => {
              const work = recordedWorkMinutes(d)
              const notes: string[] = []
              if (d.holidayWork) notes.push('休日勤務')
              if (d.preShiftWorkMinutes > 0) notes.push(`始業前${d.preShiftWorkMinutes}分`)
              if (d.postShiftWorkMinutes > 0) notes.push(`終業後${d.postShiftWorkMinutes}分`)
              if (d.homeWorkMinutes > 0) notes.push(`自宅${d.homeWorkMinutes}分`)
              for (const t of d.troubles) {
                notes.push(TROUBLE_ITEMS.find((i) => i.id === t)?.label ?? t)
              }
              return (
                <tr key={d.date} className="border-b border-slate-200 align-top">
                  <td className="py-0.5 pr-2 whitespace-nowrap">
                    {monthNum}/{Number(d.date.slice(8, 10))}({weekdayLabel(d.date)})
                  </td>
                  <td className="pr-2">{d.clockIn ?? '—'}</td>
                  <td className="pr-2">{d.clockOut ?? '—'}</td>
                  <td className="pr-2">{d.breakMinutes != null ? `${d.breakMinutes}分` : '未入力'}</td>
                  <td className="pr-2 whitespace-nowrap">{work !== null ? formatMinutes(work) : '—'}</td>
                  <td>{notes.join('、')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {sortedIncidents.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-1 font-bold">出来事の記録</h2>
          {sortedIncidents.map((inc) => {
            const cat = HARASSMENT_CATEGORIES.find((c) => c.id === inc.category)
            const sev = SEVERITY_OPTIONS.find((s) => s.value === inc.severity)
            return (
              <div key={inc.id} className="mb-2 border-b border-slate-200 pb-2">
                <p className="font-medium">
                  {monthNum}/{Number(inc.date.slice(8, 10))}({weekdayLabel(inc.date)})
                  {cat?.label.split('(')[0]}(程度:{sev?.label.split('(')[0]})
                </p>
                {(inc.place || inc.actor) && (
                  <p className="text-[11px]">
                    {inc.place && `場所:${inc.place} `}
                    {inc.actor && `相手:${inc.actor}`}
                  </p>
                )}
                {inc.description && <p className="whitespace-pre-wrap text-[11px]">{inc.description}</p>}
                <p className="text-[11px] text-slate-600">
                  目撃者:{inc.witness ? 'あり' : 'なし・不明'} / メール・チャット等の証拠:
                  {inc.evidence ? 'あり' : 'なし・不明'}
                </p>
              </div>
            )
          })}
        </section>
      )}

      <section className="mb-4">
        <h2 className="mb-1 font-bold">記録の修正履歴</h2>
        {editedDays.length === 0 ? (
          <p className="text-[11px]">当月の記録に後からの修正はありません(すべて当日入力)。</p>
        ) : (
          <p className="text-[11px]">
            次の日付の記録は後から修正されています(修正を含む保存回数):
            {editedDays.map(([date, n]) => `${monthNum}/${Number(date.slice(8, 10))}(${n}回)`).join('、')}
            。修正内容の全履歴はアプリ内に保存されています。
          </p>
        )}
      </section>

      <footer className="border-t border-black pt-2 text-[11px] text-slate-600">
        <p>
          本レポートの勤務時間は本人の記録に基づく推計であり、36協定・変形労働時間制等の適用によって法的評価は異なる場合があります。相談時は、給与明細・タイムカード・雇用契約書などの資料と併せてご利用ください。
        </p>
        <p className="mt-1">まもログ(勤務記録アプリ)より出力</p>
      </footer>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="py-0.5 pr-2">{label}</td>
      <td className="py-0.5 text-right font-medium tabular-nums">{value}</td>
    </tr>
  )
}
