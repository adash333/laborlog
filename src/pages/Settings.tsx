import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAll, exportAll, importAll, type BackupData } from '../db'
import rules from '../scoring/rules.json'

async function makeBackupFile(): Promise<File> {
  const data = await exportAll()
  return new File(
    [JSON.stringify(data, null, 2)],
    `mamolog-backup-${data.exportedAt.slice(0, 10)}.json`,
    { type: 'application/json' },
  )
}

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [showShareFallback, setShowShareFallback] = useState(false)

  const doExport = async () => {
    const file = await makeBackupFile()
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    setMessage('バックアップをダウンロードしました。安全な場所に保管してください。')
  }

  // メール添付・Googleドライブ保存など、OSの共有機能にファイルを渡す
  const doShare = async () => {
    const file = await makeBackupFile()
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'まもログ バックアップ',
        })
        setMessage('共有先(メール・Googleドライブなど)にバックアップを渡しました。')
      } catch (e) {
        // 共有シートのキャンセルはエラー扱いしない
        if (e instanceof Error && e.name !== 'AbortError') {
          setShowShareFallback(true)
        }
      }
    } else {
      // 共有非対応ブラウザ(主にPC):ダウンロード+手動添付の案内を表示
      await doExport()
      setShowShareFallback(true)
    }
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
        <h2 className="text-sm font-bold">データのエクスポート(バックアップ)</h2>
        <p className="text-xs text-slate-600">
          データはこの端末のブラウザ内にのみ保存されています。端末の故障やブラウザのデータ削除で失われるため、定期的なバックアップをおすすめします。
        </p>
        <button
          onClick={doExport}
          className="w-full rounded-xl border border-brand bg-white py-2.5 text-sm font-bold text-brand"
        >
          ファイルをダウンロード
        </button>
        <button
          onClick={doShare}
          className="w-full rounded-xl border border-brand bg-white py-2.5 text-sm font-bold text-brand"
        >
          メール・Googleドライブ等に送る
        </button>
        <p className="text-xs text-slate-500">
          スマートフォンでは共有画面が開き、Gmailへの添付やGoogleドライブへの保存を選べます。
        </p>
        {showShareFallback && (
          <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium text-slate-700">
              このブラウザはファイルの直接共有に対応していないため、ダウンロードしたファイルを手動で添付・アップロードしてください。
            </p>
            <p>
              1. 上の「ファイルをダウンロード」でバックアップを保存
              <br />
              2. メールに添付して自分宛てに送る、またはGoogleドライブにアップロード
            </p>
            <p className="space-x-3">
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&su=%E3%81%BE%E3%82%82%E3%83%AD%E3%82%B0%20%E3%83%90%E3%83%83%E3%82%AF%E3%82%A2%E3%83%83%E3%83%97"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline"
              >
                Gmailを開く
              </a>
              <a
                href="https://drive.google.com/drive/my-drive"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline"
              >
                Googleドライブを開く
              </a>
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold">データのインポート(復元)</h2>
        <p className="text-xs text-slate-600">
          エクスポートしたバックアップファイル(mamolog-backup-〇〇.json)から復元します。メールの添付ファイルやGoogleドライブからは、いったん端末にダウンロードしてから選択してください。
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-medium"
        >
          バックアップファイルを選んで復元
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) doImport(f)
            e.target.value = ''
          }}
        />
        <p className="text-xs text-amber-700">
          復元すると、この端末の現在のデータはバックアップの内容にすべて置き換わります。
        </p>
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
