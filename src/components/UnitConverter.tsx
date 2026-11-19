import { useEffect, useMemo, useState } from 'react'
import { UNIT_CATEGORIES, convertUnit, formatNumber } from '../lib/converters'
import { copyText, loadJSON, saveJSON } from '../lib/storage'

interface Props {
  notify: (msg: string) => void
}

interface SavedState {
  cat: string
  from: string
  to: string
  value: string
}

const DEFAULT: SavedState = { cat: 'length', from: 'm', to: 'ft', value: '1' }

export default function UnitConverter({ notify }: Props) {
  const [state, setState] = useState<SavedState>(() => {
    const s = loadJSON<SavedState | null>('calculamela:units', DEFAULT)
    const cat = UNIT_CATEGORIES.find((c) => c.id === s?.cat)
    if (!s || !cat || !cat.units.some((u) => u.id === s.from) || !cat.units.some((u) => u.id === s.to)) return DEFAULT
    return { ...s, value: typeof s.value === 'string' ? s.value : '1' }
  })
  useEffect(() => saveJSON('calculamela:units', state), [state])

  const category = UNIT_CATEGORIES.find((c) => c.id === state.cat) ?? UNIT_CATEGORIES[0]
  const fromUnit = category.units.find((u) => u.id === state.from) ?? category.units[0]
  const toUnit = category.units.find((u) => u.id === state.to) ?? category.units[1]

  const numeric = useMemo(() => {
    const t = state.value.trim().replace(',', '.')
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : NaN
  }, [state.value])
  const invalid = numeric != null && Number.isNaN(numeric)

  const convert = (to: string): string | null => {
    if (numeric == null || Number.isNaN(numeric)) return null
    try {
      return formatNumber(convertUnit(numeric, fromUnit.id, to))
    } catch {
      return null
    }
  }

  const main = convert(toUnit.id)

  const setCat = (id: string) => {
    const c = UNIT_CATEGORIES.find((x) => x.id === id)!
    setState((s) => ({ ...s, cat: id, from: c.units[0].id, to: c.units[1].id }))
  }

  return (
    <div className="card converter">
      <h2 className="panel-title">Conversor de unidades</h2>

      <div className="cat-grid" role="radiogroup" aria-label="Categoría">
        {UNIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={c.id === category.id}
            className={`cat ${c.id === category.id ? 'is-active' : ''}`}
            onClick={() => setCat(c.id)}
          >
            <span aria-hidden="true">{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="conv-row">
        <label className="field">
          <span>Valor</span>
          <input
            inputMode="decimal"
            value={state.value}
            onChange={(e) => setState((s) => ({ ...s, value: e.target.value }))}
            aria-invalid={invalid}
            placeholder="0"
          />
        </label>
        <label className="field">
          <span>De</span>
          <select value={fromUnit.id} onChange={(e) => setState((s) => ({ ...s, from: e.target.value }))}>
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="icon-btn swap"
          onClick={() => setState((s) => ({ ...s, from: toUnit.id, to: fromUnit.id, value: main ?? s.value }))}
          aria-label="Intercambiar unidades"
          title="Intercambiar"
        >
          ⇄
        </button>
        <label className="field">
          <span>A</span>
          <select value={toUnit.id} onChange={(e) => setState((s) => ({ ...s, to: e.target.value }))}>
            {category.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="conv-result" aria-live="polite">
        {invalid ? (
          <span className="tone-error">Introduce un número válido</span>
        ) : main == null ? (
          <span className="muted">Escribe un valor para convertir</span>
        ) : (
          <>
            <span className="muted">
              {state.value} {fromUnit.symbol} =
            </span>
            <strong>
              {main} {toUnit.symbol}
            </strong>
            <button
              type="button"
              className="icon-btn small"
              aria-label="Copiar resultado"
              title="Copiar"
              onClick={async () => notify((await copyText(main)) ? `Copiado: ${main}` : 'No se pudo copiar')}
            >
              ⧉
            </button>
          </>
        )}
      </div>

      {main != null && (
        <div className="equivalences">
          <h3>Todas las equivalencias</h3>
          <ul>
            {category.units
              .filter((u) => u.id !== fromUnit.id)
              .map((u) => (
                <li key={u.id}>
                  <span>{u.label}</span>
                  <span className="mono">
                    {convert(u.id)} {u.symbol}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
