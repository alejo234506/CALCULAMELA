import { useEffect, useMemo, useState } from 'react'
import { BASES, formatInBase, parseInBase, type Base } from '../lib/converters'
import { copyText, loadJSON, saveJSON } from '../lib/storage'

interface Props {
  notify: (msg: string) => void
}

export default function BaseConverter({ notify }: Props) {
  const [base, setBase] = useState<Base>(() => {
    const b = loadJSON<number>('calculamela:base', 10)
    return ([2, 8, 10, 16] as number[]).includes(b) ? (b as Base) : 10
  })
  const [input, setInput] = useState(() => {
    const v = loadJSON<string>('calculamela:baseValue', '255')
    return typeof v === 'string' ? v : '255'
  })

  useEffect(() => saveJSON('calculamela:base', base), [base])
  useEffect(() => saveJSON('calculamela:baseValue', input), [input])

  const parsed = useMemo(() => parseInBase(input, base), [input, base])
  const current = BASES.find((b) => b.base === base)!
  const showError = !parsed.ok && input.trim() !== ''

  const changeBase = (b: Base) => {
    if (parsed.ok) setInput(formatInBase(parsed.value, b).replace(/\s/g, ''))
    setBase(b)
  }

  return (
    <div className="card converter">
      <h2 className="panel-title">Conversor de bases</h2>

      <div className="seg" role="radiogroup" aria-label="Base de entrada">
        {BASES.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={b.base === base}
            className={`seg-btn ${b.base === base ? 'is-active' : ''}`}
            onClick={() => changeBase(b.base)}
            title={b.label}
          >
            {b.id}
          </button>
        ))}
      </div>

      <label className="field">
        <span>
          Número en {current.label.toLowerCase()} (base {base})
        </span>
        <input
          className="mono big-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoCapitalize="characters"
          autoComplete="off"
          inputMode={base === 16 ? 'text' : 'numeric'}
          aria-invalid={showError}
          aria-describedby="base-error"
          placeholder="0"
        />
      </label>
      <p id="base-error" className="tone-error field-error" aria-live="polite">
        {showError && !parsed.ok ? parsed.error : ''}
      </p>

      <ul className="base-results">
        {BASES.map((b) => {
          const text = parsed.ok ? formatInBase(parsed.value, b.base) : '—'
          return (
            <li key={b.id} className={b.base === base ? 'is-source' : ''}>
              <span className="base-tag" title={b.label}>
                {b.id}
              </span>
              <span className="mono base-value">{text}</span>
              <button
                type="button"
                className="icon-btn small"
                disabled={!parsed.ok}
                aria-label={`Copiar valor ${b.label.toLowerCase()}`}
                title="Copiar"
                onClick={async () => {
                  const raw = text.replace(/\s/g, '')
                  notify((await copyText(raw)) ? `Copiado: ${raw}` : 'No se pudo copiar')
                }}
              >
                ⧉
              </button>
            </li>
          )
        })}
      </ul>
      <p className="muted small-note">Admite enteros de cualquier tamaño (BigInt) y negativos con el signo «-».</p>
    </div>
  )
}
