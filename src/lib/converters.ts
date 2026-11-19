import { unit } from 'mathjs'
import { formatNumber } from './engine'

/* ------------------------------------------------------------------ */
/*  Conversor de unidades                                              */
/* ------------------------------------------------------------------ */

export interface UnitDef {
  id: string // identificador de math.js
  label: string
  symbol: string
}

export interface UnitCategory {
  id: string
  label: string
  icon: string
  units: UnitDef[]
}

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'length',
    label: 'Longitud',
    icon: '📏',
    units: [
      { id: 'mm', label: 'Milímetro', symbol: 'mm' },
      { id: 'cm', label: 'Centímetro', symbol: 'cm' },
      { id: 'm', label: 'Metro', symbol: 'm' },
      { id: 'km', label: 'Kilómetro', symbol: 'km' },
      { id: 'inch', label: 'Pulgada', symbol: 'in' },
      { id: 'ft', label: 'Pie', symbol: 'ft' },
      { id: 'yd', label: 'Yarda', symbol: 'yd' },
      { id: 'mi', label: 'Milla', symbol: 'mi' },
    ],
  },
  {
    id: 'mass',
    label: 'Masa',
    icon: '⚖️',
    units: [
      { id: 'mg', label: 'Miligramo', symbol: 'mg' },
      { id: 'g', label: 'Gramo', symbol: 'g' },
      { id: 'kg', label: 'Kilogramo', symbol: 'kg' },
      { id: 'tonne', label: 'Tonelada', symbol: 't' },
      { id: 'oz', label: 'Onza', symbol: 'oz' },
      { id: 'lb', label: 'Libra', symbol: 'lb' },
    ],
  },
  {
    id: 'temperature',
    label: 'Temperatura',
    icon: '🌡️',
    units: [
      { id: 'degC', label: 'Celsius', symbol: '°C' },
      { id: 'degF', label: 'Fahrenheit', symbol: '°F' },
      { id: 'K', label: 'Kelvin', symbol: 'K' },
    ],
  },
  {
    id: 'volume',
    label: 'Volumen',
    icon: '🧪',
    units: [
      { id: 'mL', label: 'Mililitro', symbol: 'mL' },
      { id: 'L', label: 'Litro', symbol: 'L' },
      { id: 'm^3', label: 'Metro cúbico', symbol: 'm³' },
      { id: 'cup', label: 'Taza (EE. UU.)', symbol: 'cup' },
      { id: 'floz', label: 'Onza líquida', symbol: 'fl oz' },
      { id: 'gal', label: 'Galón (EE. UU.)', symbol: 'gal' },
    ],
  },
  {
    id: 'area',
    label: 'Área',
    icon: '🗺️',
    units: [
      { id: 'cm^2', label: 'Centímetro cuadrado', symbol: 'cm²' },
      { id: 'm^2', label: 'Metro cuadrado', symbol: 'm²' },
      { id: 'km^2', label: 'Kilómetro cuadrado', symbol: 'km²' },
      { id: 'hectare', label: 'Hectárea', symbol: 'ha' },
      { id: 'ft^2', label: 'Pie cuadrado', symbol: 'ft²' },
      { id: 'acre', label: 'Acre', symbol: 'ac' },
    ],
  },
  {
    id: 'speed',
    label: 'Velocidad',
    icon: '🚀',
    units: [
      { id: 'm/s', label: 'Metros por segundo', symbol: 'm/s' },
      { id: 'km/h', label: 'Kilómetros por hora', symbol: 'km/h' },
      { id: 'mi/h', label: 'Millas por hora', symbol: 'mph' },
      { id: 'ft/s', label: 'Pies por segundo', symbol: 'ft/s' },
    ],
  },
  {
    id: 'time',
    label: 'Tiempo',
    icon: '⏱️',
    units: [
      { id: 'ms', label: 'Milisegundo', symbol: 'ms' },
      { id: 's', label: 'Segundo', symbol: 's' },
      { id: 'min', label: 'Minuto', symbol: 'min' },
      { id: 'h', label: 'Hora', symbol: 'h' },
      { id: 'day', label: 'Día', symbol: 'd' },
      { id: 'week', label: 'Semana', symbol: 'sem' },
    ],
  },
  {
    id: 'data',
    label: 'Datos',
    icon: '💾',
    units: [
      { id: 'b', label: 'Bit', symbol: 'b' },
      { id: 'B', label: 'Byte', symbol: 'B' },
      { id: 'kB', label: 'Kilobyte', symbol: 'kB' },
      { id: 'MB', label: 'Megabyte', symbol: 'MB' },
      { id: 'GB', label: 'Gigabyte', symbol: 'GB' },
      { id: 'TB', label: 'Terabyte', symbol: 'TB' },
      { id: 'KiB', label: 'Kibibyte', symbol: 'KiB' },
      { id: 'MiB', label: 'Mebibyte', symbol: 'MiB' },
      { id: 'GiB', label: 'Gibibyte', symbol: 'GiB' },
    ],
  },
  {
    id: 'pressure',
    label: 'Presión',
    icon: '🎈',
    units: [
      { id: 'Pa', label: 'Pascal', symbol: 'Pa' },
      { id: 'kPa', label: 'Kilopascal', symbol: 'kPa' },
      { id: 'bar', label: 'Bar', symbol: 'bar' },
      { id: 'atm', label: 'Atmósfera', symbol: 'atm' },
      { id: 'psi', label: 'Libra por pulgada²', symbol: 'psi' },
      { id: 'mmHg', label: 'Milímetro de mercurio', symbol: 'mmHg' },
    ],
  },
]

export function convertUnit(value: number, from: string, to: string): number {
  return unit(value, from).toNumber(to)
}

export { formatNumber }

/* ------------------------------------------------------------------ */
/*  Conversor de bases numéricas                                       */
/* ------------------------------------------------------------------ */

export type Base = 2 | 8 | 10 | 16

export const BASES: { base: Base; id: string; label: string; digits: RegExp }[] = [
  { base: 2, id: 'BIN', label: 'Binario', digits: /^[01]+$/ },
  { base: 8, id: 'OCT', label: 'Octal', digits: /^[0-7]+$/ },
  { base: 10, id: 'DEC', label: 'Decimal', digits: /^[0-9]+$/ },
  { base: 16, id: 'HEX', label: 'Hexadecimal', digits: /^[0-9a-f]+$/i },
]

export type ParseBaseResult = { ok: true; value: bigint } | { ok: false; error: string }

/** Interpreta un entero (con signo opcional) en la base indicada usando BigInt. */
export function parseInBase(input: string, base: Base): ParseBaseResult {
  const clean = input.trim().replace(/[\s_]/g, '')
  if (!clean) return { ok: false, error: 'Escribe un número' }
  const negative = clean.startsWith('-')
  const digits = negative ? clean.slice(1) : clean
  const def = BASES.find((b) => b.base === base)!
  if (!digits || !def.digits.test(digits)) {
    return { ok: false, error: `Dígito no válido para ${def.label.toLowerCase()} (${def.id})` }
  }
  let value = 0n
  const big = BigInt(base)
  for (const ch of digits.toLowerCase()) value = value * big + BigInt(parseInt(ch, 16))
  return { ok: true, value: negative ? -value : value }
}

export function formatInBase(value: bigint, base: Base): string {
  const negative = value < 0n
  const abs = negative ? -value : value
  let text = abs.toString(base).toUpperCase()
  if (base === 2) text = text.replace(/\B(?=(\d{4})+(?!\d))/g, ' ')
  else if (base === 16) text = text.replace(/\B(?=([0-9A-F]{4})+(?![0-9A-F]))/g, ' ')
  else if (base === 10) text = text.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return negative ? `-${text}` : text
}
