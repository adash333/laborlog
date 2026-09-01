export default function ScoreBar({
  label,
  score,
  max,
}: {
  label: string
  score: number
  max: number
}) {
  const ratio = max > 0 ? score / max : 0
  const color = ratio >= 0.7 ? 'bg-red-500' : ratio >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-slate-600">
          {score} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}
