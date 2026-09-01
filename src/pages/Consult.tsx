// 相談先の案内(実装仕様書 §31–33)。利用者本人が選択できるよう、指示形ではなく選択肢として表示する。
const SECTIONS = [
  {
    title: '労働時間・残業代について',
    contacts: [
      {
        name: '労働条件相談ほっとライン',
        desc: '違法な時間外労働、過重労働による健康障害、賃金不払残業などについて、夜間・土日祝日を含め電話相談できる厚生労働省の委託事業(無料)。',
        url: 'https://www.check-roudou.mhlw.go.jp/lp/hotline/index.html',
        kind: '公的',
      },
      {
        name: '労働基準監督署',
        desc: '労働時間・賃金・安全衛生・労災など、労働基準法等に関する相談・申告の窓口。',
        url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/location.html',
        kind: '公的',
      },
    ],
  },
  {
    title: 'ハラスメント・職場トラブルについて',
    contacts: [
      {
        name: '総合労働相談コーナー',
        desc: '労働条件、解雇、いじめ・嫌がらせなど、幅広い労働問題を無料で相談できる窓口。各都道府県労働局・労働基準監督署内などにあります。',
        url: 'https://www.mhlw.go.jp/general/seido/chihou/kaiketu/soudan.html',
        kind: '公的',
      },
      {
        name: '都道府県労働局(雇用環境・均等部(室))',
        desc: 'パワーハラスメント、セクシュアルハラスメント、妊娠・出産等に関する不利益取扱いなどの相談窓口。',
        url: 'https://www.mhlw.go.jp/kouseiroudoushou/shozaiannai/roudoukyoku/',
        kind: '公的',
      },
    ],
  },
  {
    title: '退職・解雇・法的トラブルについて',
    contacts: [
      {
        name: '法テラス(日本司法支援センター)',
        desc: '法的トラブルの相談窓口の案内や、収入等の条件を満たす場合の無料法律相談など。',
        url: 'https://www.houterasu.or.jp/',
        kind: '公的',
      },
      {
        name: '弁護士(労働問題)',
        desc: '未払い賃金の請求や退職トラブルなど、個別の法的対応が必要な場合。各地の弁護士会の法律相談も利用できます。',
        url: 'https://www.nichibenren.or.jp/legal_advice.html',
        kind: '民間・士業',
      },
      {
        name: '労働組合',
        desc: '社内に労働組合がない場合でも、一人でも加入できる労働組合(ユニオン)があります。',
        url: null,
        kind: '民間',
      },
    ],
  },
]

export default function Consult() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-bold">相談先</h1>
        <p className="mt-1 text-sm text-slate-600">
          この問題について相談できる窓口があります。どこに相談するかは、あなた自身が選べます。
        </p>
      </header>

      {SECTIONS.map((sec) => (
        <section key={sec.title} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold">{sec.title}</h2>
          <ul className="space-y-3">
            {sec.contacts.map((c) => (
              <li key={c.name} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.kind === '公的' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.kind}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{c.desc}</p>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-brand underline"
                  >
                    公式サイトを見る
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-slate-500">
        相談の前に、月次レポートのCSVや勤務記録を保存しておくと状況を説明しやすくなります。公的機関と民間の窓口を区分して表示しています。
      </p>
    </div>
  )
}
