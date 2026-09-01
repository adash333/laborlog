// 「証拠を守る」読み物(企画書 §8。統一形式:何を残すか→どう残すか→何の確認に役立つか→注意点)
const ARTICLES = [
  {
    title: '出勤・退勤の記録(まもログ)',
    what: '毎日の出勤・退勤時刻、休憩、困った出来事。',
    how: '毎日2タップで記録し、設定画面からJSONバックアップを定期的に保存する。',
    useful: '実際の勤務時間と、会社の勤怠記録・給与明細との差の確認。',
    caution: '後から時刻を修正すると修正履歴が残ります。できるだけ当日に記録しましょう。',
  },
  {
    title: 'タイムカード・勤怠システムの記録',
    what: '会社が管理する出退勤の打刻記録。',
    how: '画面のスクリーンショットや写真を、日付が分かる形で自分の端末に保存する。',
    useful: '自分の記録との突き合わせ。労働時間の裏付け。',
    caution: '会社のデータを持ち出す際は、業務上の秘密情報を含めないよう注意してください。',
  },
  {
    title: '給与明細',
    what: '毎月の給与明細(残業時間・残業代・控除の記載)。',
    how: '紙は写真に撮る、電子データはダウンロードして個人の保存先へ。毎月続ける。',
    useful: '記録した残業時間と支払われた残業代の比較。',
    caution: '捨てずに全月分を保管しましょう。過去の分も取得できるか確認を。',
  },
  {
    title: '業務メール・チャット(Slack・Teams等)',
    what: '深夜・休日の業務指示、ハラスメントに当たり得る発言など。',
    how: 'スクリーンショットで日時・送信者が分かる形で保存する。',
    useful: '時間外労働の指示やハラスメントの経緯の裏付け。',
    caution: '社外秘の情報や第三者の個人情報の取り扱いには十分注意してください。',
  },
  {
    title: '雇用契約書・労働条件通知書・就業規則',
    what: '所定労働時間、賃金、固定残業代の定めなど。',
    how: '入社時の書類を保管し、就業規則は閲覧できる場所を確認しておく。',
    useful: '固定残業代の範囲や所定労働時間の確認。スコアの前提条件にもなります。',
    caution: '労働条件通知書は交付が義務付けられています。もらっていない場合はそのこと自体もメモに。',
  },
  {
    title: 'Google Maps タイムライン(任意)',
    what: '職場に何時ごろ到着し、何時ごろ離れたかの補助情報。',
    how: '本人が明示的にONにし、自動削除設定・バックアップ設定を確認する。',
    useful: '出勤・退勤の入力を忘れた日の補助的な確認。',
    caution:
      '位置情報は非常にセンシティブです。メリット・デメリットを理解した上で本人が判断してください。職場にいた時間=労働時間ではありません。',
    url: 'https://support.google.com/maps/answer/14169818',
  },
  {
    title: 'ハラスメントを受けたときの記録',
    what: '日時・場所・相手・実際の発言・目撃者・関連するメール等の有無。',
    how: 'まもログの出来事メモに、できるだけ具体的な発言をそのまま残す。',
    useful: '相談窓口や専門家に経緯を説明するときの土台。',
    caution: '録音等を検討する場合は、社内規程や保存方法にも注意してください。',
  },
]

export default function Evidence() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold">証拠を守る</h1>
        <p className="mt-1 text-sm text-slate-600">
          いざというとき役に立つのは日々の記録です。集めるだけでなく「失わない」ことが大切です。
        </p>
      </header>

      {ARTICLES.map((a) => (
        <section key={a.title} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">{a.title}</h2>
          <dl className="space-y-1.5 text-xs">
            <div>
              <dt className="font-medium text-slate-500">何を残すか</dt>
              <dd>{a.what}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">どう残すか</dt>
              <dd>{a.how}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">何の確認に役立つか</dt>
              <dd>{a.useful}</dd>
            </div>
            <div>
              <dt className="font-medium text-amber-700">注意点</dt>
              <dd>{a.caution}</dd>
            </div>
          </dl>
          {a.url && (
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-brand underline"
            >
              公式ヘルプを見る
            </a>
          )}
        </section>
      ))}
    </div>
  )
}
