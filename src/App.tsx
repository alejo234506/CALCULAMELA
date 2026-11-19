import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Calculator from './components/Calculator'
import UnitConverter from './components/UnitConverter'
import BaseConverter from './components/BaseConverter'
import { loadJSON, saveJSON } from './lib/storage'

type Theme = 'light' | 'dark'
type Tab = 'calc' | 'units' | 'bases'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'calc', label: 'Científica', icon: '∑' },
  { id: 'units', label: 'Unidades', icon: '⇄' },
  { id: 'bases', label: 'Bases', icon: '#' },
]

export default function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  )
  const [tab, setTab] = useState<Tab>(() => {
    const t = loadJSON<Tab>('calculamela:tab', 'calc')
    return TABS.some((x) => x.id === t) ? t : 'calc'
  })
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveJSON('calculamela:theme', theme)
  }, [theme])

  useEffect(() => saveJSON('calculamela:tab', tab), [tab])

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 1800)
  }, [])

  const onTabKey = (e: KeyboardEvent, index: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (index + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length
    setTab(TABS[next].id)
    document.getElementById(`tab-${TABS[next].id}`)?.focus()
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={36} height={36} />
          <div>
            <h1>CALCULAMELA</h1>
            <p className="tagline">Calculadora científica</p>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
              </g>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" />
            </svg>
          )}
        </button>
      </header>

      <nav className="tabs" role="tablist" aria-label="Modos de la calculadora">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={`tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            <span className="tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <section id="panel-calc" role="tabpanel" aria-labelledby="tab-calc" hidden={tab !== 'calc'}>
          <Calculator active={tab === 'calc'} notify={notify} />
        </section>
        <section id="panel-units" role="tabpanel" aria-labelledby="tab-units" hidden={tab !== 'units'}>
          {tab === 'units' && <UnitConverter notify={notify} />}
        </section>
        <section id="panel-bases" role="tabpanel" aria-labelledby="tab-bases" hidden={tab !== 'bases'}>
          {tab === 'bases' && <BaseConverter notify={notify} />}
        </section>
      </main>

      <footer className="footer">
        Hecho con React, TypeScript y math.js ·{' '}
        <a href="https://github.com/alejo234506/CALCULAMELA" target="_blank" rel="noreferrer">
          Código en GitHub
        </a>
      </footer>

      <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
