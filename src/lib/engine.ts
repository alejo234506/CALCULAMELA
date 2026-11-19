import { create, all, type MathNode, type MathJsInstance } from 'mathjs'

export type AngleMode = 'DEG' | 'RAD'

export type EvalResult =
  | { ok: true; value: number; text: string }
  | { ok: false; error: string }

/* ------------------------------------------------------------------ */
/*  Instancias de math.js (una por modo angular)                       */
/* ------------------------------------------------------------------ */

const EPS = 1e-14
const snap = (x: number) => (Math.abs(x) < EPS ? 0 : x)
const toRad = (x: number) => (x * Math.PI) / 180
const toDeg = (x: number) => (x * 180) / Math.PI

/** Comprueba si `x` es múltiplo (casi exacto) de `step`. */
const isMultiple = (x: number, step: number) => {
  const q = x / step
  return Math.abs(q - Math.round(q)) < 1e-12
}

function assertReal(x: number, fn: string) {
  if (Number.isNaN(x)) throw new CalcError(`Valor fuera del dominio de ${fn}`)
  return x
}

class CalcError extends Error {}

interface Engine {
  m: MathJsInstance
  parse: MathJsInstance['parse']
}

function buildInstance(mode: AngleMode): Engine {
  const m = create(all, { number: 'number' })

  const trig =
    mode === 'DEG'
      ? {
          sin: (x: number) => (isMultiple(x, 180) ? 0 : snap(Math.sin(toRad(x)))),
          cos: (x: number) => (isMultiple(x - 90, 180) ? 0 : snap(Math.cos(toRad(x)))),
          tan: (x: number) => {
            if (isMultiple(x - 90, 180)) throw new CalcError('tan no está definida en ese ángulo')
            return isMultiple(x, 180) ? 0 : snap(Math.tan(toRad(x)))
          },
          asin: (x: number) => toDeg(assertReal(Math.asin(x), 'sin⁻¹')),
          acos: (x: number) => toDeg(assertReal(Math.acos(x), 'cos⁻¹')),
          atan: (x: number) => toDeg(Math.atan(x)),
        }
      : {
          sin: (x: number) => snap(Math.sin(x)),
          cos: (x: number) => snap(Math.cos(x)),
          tan: (x: number) => {
            if (Math.abs(Math.cos(x)) < EPS) throw new CalcError('tan no está definida en ese ángulo')
            return snap(Math.tan(x))
          },
          asin: (x: number) => assertReal(Math.asin(x), 'sin⁻¹'),
          acos: (x: number) => assertReal(Math.acos(x), 'cos⁻¹'),
          atan: (x: number) => Math.atan(x),
        }

  m.import(
    {
      ...trig,
      acosh: (x: number) => assertReal(Math.acosh(x), 'cosh⁻¹'),
      atanh: (x: number) => {
        if (Math.abs(x) >= 1) throw new CalcError('Valor fuera del dominio de tanh⁻¹')
        return Math.atanh(x)
      },
      pct: (x: number) => x / 100,
    },
    { override: true },
  )

  const parse = m.parse

  // Bloquear funciones peligrosas o innecesarias dentro de expresiones.
  const blocked = () => {
    throw new CalcError('Función no permitida')
  }
  m.import(
    {
      import: blocked,
      createUnit: blocked,
      evaluate: blocked,
      parse: blocked,
      simplify: blocked,
      derivative: blocked,
      resolve: blocked,
      reviver: blocked,
    },
    { override: true },
  )
  return { m, parse }
}

const instances: Record<AngleMode, Engine> = {
  DEG: buildInstance('DEG'),
  RAD: buildInstance('RAD'),
}

/* ------------------------------------------------------------------ */
/*  Formato de números                                                 */
/* ------------------------------------------------------------------ */

export function formatNumber(value: number): string {
  if (Object.is(value, -0)) value = 0
  return instances.RAD.m.format(value, {
    precision: 14,
    lowerExp: -9,
    upperExp: 15,
  }) as string
}

/* ------------------------------------------------------------------ */
/*  Conversión de la expresión visible a sintaxis de math.js           */
/* ------------------------------------------------------------------ */

/** Cuenta paréntesis abiertos sin cerrar. */
export function openParens(expr: string): number {
  let depth = 0
  for (const ch of expr) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
  }
  return depth
}

const FN_MAP: Record<string, string> = {
  ln: 'log',
  log: 'log10',
  logb: 'log',
  root: 'nthRoot',
  abs: 'abs',
}

/**
 * Busca hacia atrás desde `end` (exclusivo) el operando inmediatamente anterior:
 * número, constante, Ans, grupo entre paréntesis (con su función) y factoriales.
 * Devuelve el índice de inicio o -1.
 */
function operandStart(s: string, end: number): number {
  let i = end
  while (i > 0 && s[i - 1] === '!') i--
  if (i === 0) return -1
  const ch = s[i - 1]
  if (ch === ')') {
    let depth = 0
    let j = i - 1
    for (; j >= 0; j--) {
      if (s[j] === ')') depth++
      else if (s[j] === '(') {
        depth--
        if (depth === 0) break
      }
    }
    if (j < 0) return -1
    // nombre de función delante del paréntesis
    while (j > 0 && /[A-Za-z0-9_]/.test(s[j - 1])) j--
    return j
  }
  if (/[0-9.]/.test(ch)) {
    let j = i - 1
    while (j > 0 && /[0-9.]/.test(s[j - 1])) j--
    // notación científica 1.2e+21
    const m = /([0-9.]+e[+-]?)$/.exec(s.slice(0, j))
    if (m) j -= m[1].length
    return j
  }
  if (/[A-Za-z_]/.test(ch)) {
    let j = i - 1
    while (j > 0 && /[A-Za-z0-9_]/.test(s[j - 1])) j--
    return j
  }
  return -1
}

/** Reemplaza `X%` por `pct(X)` para evitar la ambigüedad de `%` con módulo. */
function rewritePercent(s: string): string {
  let idx = s.indexOf('%')
  while (idx !== -1) {
    const start = operandStart(s, idx)
    if (start < 0) throw new CalcError('Usa % después de un número')
    s = `${s.slice(0, start)}pct(${s.slice(start, idx)})${s.slice(idx + 1)}`
    idx = s.indexOf('%')
  }
  return s
}

export function toMathSyntax(display: string): string {
  let s = display
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, '(pi)')
    .replace(/ℯ/g, '(e)')
    .replace(/√\(/g, 'sqrt(')
    .replace(/∛\(/g, 'cbrt(')
    .replace(/Ans/g, '(ans)')
    .replace(/(sinh|cosh|tanh|sin|cos|tan)(⁻¹)?\(/g, (_m, base: string, inv?: string) =>
      `${inv ? 'a' : ''}${base}(`,
    )
    .replace(/(logb|log|ln|root|abs)\(/g, (_m, name: string) => `${FN_MAP[name]}(`)
  s += ')'.repeat(openParens(s))
  // `%` → pct(...) (mod se escribe como «mod»)
  s = rewritePercent(s)
  return s
}

/** Convierte `a ± pct(b)` en `a ± a·b/100` (semántica clásica de calculadora). */
function applyPercentSemantics(m: MathJsInstance, node: MathNode): MathNode {
  const mapped = node.map((child) => applyPercentSemantics(m, child))
  if (
    mapped.type === 'OperatorNode' &&
    (mapped as unknown as { fn: string }).fn &&
    ['add', 'subtract'].includes((mapped as unknown as { fn: string }).fn)
  ) {
    const op = mapped as unknown as { op: string; fn: string; args: MathNode[] }
    const [a, b] = op.args
    if (op.args.length === 2 && b.type === 'FunctionNode' && (b as unknown as { name: string }).name === 'pct') {
      const inner = (b as unknown as { args: MathNode[] }).args[0]
      const portion = new m.OperatorNode('*', 'multiply', [
        a.cloneDeep(),
        new m.OperatorNode('/', 'divide', [inner, new m.ConstantNode(100)]),
      ])
      return new m.OperatorNode(op.op as '+', op.fn as 'add', [a, portion])
    }
  }
  return mapped
}

/* ------------------------------------------------------------------ */
/*  Evaluación                                                         */
/* ------------------------------------------------------------------ */

function translateError(err: unknown): string {
  if (err instanceof CalcError) return err.message
  const msg = err instanceof Error ? err.message : String(err)
  if (/Undefined (symbol|function)/i.test(msg)) {
    const name = /Undefined (?:symbol|function) (\S+)/i.exec(msg)?.[1]
    return name ? `Símbolo desconocido: ${name}` : 'Símbolo desconocido'
  }
  if (/Unexpected end of expression/i.test(msg)) return 'Expresión incompleta'
  if (/Parenthesis/i.test(msg)) return 'Paréntesis desbalanceados'
  if (/Unexpected|Value expected|SyntaxError|Invalid/i.test(msg)) return 'Sintaxis inválida'
  if (/Too few arguments|Too many arguments|Wrong number of arguments/i.test(msg))
    return 'Número de argumentos incorrecto'
  if (/integer/i.test(msg)) return 'Se esperaba un número entero'
  if (/Unexpected type/i.test(msg)) return 'Tipo de valor no válido'
  return 'Error de cálculo'
}

function hasDivisionByZero(node: MathNode, scope: Record<string, unknown>): boolean {
  let found = false
  node.traverse((n) => {
    if (found || n.type !== 'OperatorNode') return
    const op = n as unknown as { fn: string; args: MathNode[] }
    if (op.fn !== 'divide' || op.args.length !== 2) return
    try {
      if (op.args[1].compile().evaluate(scope) === 0) found = true
    } catch {
      /* ignorar */
    }
  })
  return found
}

export interface EvalOptions {
  angle: AngleMode
  ans?: number
}

export function evaluateExpression(display: string, { angle, ans = 0 }: EvalOptions): EvalResult {
  const trimmed = display.trim()
  if (!trimmed) return { ok: false, error: 'Expresión vacía' }
  const { m, parse } = instances[angle]
  const scope = { ans }
  try {
    const syntax = toMathSyntax(trimmed)
    const node = applyPercentSemantics(m, parse(syntax))
    const raw: unknown = node.compile().evaluate(scope)
    let value: number
    if (typeof raw === 'number') value = raw
    else if (typeof raw === 'boolean') value = raw ? 1 : 0
    else if (raw && typeof raw === 'object' && 'isComplex' in raw) {
      const c = raw as unknown as { re: number; im: number }
      if (Math.abs(c.im) < EPS) value = c.re
      else return { ok: false, error: 'El resultado no es un número real' }
    } else if (raw && typeof raw === 'object' && 'isResultSet' in raw) {
      return { ok: false, error: 'Usa una sola expresión' }
    } else {
      return { ok: false, error: 'Resultado no numérico' }
    }
    if (Number.isNaN(value)) return { ok: false, error: 'Resultado indefinido' }
    if (!Number.isFinite(value)) {
      if (hasDivisionByZero(node, scope)) return { ok: false, error: 'No se puede dividir entre cero' }
      return { ok: false, error: 'Desbordamiento: el resultado es demasiado grande' }
    }
    return { ok: true, value, text: formatNumber(value) }
  } catch (err) {
    return { ok: false, error: translateError(err) }
  }
}

/* ------------------------------------------------------------------ */
/*  Utilidades de edición                                              */
/* ------------------------------------------------------------------ */

const TOKEN_TAIL =
  /(?:(?:sinh|cosh|tanh|sin|cos|tan)(?:⁻¹)?\(|(?:logb|log|ln|root|abs)\(|√\(|∛\(|Ans| mod |\^\(−1\))$/

/** Borra el último token (una función completa, «Ans», « mod »…) o carácter. */
export function backspace(expr: string): string {
  const m = TOKEN_TAIL.exec(expr)
  if (m) return expr.slice(0, -m[0].length)
  const chars = Array.from(expr)
  chars.pop()
  return chars.join('')
}

/** Cambia el signo del último número/operando. */
export function toggleSign(expr: string): string {
  const m = /(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+|π|ℯ|Ans)$/.exec(expr)
  if (!m) {
    if (expr.endsWith('(−')) return expr.slice(0, -2)
    return `${expr}(−`
  }
  const start = expr.length - m[0].length
  const before = expr.slice(0, start)
  if (before.endsWith('(−')) return before.slice(0, -2) + m[0]
  return `${before}(−${m[0]}`
}

/** Convierte un número a texto apto para insertar en la expresión. */
export function numberToExpr(value: number): string {
  const text = formatNumber(value).replace(/-/g, '−')
  return value < 0 ? `(${text})` : text
}
