import { describe, expect, it } from 'vitest'
import {
  decodeSimulationPayload,
  encodeSimulationPayload,
  minimumDetailedPrice,
  percentFromPrice,
  simulateScale,
  type ScaleSimulationBase,
} from '../lib/scaleSimulation'

const base: ScaleSimulationBase = {
  sizeCm: 10,
  basePercent: 100,
  unitPrice: 30,
  filaments: [{ name: 'PLA', grams: 50 }],
  timeHours: 2,
  fixedUnitCost: 5,
  scalableUnitCost: 4,
  batch: 2,
  fixedFee: 3,
  percentFee: 10,
  pricingMode: 'cost',
  margin: 50,
}

describe('simulador de escala 3D', () => {
  it('aplica a proporção cúbica a material, tempo e preço simples', () => {
    const result = simulateScale(base, 200, 'cubic')
    expect(result.sizeCm).toBe(20)
    expect(result.totalFilamentGrams).toBe(400)
    expect(result.timeHours).toBe(16)
    expect(result.unitPrice).toBe(240)
  })

  it('usa uma escala original diferente de 100% como referência', () => {
    const stretchedBase: ScaleSimulationBase = { ...base, sizeCm: 30, basePercent: 440 }
    const original = simulateScale(stretchedBase, 440, 'cubic')
    const half = simulateScale(stretchedBase, 220, 'cubic')
    const double = simulateScale(stretchedBase, 880, 'cubic')
    expect(original.sizeCm).toBe(30)
    expect(original.unitPrice).toBe(base.unitPrice)
    expect(half.sizeCm).toBe(15)
    expect(half.totalFilamentGrams).toBeCloseTo(base.filaments[0].grams / 8)
    expect(double.sizeCm).toBe(60)
    expect(double.totalFilamentGrams).toBeCloseTo(base.filaments[0].grams * 8)
    expect(percentFromPrice(stretchedBase, double.unitPrice, 'cubic')).toBeCloseTo(880)
  })

  it('mantém custos fixos e escala apenas os custos variáveis no método detalhado', () => {
    const result = simulateScale(base, 200, 'detailed')
    const expectedUnitCost = 5 + 4 * 8
    expect(result.unitPrice).toBeCloseTo((expectedUnitCost * 2 * 1.5 + 3) / 0.9 / 2)
  })

  it('recupera a escala pelo preço nos dois métodos', () => {
    for (const method of ['cubic', 'detailed'] as const) {
      const result = simulateScale(base, 175, method)
      expect(percentFromPrice(base, result.unitPrice, method)).toBeCloseTo(175)
    }
  })

  it('preserva margem sobre venda e também permite o cálculo inverso', () => {
    const saleBase: ScaleSimulationBase = {
      ...base,
      pricingMode: 'sale',
      margin: 30,
      unitPrice:
        ((base.fixedUnitCost + base.scalableUnitCost) * base.batch + base.fixedFee) / 0.6 / 2,
    }
    const reference = simulateScale(saleBase, 100, 'detailed')
    const resized = simulateScale(saleBase, 220, 'detailed')
    expect(reference.unitPrice).toBeCloseTo(saleBase.unitPrice)
    expect(percentFromPrice(saleBase, resized.unitPrice, 'detailed')).toBeCloseTo(220)
  })

  it('rejeita preço abaixo do mínimo detalhado', () => {
    expect(() => percentFromPrice(base, minimumDetailedPrice(base), 'detailed')).toThrow(
      'abaixo do mínimo',
    )
  })

  it('codifica e restaura todos os dados do link', () => {
    const payload = {
      base,
      method: 'detailed' as const,
      percent: 135,
      visibility: { filament: true, time: true },
    }
    expect(decodeSimulationPayload(encodeSimulationPayload(payload))).toEqual(payload)
    expect(() => decodeSimulationPayload('não-é-um-payload')).toThrow('link de simulação')
  })

  it('remove do link os dados que foram ocultados', () => {
    const encoded = encodeSimulationPayload({
      base,
      method: 'detailed',
      percent: 100,
      visibility: { filament: false, time: false },
    })
    const raw = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'))
    const decoded = decodeSimulationPayload(encoded)
    expect(raw).not.toContain('PLA')
    expect(raw).not.toContain('"d":')
    expect(decoded.visibility).toEqual({ filament: false, time: false })
    expect(decoded.base.filaments).toEqual([])
    expect(decoded.base.timeHours).toBe(0)
  })

  it('mantém links da primeira versão com todos os campos visíveis', () => {
    const legacy = {
      v: 1,
      a: base.sizeCm,
      b: base.unitPrice,
      c: base.filaments.map((filament) => ({ a: filament.name, b: filament.grams })),
      d: base.timeHours,
      e: base.fixedUnitCost,
      f: base.scalableUnitCost,
      g: base.batch,
      h: base.fixedFee,
      i: base.percentFee,
      j: 'c',
      k: base.margin,
      l: 'd',
      m: 125,
    }
    const encoded = btoa(JSON.stringify(legacy)).replaceAll('+', '-').replaceAll('/', '_')
    const decoded = decodeSimulationPayload(encoded)
    expect(decoded.visibility).toEqual({ filament: true, time: true })
    expect(decoded.base.basePercent).toBe(100)
    expect(decoded.base.filaments).toEqual(base.filaments)
    expect(decoded.base.timeHours).toBe(base.timeHours)
  })

  it('mantém links da segunda versão e assume escala original de 100%', () => {
    const legacy = {
      v: 2,
      a: base.sizeCm,
      b: base.unitPrice,
      e: base.fixedUnitCost,
      f: base.scalableUnitCost,
      g: base.batch,
      h: base.fixedFee,
      i: base.percentFee,
      j: 'c',
      k: base.margin,
      l: 'd',
      m: 80,
      n: 0,
    }
    const encoded = btoa(JSON.stringify(legacy)).replaceAll('+', '-').replaceAll('/', '_')
    const decoded = decodeSimulationPayload(encoded)
    expect(decoded.base.basePercent).toBe(100)
    expect(decoded.visibility).toEqual({ filament: false, time: false })
  })
})
