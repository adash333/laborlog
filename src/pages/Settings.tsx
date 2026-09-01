import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAll, exportAll, importAll, type BackupData } from '../db'
import rules from '../scoring/rules.json'

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mamolog-backup-${data.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('バックアップをダウンロードしました。安全な場所に保管してください。')
  }

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as BackupData
      if (!window.confirm('現在のデータをすべて置き換えて復元します。よろしいですか?')) return
      await importAll(data)
      setMessage('バックアップから復元しました。')
    } catch (e) {
      setMessage(`復元に失敗しました:${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const doDeleteAll = async () => {
    if (!window.confirm('すべての記録を完全に削除します。この操作は取り消せません。よろしいですか?')) return
    if (!window.confirm('本当に削除しますか?(バックアップを取ることをおすすめします)')) return
    await deleteAll()
    setMessage('すべてのデータを削除しました。')
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold">設定・データ管理</h1>
      </header>

      {message && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}

      <section className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
        <Link to="/setup" className="block px-5 py-3.5 text-sm font-medium">
          勤務条件を変更する →
        </Link>
        <Link to="/evidence" className="block px-5 py-3.5 text-sm font-medium">
          証拠を守る(読み物)→
        </Link>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">バックアップ</h2>
        <p className="text-xs text-slate-600">
          データはこの端末のブラウザ内にのみ保存されています。端末の故障やブラウザのデータ削除で失われるため、定期的なバックアップをおすすめします。
        </p>
        <button
          onClick={doExport}
          className="w-full rounded-xl border border-brand bg-white py-2.5 text-sm font-bold text-brand"
        >
          JSONバックアップをダウンロード
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium"
        >
          バックアップから復元
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">データの削除</h2>
        <button
          onClick={doDeleteAll}
          className="w-full rounded-xl border border-red-300 bg-white py-2.5 text-sm font-bold text-red-600"
        >
          すべてのデータを削除
        </button>
      </section>

      <section className="rounded-2xl bg-white p-5 text-xs text-slate-500 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-800">まもログについて</h2>
        <p>働いた記録が、あなたを守る。</p>
        <p className="mt-1">
          まもログはローカルファーストの勤務記録アプリです。記録は外部サーバーに送信されません。
        </p>
        <p className="mt-1">
          表示されるスコアは働き方のリスクを可視化した参考指標であり、会社の違法性や「ブラック企業」であることを法的に判定するものではありません。
        </p>
        <p className="mt-2 text-slate-400">
          バージョン 0.1.0 / ルールセット {rules.rulesetVersion}({rules.rulesetEffectiveDate})
        </p>
        <p className="mt-2 text-amber-700">
          会社支給の端末での利用は、管理者にデータを見られる可能性があります。個人の端末での利用をおすすめします。
        </p>
      </section>
    </div>
  )
}
