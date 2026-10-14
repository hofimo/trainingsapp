import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from './store'
import Body from './views/Body'
import History from './views/History'
import PlanView from './views/PlanView'
import Progress from './views/Progress'
import Settings from './views/Settings'
import Today from './views/Today'

type Tab = 'today' | 'history' | 'progress' | 'body' | 'plan'

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'Heute', icon: icon(<><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></>) },
  { id: 'history', label: 'Verlauf', icon: icon(<><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>) },
  { id: 'progress', label: 'Fortschritt', icon: icon(<><path d="M4 19h16" /><path d="M5 15l4-4 4 3 6-7" /></>) },
  { id: 'body', label: 'Gewicht', icon: icon(<><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M9 9a4 4 0 0 1 6 0l-2 3" /></>) },
  { id: 'plan', label: 'Plan', icon: icon(<><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></>) },
]

export default function App() {
  const { ready } = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [settings, setSettings] = useState(false)

  useEffect(() => window.scrollTo(0, 0), [tab, settings])

  if (!ready) return <div className="loading">Lädt …</div>

  return (
    <>
      <main className="main">
        {settings ? (
          <Settings onClose={() => setSettings(false)} />
        ) : (
          <>
            <button className="gear" aria-label="Einstellungen" onClick={() => setSettings(true)}>
              {icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>)}
            </button>
            {tab === 'today' && <Today />}
            {tab === 'history' && <History />}
            {tab === 'progress' && <Progress />}
            {tab === 'body' && <Body />}
            {tab === 'plan' && <PlanView />}
          </>
        )}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={!settings && tab === t.id ? 'on' : ''}
            onClick={() => {
              setSettings(false)
              setTab(t.id)
            }}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
