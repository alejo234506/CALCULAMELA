import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  backspace,
  evaluateExpression,
  numberToExpr,
  openParens,
  toggleSign,
  type AngleMode,
  type EvalResult,
} from '../lib/engine'
import { copyText, loadJSON, saveJSON } from '../lib/storage'
import History, { type HistoryItem } from './History'

type InsertKind = 'digit' | 'binary' | 'postfix' | 'prefix' | 'close' | 'comma'

interface KeyDef {
  id: string
  label: string
  aria: string
  cls?: string
  title?: string
  pressed?: boolean
  onPress: () => void
}

interface Props {
  active: boolean
  notify: (msg: string) => void
}

const BINARY_TAIL = /(?:[+−×÷^]| mod )$/
const MAX_HISTORY = 60

export default function Calculator({ active, notify }: Props) {
  const [expr, setExpr] = useState('')
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ans, setAns] = useState<number>(() => loadJSON<number>('calculamela:ans', 0))
  const [memory, setMemory] = useState<number | null>(() => loadJSON<number | null>('calculamela:memory', null))
  const [angle, setAngle] = useState<AngleMode>(() =>
    loadJSON<AngleMode>('calculamela:angle', 'DEG') === 'RAD' ? 'RAD' : 'DEG',
  )
  const [second, setSecond] = useState(false)
  const [hyp, setHyp] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const h = loadJSON<HistoryItem[]>('calculamela:history', [])
    return Array.isArray(h) ? h.filter((x) => x && typeof x.expr === 'string').slice(0, MAX_HISTORY) : []
  })
  const [resultText, setResultText] = useState('')
  const [pressedId, setPressedId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const pressTimer = useRef<number | undefined>(undefined)
  const exprRef = useRef<HTMLDivElement>(null)

  useEffect(() => saveJSON('calculamela:ans', ans), [ans])
  useEffect(() => saveJSON('calculamela:memory', memory), [memory])
  useEffect(() => saveJSON('calculamela:angle', angle), [angle])
  useEffect(() => saveJSON('calculamela:history', history), [history])

  // Mantener visible el final de la expresión.
  useLayoutEffect(() => {
    const el = exprRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [expr])

  /* ----------------------------- Vista previa ----------------------------- */

  const preview: EvalResult | null = useMemo(() => {
    if (!expr || justEvaluated) return null
    return evaluateExpression(expr, { angle, ans })
  }, [expr, angle, ans, justEvaluated])


  const shownValue = justEvaluated ? ans : preview && preview.ok ? preview.value : null

  /* ------------------------------- Edición -------------------------------- */

  const insert = useCallback(
    (text: string, kind: InsertKind) => {
      setError(null)
      setSecond(false)
      setExpr((prev) => {
        let base = prev
        const fresh = justEvaluated
        if (fresh) {
          base = kind === 'binary' || kind === 'postfix' ? 'Ans' : ''
        } else if (!base && (kind === 'postfix' || (kind === 'binary' && text !== '−'))) {
          base = 'Ans'
        }

        switch (kind) {
          case 'digit': {
            if (text === '.') {
              const num = /[\d.]*$/.exec(base)?.[0] ?? ''
              if (num.includes('.')) return base
              if (!num) return `${base}0.`
            }
            return base + text
          }
          case 'binary': {
            if (BINARY_TAIL.test(base)) {
              // Permitir signo negativo tras ×, ÷ o ^ (p. ej. 2×−3)
              if (text === '−' && /[×÷^]$/.test(base)) return base + text
              return base.replace(BINARY_TAIL, '') + text
            }
            if (base.endsWith('(') && text !== '−') return base
            return base + text
          }
          case 'close':
            return openParens(base) > 0 && !base.endsWith('(') ? `${base})` : base
          default:
            return base + text
        }
      })
      setJustEvaluated(false)
    },
    [justEvaluated],
  )

  const clearAll = useCallback(() => {
    setExpr('')
    setError(null)
    setJustEvaluated(false)
    setSecond(false)
  }, [])

  const doBackspace = useCallback(() => {
    setError(null)
    if (justEvaluated) {
      setJustEvaluated(false)
      return
    }
    setExpr((e) => backspace(e))
  }, [justEvaluated])

  const doToggleSign = useCallback(() => {
    setError(null)
    setExpr((e) => (justEvaluated ? '(−Ans' : toggleSign(e)))
    setJustEvaluated(false)
  }, [justEvaluated])

  const evaluate = useCallback(() => {
    if (justEvaluated || !expr.trim()) return
    const r = evaluateExpression(expr, { angle, ans })
    if (!r.ok) {
      setError(r.error)
      return
    }
    const closed = expr + ')'.repeat(openParens(expr))
    setHistory((h) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          expr: closed,
          result: r.text,
          value: r.value,
          angle,
          ts: Date.now(),
        },
        ...h,
      ].slice(0, MAX_HISTORY),
    )
    setExpr(closed)
    setResultText(r.text)
    setAns(r.value)
    setJustEvaluated(true)
    setError(null)
    setSecond(false)
  }, [expr, angle, ans, justEvaluated])

  /* ------------------------------- Memoria -------------------------------- */

  const currentValue = (): number | null => {
    if (justEvaluated) return ans
    if (!expr) return null
    const r = evaluateExpression(expr, { angle, ans })
    return r.ok ? r.value : null
  }

  const memoryAdd = (sign: 1 | -1) => {
    const v = currentValue()
    if (v == null) {
      notify('No hay un resultado válido para guardar')
      return
    }
    setMemory((m) => (m ?? 0) + sign * v)
    notify(sign === 1 ? 'Sumado a la memoria' : 'Restado de la memoria')
  }

  const memoryRecall = () => {
    if (memory == null) {
      notify('La memoria está vacía')
      return
    }
    insert(numberToExpr(memory), 'prefix')
  }

  const copyResult = async () => {
    const v = shownValue
    if (v == null) {
      notify('No hay resultado para copiar')
      return
    }
    const text = justEvaluated ? resultText : preview?.ok ? preview.text : String(v)
    notify((await copyText(text)) ? `Copiado: ${text}` : 'No se pudo copiar')
  }

  /* -------------------------------- Teclas -------------------------------- */

  const trig = (name: 'sin' | 'cos' | 'tan'): KeyDef => {
    const label = `${name}${hyp ? 'h' : ''}${second ? '⁻¹' : ''}`
    const aria = `${second ? 'arco ' : ''}${{ sin: 'seno', cos: 'coseno', tan: 'tangente' }[name]}${hyp ? ' hiperbólico' : ''}`
    return { id: name, label, aria, cls: 'fn', onPress: () => insert(`${label}(`, 'prefix') }
  }

  const sciKeys: KeyDef[] = [
    { id: 'mc', label: 'MC', aria: 'Borrar memoria', cls: 'mem', onPress: () => { setMemory(null); notify('Memoria borrada') } },
    { id: 'mr', label: 'MR', aria: 'Recuperar memoria', cls: 'mem', onPress: memoryRecall },
    { id: 'm+', label: 'M+', aria: 'Sumar a memoria', cls: 'mem', onPress: () => memoryAdd(1) },
    { id: 'm-', label: 'M−', aria: 'Restar de memoria', cls: 'mem', onPress: () => memoryAdd(-1) },
    { id: 'ans', label: 'Ans', aria: 'Último resultado', cls: 'mem', onPress: () => insert('Ans', 'prefix') },

    { id: '2nd', label: '2nd', aria: 'Segunda función (inversas)', cls: 'toggle', pressed: second, onPress: () => setSecond((s) => !s) },
    { id: 'hyp', label: 'hyp', aria: 'Funciones hiperbólicas', cls: 'toggle', pressed: hyp, onPress: () => setHyp((h) => !h) },
    trig('sin'),
    trig('cos'),
    trig('tan'),

    second
      ? { id: 'sq', label: '√x', aria: 'Raíz cuadrada', cls: 'fn', onPress: () => insert('√(', 'prefix') }
      : { id: 'sq', label: 'x²', aria: 'Al cuadrado', cls: 'fn', onPress: () => insert('^2', 'postfix') },
    second
      ? { id: 'cube', label: '∛x', aria: 'Raíz cúbica', cls: 'fn', onPress: () => insert('∛(', 'prefix') }
      : { id: 'cube', label: 'x³', aria: 'Al cubo', cls: 'fn', onPress: () => insert('^3', 'postfix') },
    second
      ? { id: 'pow', label: 'ʸ√x', aria: 'Raíz enésima: root(x, n)', title: 'root(x, n)', cls: 'fn', onPress: () => insert('root(', 'prefix') }
      : { id: 'pow', label: 'xʸ', aria: 'Potencia', cls: 'fn', onPress: () => insert('^', 'binary') },
    second
      ? { id: 'ten', label: 'log', aria: 'Logaritmo base 10', cls: 'fn', onPress: () => insert('log(', 'prefix') }
      : { id: 'ten', label: '10ˣ', aria: 'Diez elevado a x', cls: 'fn', onPress: () => insert('10^', 'prefix') },
    second
      ? { id: 'exp', label: 'ln', aria: 'Logaritmo natural', cls: 'fn', onPress: () => insert('ln(', 'prefix') }
      : { id: 'exp', label: 'eˣ', aria: 'e elevado a x', cls: 'fn', onPress: () => insert('ℯ^', 'prefix') },

    { id: 'logb', label: 'logₙ', aria: 'Logaritmo en base n: logb(x, n)', title: 'logb(x, base)', cls: 'fn', onPress: () => insert('logb(', 'prefix') },
    { id: 'fact', label: 'n!', aria: 'Factorial', cls: 'fn', onPress: () => insert('!', 'postfix') },
    { id: 'abs', label: '|x|', aria: 'Valor absoluto', cls: 'fn', onPress: () => insert('abs(', 'prefix') },
    { id: 'inv', label: '1/x', aria: 'Inverso', cls: 'fn', onPress: () => insert('^(−1)', 'postfix') },
    { id: 'mod', label: 'mod', aria: 'Módulo (resto)', cls: 'fn', onPress: () => insert(' mod ', 'binary') },

    { id: '(', label: '(', aria: 'Abrir paréntesis', cls: 'fn', onPress: () => insert('(', 'prefix') },
    { id: ')', label: ')', aria: 'Cerrar paréntesis', cls: 'fn', onPress: () => insert(')', 'close') },
    { id: ',', label: ',', aria: 'Coma (separador de argumentos)', cls: 'fn', onPress: () => insert(',', 'comma') },
    { id: 'pi', label: 'π', aria: 'Pi', cls: 'fn', onPress: () => insert('π', 'prefix') },
    { id: 'e', label: 'e', aria: 'Número e', cls: 'fn', onPress: () => insert('ℯ', 'prefix') },
  ]

  const digit = (d: string): KeyDef => ({
    id: d,
    label: d,
    aria: d === '.' ? 'Punto decimal' : d,
    cls: 'num',
    onPress: () => insert(d, 'digit'),
  })
  const op = (id: string, label: string, aria: string, text: string): KeyDef => ({
    id,
    label,
    aria,
    cls: 'op',
    onPress: () => insert(text, 'binary'),
  })

  const numKeys: KeyDef[] = [
    { id: 'ac', label: 'AC', aria: 'Borrar todo', cls: 'danger', onPress: clearAll },
    { id: 'back', label: '⌫', aria: 'Borrar último', cls: 'ctrl', onPress: doBackspace },
    { id: '%', label: '%', aria: 'Porcentaje', cls: 'ctrl', onPress: () => insert('%', 'postfix') },
    op('/', '÷', 'Dividir', '÷'),
    digit('7'), digit('8'), digit('9'), op('*', '×', 'Multiplicar', '×'),
    digit('4'), digit('5'), digit('6'), op('-', '−', 'Restar', '−'),
    digit('1'), digit('2'), digit('3'), op('+', '+', 'Sumar', '+'),
    { id: 'sign', label: '±', aria: 'Cambiar signo', cls: 'num', onPress: doToggleSign },
    digit('0'), digit('.'),
    { id: '=', label: '=', aria: 'Calcular resultado', cls: 'equals', onPress: evaluate },
  ]

  /* ------------------------------- Teclado -------------------------------- */

  const flash = (id: string) => {
    setPressedId(id)
    window.clearTimeout(pressTimer.current)
    pressTimer.current = window.setTimeout(() => setPressedId(null), 140)
  }

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandler.current = (e: KeyboardEvent) => {
    if (!active || e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target && (target.closest('input, textarea, select, [contenteditable="true"]'))) return

    const all = [...sciKeys, ...numKeys]
    const press = (id: string) => {
      const k = all.find((x) => x.id === id)
      if (!k) return
      e.preventDefault()
      flash(id)
      k.onPress()
    }
    const k = e.key
    if (/^[0-9]$/.test(k)) return press(k)
    if (k === '.' || e.code === 'NumpadDecimal') return press('.')
    switch (k) {
      case '+': case '-': case '*': case '/': case '(': case ')': case ',': case '%':
        return press(k)
      case '^': return insert('^', 'binary'), flash('pow'), e.preventDefault()
      case '!': return press('fact')
      case 'Enter': case '=':
        // Si el foco está en un botón, Enter ya lo activa; evitar doble pulsación.
        if (target?.tagName === 'BUTTON' && k === 'Enter') return
        return press('=')
      case 'Backspace': return press('back')
      case 'Escape': case 'Delete': return press('ac')
      case 'p': case 'P': return press('pi')
      case 'e': case 'E': return press('e')
      case 'a': case 'A': return press('ans')
      case 's': return insert(`sin${hyp ? 'h' : ''}${second ? '⁻¹' : ''}(`, 'prefix'), flash('sin'), e.preventDefault()
      case 'c': return insert(`cos${hyp ? 'h' : ''}${second ? '⁻¹' : ''}(`, 'prefix'), flash('cos'), e.preventDefault()
      case 't': return insert(`tan${hyp ? 'h' : ''}${second ? '⁻¹' : ''}(`, 'prefix'), flash('tan'), e.preventDefault()
      case 'l': return insert('ln(', 'prefix'), e.preventDefault()
      case 'g': return insert('log(', 'prefix'), e.preventDefault()
      case 'r': return insert('√(', 'prefix'), e.preventDefault()
      case 'm': return press('mod')
      case 'i': return press('2nd')
      case 'h': return press('hyp')
      case 'd': return setAngle((a) => (a === 'DEG' ? 'RAD' : 'DEG')), e.preventDefault()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* -------------------------------- Render -------------------------------- */

  const ghost = ')'.repeat(openParens(expr))
  let resultLine: { text: string; tone: 'result' | 'preview' | 'error' | 'idle' }
  if (error) resultLine = { text: error, tone: 'error' }
  else if (justEvaluated) resultLine = { text: resultText, tone: 'result' }
  else if (preview?.ok && !/^[\d.]+$/.test(expr)) resultLine = { text: preview.text, tone: 'preview' }
  else resultLine = { text: expr ? '' : '0', tone: 'idle' }

  const renderKey = (k: KeyDef) => (
    <button
      key={k.id}
      type="button"
      className={`key ${k.cls ?? ''} ${pressedId === k.id ? 'is-pressed' : ''} ${k.pressed ? 'is-on' : ''}`}
      onClick={k.onPress}
      aria-label={k.aria}
      aria-pressed={k.pressed}
      title={k.title ?? k.aria}
    >
      {k.label}
    </button>
  )

  return (
    <div className={`calc-layout ${showHistory ? 'history-open' : ''}`}>
      <div className="card calculator">
        <div className="display" aria-label="Pantalla">
          <div className="status-bar">
            <button
              type="button"
              className="chip chip-btn"
              onClick={() => setAngle((a) => (a === 'DEG' ? 'RAD' : 'DEG'))}
              aria-label={`Modo angular: ${angle === 'DEG' ? 'grados' : 'radianes'}. Pulsa para cambiar`}
              title="Cambiar DEG/RAD (tecla D)"
            >
              <span className={angle === 'DEG' ? 'on' : ''}>DEG</span>
              <span className={angle === 'RAD' ? 'on' : ''}>RAD</span>
            </button>
            {second && <span className="chip accent">2nd</span>}
            {hyp && <span className="chip accent">hyp</span>}
            {memory != null && (
              <span className="chip" title={`Memoria: ${numberToExpr(memory)}`}>
                M
              </span>
            )}
            <span className="spacer" />
            <button type="button" className="icon-btn small" onClick={copyResult} aria-label="Copiar resultado" title="Copiar resultado">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <rect x="8" y="8" width="12" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-btn small history-toggle"
              onClick={() => setShowHistory((s) => !s)}
              aria-label={showHistory ? 'Ocultar historial' : 'Mostrar historial'}
              aria-expanded={showHistory}
              aria-controls="history-panel"
              title="Historial"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 3v5h5M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className={`expr ${justEvaluated ? 'is-done' : ''}`} ref={exprRef} aria-label="Expresión">
            {expr || <span className="placeholder">Escribe una operación</span>}
            {ghost && <span className="ghost">{ghost}</span>}
            {justEvaluated && <span className="eq-sign"> =</span>}
          </div>
          <output className={`result tone-${resultLine.tone}`} aria-live="polite" aria-atomic="true">
            {resultLine.tone === 'preview' && <span className="approx">= </span>}
            {resultLine.text}
          </output>
        </div>

        <div className="keypad">
          <div className="keys sci" role="group" aria-label="Funciones científicas">
            {sciKeys.map(renderKey)}
          </div>
          <div className="keys numpad" role="group" aria-label="Teclado numérico">
            {numKeys.map(renderKey)}
          </div>
        </div>
      </div>

      <History
        items={history}
        onUseExpr={(item) => {
          setExpr(item.expr)
          setJustEvaluated(false)
          setError(null)
          setShowHistory(false)
        }}
        onUseResult={(item) => {
          insert(numberToExpr(item.value), 'prefix')
          setShowHistory(false)
        }}
        onClear={() => {
          setHistory([])
          notify('Historial borrado')
        }}
        onClose={() => setShowHistory(false)}
      />
    </div>
  )
}
