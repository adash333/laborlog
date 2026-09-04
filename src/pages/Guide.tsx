import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function Guide() {
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null, [])
  const backTo = profile ? '/' : '/setup'
  const backLabel = profile ? 'ホームに戻る' : '登録画面に戻る'

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold text-brand">まもログの使い方</h1>
        <p className="mt-1 text-sm text-slate-600">働いた記録が、あなたを守る。</p>
      </header>

      <Section title="まもログとは?">
        <p>
          毎日「出勤」「退勤」を押すだけの勤務記録アプリです。勤務時間・休憩・残業・ハラスメントなどの記録から、働き方のリスクを見える化し、必要なときに相談先や相談用の資料まで案内します。
        </p>
        <p className="mt-2 font-medium text-slate-800">
          記録はすべてあなたの端末(ブラウザ)の中だけに保存され、外部のサーバーには一切送信されません。会社にも、このサイトの運営者にも見えません。
        </p>
      </Section>

      <Section title="1. 最初にすること(1分)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>勤務条件(所定の勤務時間・休憩など)を登録します。だいたいでOK、後から変更できます</li>
          <li>
            スマートフォンならブラウザのメニューから<b>「ホーム画面に追加」</b>
            すると、アプリのように1タップで開けるようになります
          </li>
        </ol>
      </Section>

      <Section title="2. 毎日すること(2タップ)">
        <ol className="list-decimal space-y-1 pl-5">
          <li>朝、仕事を始めたら「出勤」を押す</li>
          <li>仕事が終わったら「退勤」を押す</li>
        </ol>
        <p className="mt-2">
          退勤後に「今日の休憩は?」「今日、困ったことは?」が出ますが、<b>何もなければそのまま閉じてOK</b>です。押し忘れた日や時刻の修正は、カレンダーから後からでも入力できます(修正の履歴は内部に残り、記録の信頼性を保ちます)。
        </p>
      </Section>

      <Section title="3. 困ったことがあった日は">
        <ul className="list-disc space-y-1 pl-5">
          <li>退勤時のチェックリストで該当項目にチェック(怒鳴られた・残業を申告できなかった 等)</li>
          <li>
            ハラスメントなどの具体的な出来事は「出来事を詳しく記録する」から、日時・場所・相手・
            <b>実際の発言</b>・目撃者の有無を残しておくと、後で状況を説明する際に役立ちます
          </li>
          <li>自由メモには、気づいたことをなんでも書いておけます</li>
        </ul>
      </Section>

      <Section title="4. リスクスコアの見方">
        <p>
          記録がたまると、「リスク」タブに<b>ブラック度(100点満点)</b>
          が表示されます。長時間労働・未払いリスク・ハラスメント・休憩・休日・雇用上の圧力の5項目を、厚生労働省などの公的基準と照らし合わせた参考指標です。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>点数が高い=法律違反、ではありません。「確認や相談を検討する目安」です</li>
          <li>重大な出来事(暴力・脅迫など)は、点数に関係なく警告を表示します</li>
          <li>「なぜこの点数?」から根拠と出典(厚労省資料)を確認できます</li>
        </ul>
      </Section>

      <Section title="5. 月次レポートと相談用PDF">
        <ul className="list-disc space-y-1 pl-5">
          <li>カレンダー →「この月のレポートを見る」で月間の集計を確認できます</li>
          <li>会社の勤怠や給与明細の残業時間を入力すると、自分の記録との差が分かります</li>
          <li>
            「相談用レポートを作成(PDF保存)」で、労働基準監督署などにそのまま持っていける事実ベースの資料を出力できます
          </li>
        </ul>
      </Section>

      <Section title="6. データのバックアップ(大切!)">
        <p>
          記録は端末の中だけにあるため、端末の故障・ブラウザのデータ削除で失われます。
          <b>設定画面から定期的にバックアップ</b>してください。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>「ファイルをダウンロード」で端末に保存</li>
          <li>「メール・Googleドライブ等に送る」で自分宛てに退避(スマホは共有画面から選べます)</li>
          <li>機種変更のときは、新しい端末で「バックアップファイルを選んで復元」</li>
        </ul>
      </Section>

      <Section title="よくある質問">
        <dl className="space-y-3">
          <div>
            <dt className="font-medium">Q. 会社に記録を見られませんか?</dt>
            <dd className="mt-0.5">
              記録は端末内のみで、外部送信はありません。ただし<b>会社支給の端末</b>
              では管理ソフトから見られる可能性があるため、個人の端末での利用をおすすめします。
            </dd>
          </div>
          <div>
            <dt className="font-medium">Q. 無料ですか?アカウント登録は?</dt>
            <dd className="mt-0.5">無料です。アカウント登録・メールアドレスも不要です。</dd>
          </div>
          <div>
            <dt className="font-medium">Q. スコアが高いのですが、どうすれば?</dt>
            <dd className="mt-0.5">
              まず記録を続けてバックアップを取り、「相談先」タブの窓口(労働条件相談ほっとライン・総合労働相談コーナーなど、無料の公的窓口があります)への相談を検討してください。
            </dd>
          </div>
        </dl>
      </Section>

      <p className="text-xs text-slate-500">
        まもログが表示するスコアは、勤務記録から働き方のリスクを可視化した参考指標であり、会社の違法性や「ブラック企業」であることを法的に判定するものではありません。
      </p>

      <Link
        to={backTo}
        className="block w-full rounded-xl bg-brand py-3 text-center font-bold text-white"
      >
        {backLabel}
      </Link>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 text-sm text-slate-700 shadow-sm">
      <h2 className="mb-2 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}
