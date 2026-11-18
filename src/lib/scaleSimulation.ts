export type SimulationMethod = 'cubic' | 'detailed'

export type SimulationVisibility = {
  filament: boolean
  time: boolean
}

export type SimulationFilament = {
  name: string
  grams: number
}

export type ScaleSimulationBase = {
  sizeCm: number
  basePercent: number
  unitPrice: number
  filaments: SimulationFilament[]
  timeHours: number
  fixedUnitCost: number
  scalableUnitCost: number
  batch: number
  fixedFee: number
  percentFee: number
  pricingMode: 'cost' | 'sale'
  margin: number
}

export type ScaleSimulationResult = {
  factor: number
  percent: number
  sizeCm: number
  unitPrice: number
  timeHours: number
  filaments: SimulationFilament[]
  totalFilamentGrams: number
}

export type SimulationPayload = {
  base: ScaleSimulationBase
  method: SimulationMethod
  percent: number
  visibility: SimulationVisibility
}

const finitePositive = (value: number) => Number.isFinite(value) && value > 0
const finiteNonNegative = (value: number) => Number.isFinite(value) && value >= 0

function assertBase(base: ScaleSimulationBase) {
  if (
    !finitePositive(base.sizeCm) ||
    !finitePositive(base.basePercent) ||
    !finitePositive(base.unitPrice)
  )
    throw new Error('Informe tamanho, escala e preço de referência maiores que zero.')
  if (!finitePositive(base.batch) || !Number.isInteger(base.batch))
    throw new Error('O lote da simulação é inválido.')
  if (
    !finiteNonNegative(base.timeHours) ||
    !finiteNonNegative(base.fixedUnitCost) ||
    !finiteNonNegative(base.scalableUnitCost) ||
    !finiteNonNegative(base.fixedFee) ||
    !finiteNonNegative(base.percentFee) ||
    !Number.isFinite(base.margin)
  )
    throw new Error('A referência da simulação contém valores inválidos.')
  if (base.filaments.some((filament) => !filament.name || !finitePositive(filament.grams)))
    throw new Error('A referência da simulação precisa de filamentos válidos.')
}

function detailedPrice(base: ScaleSimulationBase, volumeFactor: number) {
  const unitCost = base.fixedUnitCost + base.scalableUnitCost * volumeFactor
  const feeRate = base.percentFee / 100
  const marginRate = base.margin / 100
  const denominator = base.pricingMode === 'sale' ? 1 - feeRate - marginRate : 1 - feeRate
  if (denominator <= 0) throw new Error('Margem e taxas não permitem calcular a simulação.')
  const batchCost = unitCost * base.batch
  const batchPrice =
    base.pricingMode === 'sale'
      ? (batchCost + base.fixedFee) / denominator
      : (batchCost * (1 + marginRate) + base.fixedFee) / denominator
  return batchPrice / base.batch
}

export function minimumDetailedPrice(base: ScaleSimulationBase) {
  assertBase(base)
  return detailedPrice(base, 0)
}

export function simulateScale(
  base: ScaleSimulationBase,
  percent: number,
  method: SimulationMethod,
): ScaleSimulationResult {
  assertBase(base)
  if (!finitePositive(percent)) throw new Error('Informe uma escala maior que zero.')
  const factor = percent / base.basePercent
  const volumeFactor = factor ** 3
  const filaments = base.filaments.map((filament) => ({
    ...filament,
    grams: filament.grams * volumeFactor,
  }))
  return {
    factor,
    percent,
    sizeCm: base.sizeCm * factor,
    unitPrice:
      method === 'cubic' ? base.unitPrice * volumeFactor : detailedPrice(base, volumeFactor),
    timeHours: base.timeHours * volumeFactor,
    filaments,
    totalFilamentGrams: filaments.reduce((total, filament) => total + filament.grams, 0),
  }
}

export function percentFromPrice(
  base: ScaleSimulationBase,
  unitPrice: number,
  method: SimulationMethod,
) {
  assertBase(base)
  if (!finitePositive(unitPrice)) throw new Error('Informe um preço maior que zero.')
  let volumeFactor: number
  if (method === 'cubic') {
    volumeFactor = unitPrice / base.unitPrice
  } else {
    const feeRate = base.percentFee / 100
    const marginRate = base.margin / 100
    const targetBatchPrice = unitPrice * base.batch
    const targetUnitCost =
      base.pricingMode === 'sale'
        ? (targetBatchPrice * (1 - feeRate - marginRate) - base.fixedFee) / base.batch
        : (targetBatchPrice * (1 - feeRate) - base.fixedFee) / (base.batch * (1 + marginRate))
    volumeFactor = (targetUnitCost - base.fixedUnitCost) / base.scalableUnitCost
  }
  if (!finitePositive(volumeFactor))
    throw new Error('O preço informado está abaixo do mínimo desta precificação.')
  return Math.cbrt(volumeFactor) * base.basePercent
}

type CodedPayload = {
  v: 1 | 2 | 3
  a: number
  b: number
  c?: { a: string; b: number }[]
  d?: number
  e: number
  f: number
  g: number
  h: number
  i: number
  j: 'c' | 's'
  k: number
  l: 'c' | 'd'
  m: number
  n?: number
  o?: number
}

function toBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function encodeSimulationPayload(payload: SimulationPayload) {
  assertBase(payload.base)
  if (!finitePositive(payload.percent)) throw new Error('A escala compartilhada é inválida.')
  const coded: CodedPayload = {
    v: 3,
    a: payload.base.sizeCm,
    b: payload.base.unitPrice,
    c: payload.visibility.filament
      ? payload.base.filaments.map((filament) => ({ a: filament.name, b: filament.grams }))
      : undefined,
    d: payload.visibility.time ? payload.base.timeHours : undefined,
    e: payload.base.fixedUnitCost,
    f: payload.base.scalableUnitCost,
    g: payload.base.batch,
    h: payload.base.fixedFee,
    i: payload.base.percentFee,
    j: payload.base.pricingMode === 'cost' ? 'c' : 's',
    k: payload.base.margin,
    l: payload.method === 'cubic' ? 'c' : 'd',
    m: payload.percent,
    n: (payload.visibility.filament ? 1 : 0) | (payload.visibility.time ? 2 : 0),
    o: payload.base.basePercent,
  }
  return toBase64Url(JSON.stringify(coded))
}

export function decodeSimulationPayload(value: string): SimulationPayload {
  try {
    const coded = JSON.parse(fromBase64Url(value)) as Partial<CodedPayload>
    if (
      ![1, 2, 3].includes(coded.v ?? 0) ||
      !['c', 's'].includes(coded.j ?? '') ||
      !['c', 'd'].includes(coded.l ?? '')
    )
      throw new Error()
    const visibility: SimulationVisibility =
      coded.v === 1
        ? { filament: true, time: true }
        : {
            filament: Boolean((coded.n ?? 0) & 1),
            time: Boolean((coded.n ?? 0) & 2),
          }
    if (visibility.filament && !Array.isArray(coded.c)) throw new Error()
    if (visibility.time && !finiteNonNegative(coded.d as number)) throw new Error()
    const base: ScaleSimulationBase = {
      sizeCm: coded.a as number,
      basePercent: coded.v === 3 ? (coded.o as number) : 100,
      unitPrice: coded.b as number,
      filaments: visibility.filament
        ? coded.c!.map((filament) => ({ name: filament.a, grams: filament.b }))
        : [],
      timeHours: visibility.time ? (coded.d as number) : 0,
      fixedUnitCost: coded.e as number,
      scalableUnitCost: coded.f as number,
      batch: coded.g as number,
      fixedFee: coded.h as number,
      percentFee: coded.i as number,
      pricingMode: coded.j === 'c' ? 'cost' : 'sale',
      margin: coded.k as number,
    }
    assertBase(base)
    if (!finitePositive(coded.m as number)) throw new Error()
    return {
      base,
      method: coded.l === 'c' ? 'cubic' : 'detailed',
      percent: coded.m as number,
      visibility,
    }
  } catch {
    throw new Error('Este link de simulação é inválido ou está incompleto.')
  }
}
