import { describe, expect, it } from 'vitest'
import { normalizeMaterialColor } from './materialColor'

describe('normalizeMaterialColor', () => {
  it('aceita HEX curto, longo e RGB e guarda HEX padronizado', () => {
    expect(normalizeMaterialColor('#f0a')).toBe('#FF00AA')
    expect(normalizeMaterialColor('3868d9')).toBe('#3868D9')
    expect(normalizeMaterialColor('rgb(56, 104, 217)')).toBe('#3868D9')
    expect(normalizeMaterialColor('')).toBeNull()
  })

  it('rejeita cores incompletas e canais fora do intervalo', () => {
    expect(normalizeMaterialColor('#abcd')).toBeNull()
    expect(normalizeMaterialColor('rgb(256, 0, 0)')).toBeNull()
    expect(normalizeMaterialColor('rgb(12.5, 0, 0)')).toBeNull()
  })
})
