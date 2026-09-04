import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import Home from './pages/Home'
import Setup from './pages/Setup'
import DayEdit from './pages/DayEdit'
import Incidents from './pages/Incidents'
import IncidentNew from './pages/IncidentNew'
import Calendar from './pages/Calendar'
import Report from './pages/Report'
import PrintReport from './pages/PrintReport'
import Risk from './pages/Risk'
import Consult from './pages/Consult'
import Guide from './pages/Guide'
import Evidence from './pages/Evidence'
import Settings from './pages/Settings'

const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/calendar', label: 'カレンダー', icon: '📅' },
  { to: '/risk', label: 'リスク', icon: '📊' },
  { to: '/consult', label: '相談先', icon: '💬' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export default function App() {
  // undefined = 読込中, null = 未設定
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null, [])

  if (profile === undefined) return null

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pb-24 pt-4 print:p-0">
        {profile === null ? (
          // 未設定の間は使い方ページ以外セットアップを表示する
          // (保存直後の liveQuery 反映前にリダイレクトで往復しないため、URLは変えない)
          <Routes>
            <Route path="/guide" element={<Guide />} />
            <Route path="*" element={<Setup />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/setup" element={<Setup />} />
            <Route path="/" element={<Home />} />
            <Route path="/day/:date" element={<DayEdit />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/incident/new" element={<IncidentNew />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/report/:month" element={<Report />} />
            <Route path="/print/:month" element={<PrintReport />} />
            <Route path="/risk" element={<Risk />} />
            <Route path="/consult" element={<Consult />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      {profile !== null && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden">
          <div className="mx-auto flex max-w-lg justify-around">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] ${
                    isActive ? 'font-bold text-brand' : 'text-slate-500'
                  }`
                }
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
