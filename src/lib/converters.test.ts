import { describe, expect, it } from 'vitest'
import { UNIT_CATEGORIES, convertUnit, formatInBase, formatNumber, parseInBase } from './converters'

describe('conversor de unidades', () => {
  it('todas las unidades definidas existen en math.js', () => {
    for (const cat of UNIT_CATEGORIES) {
      const [first] = cat.units
      for (const u of cat.units) expect(() => convertUnit(1, first.id, u.id)).not.toThrow()
    }
  })
  it('conversiones conocidas', () => {
    expect(formatNumber(convertUnit(1, 'km', 'm'))).toBe('1000')
    expect(formatNumber(convertUnit(100, 'degC', 'degF'))).toBe('212')
    expect(formatNumber(convertUnit(0, 'degC', 'K'))).toBe('273.15')
    expect(formatNumber(convertUnit(1, 'inch', 'cm'))).toBe('2.54')
    expect(formatNumber(convertUnit(36, 'km/h', 'm/s'))).toBe('10')
  })
})

describe('conversor de bases', () => {
  it('convierte entre bases', () => {
    const r = parseInBase('FF', 16)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(formatInBase(r.value, 10)).toBe('255')
    expect(formatInBase(r.value, 2)).toBe('1111 1111')
    expect(formatInBase(r.value, 8)).toBe('377')
  })
  it('enteros grandes y negativos', () => {
    const r = parseInBase('-18446744073709551616', 10)
    expect(r.ok && formatInBase(r.value, 16)).toBe('-1 0000 0000 0000 0000')
  })
  it('rechaza dígitos inválidos', () => {
    expect(parseInBase('102', 2).ok).toBe(false)
    expect(parseInBase('G', 16).ok).toBe(false)
  })
})
