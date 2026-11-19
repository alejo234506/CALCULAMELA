import { describe, expect, it } from 'vitest'
import { backspace, evaluateExpression, toggleSign, type AngleMode } from './engine'

const calc = (expr: string, angle: AngleMode = 'DEG', ans = 0) => {
  const r = evaluateExpression(expr, { angle, ans })
  return r.ok ? r.text : `ERROR: ${r.error}`
}

describe('aritmética básica y formato', () => {
  it('evita artefactos de coma flotante', () => {
    expect(calc('0.1+0.2')).toBe('0.3')
    expect(calc('1.1×3')).toBe('3.3')
  })
  it('respeta precedencia y paréntesis', () => {
    expect(calc('2+3×4')).toBe('14')
    expect(calc('(2+3)×4')).toBe('20')
    expect(calc('2^3^2')).toBe('512')
    expect(calc('−2^2')).toBe('-4')
  })
  it('cierra paréntesis automáticamente', () => {
    expect(calc('2×(3+4')).toBe('14')
    expect(calc('√(16')).toBe('4')
  })
  it('multiplicación implícita', () => {
    expect(calc('2π')).toBe('6.2831853071796')
    expect(calc('2(3)')).toBe('6')
  })
})

describe('trigonometría', () => {
  it('DEG convierte a grados', () => {
    expect(calc('sin(30)', 'DEG')).toBe('0.5')
    expect(calc('cos(60)', 'DEG')).toBe('0.5')
    expect(calc('cos(90)', 'DEG')).toBe('0')
    expect(calc('sin(180)', 'DEG')).toBe('0')
    expect(calc('tan(45)', 'DEG')).toBe('1')
    expect(calc('sin⁻¹(0.5)', 'DEG')).toBe('30')
    expect(calc('tan(90)', 'DEG')).toMatch(/^ERROR/)
  })
  it('RAD usa radianes', () => {
    expect(calc('sin(π÷2)', 'RAD')).toBe('1')
    expect(calc('sin(π)', 'RAD')).toBe('0')
    expect(calc('cos⁻¹(−1)', 'RAD')).toBe('3.1415926535898')
  })
  it('hiperbólicas no dependen del modo', () => {
    expect(calc('sinh(0)', 'DEG')).toBe('0')
    expect(calc('cosh(0)', 'DEG')).toBe('1')
  })
  it('dominio inválido da error claro', () => {
    expect(calc('sin⁻¹(2)')).toMatch(/dominio/)
  })
})

describe('funciones', () => {
  it('factorial', () => {
    expect(calc('5!')).toBe('120')
    expect(calc('0!')).toBe('1')
  })
  it('logaritmos', () => {
    expect(calc('logb(8,2)')).toBe('3')
    expect(calc('logb(81,3)')).toBe('4')
    expect(calc('log(1000)')).toBe('3')
    expect(calc('ln(ℯ)')).toBe('1')
  })
  it('raíces y potencias', () => {
    expect(calc('∛(27)')).toBe('3')
    expect(calc('root(−8,3)')).toBe('-2')
    expect(calc('10^3')).toBe('1000')
    expect(calc('4^(−1)')).toBe('0.25')
  })
  it('abs y mod', () => {
    expect(calc('abs(−7)')).toBe('7')
    expect(calc('17 mod 5')).toBe('2')
  })
  it('Ans', () => {
    expect(calc('Ans×2', 'DEG', 21)).toBe('42')
    expect(calc('3Ans', 'DEG', 2)).toBe('6')
  })
})

describe('porcentaje', () => {
  it('porcentaje simple', () => {
    expect(calc('50%')).toBe('0.5')
    expect(calc('200×10%')).toBe('20')
  })
  it('suma y resta de porcentaje', () => {
    expect(calc('100+10%')).toBe('110')
    expect(calc('100−10%')).toBe('90')
    expect(calc('100+10%+10%')).toBe('121')
  })
  it('porcentaje seguido de operador no es módulo', () => {
    expect(calc('10%+5')).toBe('5.1')
    expect(calc('(20+30)%')).toBe('0.5')
  })
})

describe('errores', () => {
  it('división entre cero', () => {
    expect(calc('5÷0')).toBe('ERROR: No se puede dividir entre cero')
  })
  it('sintaxis inválida', () => {
    expect(calc('5×')).toMatch(/^ERROR/)
    expect(calc('×5')).toMatch(/^ERROR/)
  })
  it('resultado complejo', () => {
    expect(calc('√(−1)')).toBe('ERROR: El resultado no es un número real')
  })
  it('desbordamiento', () => {
    expect(calc('171!')).toMatch(/Desbordamiento/)
  })
  it('no permite funciones peligrosas', () => {
    expect(calc('import(1)')).toMatch(/^ERROR/)
  })
})

describe('edición', () => {
  it('backspace borra tokens completos', () => {
    expect(backspace('2+sin⁻¹(')).toBe('2+')
    expect(backspace('3 mod ')).toBe('3')
    expect(backspace('12')).toBe('1')
  })
  it('cambio de signo', () => {
    expect(toggleSign('5+3')).toBe('5+(−3')
    expect(toggleSign('5+(−3')).toBe('5+3')
    expect(toggleSign('')).toBe('(−')
  })
})
