import { describe, expect, it } from 'vitest'
import { emptyDatabase, materialBalance, priceQuote, type Movement } from './domain'

const entry = (quantity: number, unitCost: number, type: Movement['type'] = 'purchase'): Movement => ({ id: `${quantity}-${unitCost}`, materialId: 'pla', type, quantity, unitCost, date: '2026-01-01', note: '', createdAt: '2026-01-01' })

describe('materiais', () => {
  it('preserva as compras e calcula média ponderada após ajuste', () => {
    const movements = [entry(1, 100), entry(1, 120), entry(-0.5, 110, 'adjustment')]
    expect(materialBalance('pla', movements)).toEqual({ quantity: 1.5, value: 165, average: 110 })
    expect(movements[0].unitCost).toBe(100)
  })
})

describe('precificação', () => {
  const db = emptyDatabase()
  db.materials.push({ id: 'pla', name: 'PLA', kind: 'Filamento', unit: 'kg', minimum: 0, createdAt: '' })
  db.movements.push(entry(1, 100))
  db.settings.printerPrice = 3000
  db.settings.lifeHours = 3000
  db.settings.maintenanceLifetime = 300
  db.settings.powerKw = 0.1
  db.settings.energyTariff = 1
  db.settings.channels.push({ id: 'market', name: 'Market', fixedFee: 5, percentFee: 10 })
  const sheet = { filamentId: 'pla', weightGrams: 100, lines: [], printHours: 1, labor: 0, batch: 2, channelId: 'market', mode: 'sale' as const, margin: 30 }
  it('converte gramas, soma energia e manutenção e distribui taxa fixa pelo lote', () => {
    const quote = priceQuote(sheet, db)
    expect(quote.unitCost).toBeCloseTo(11.2)
    expect(quote.batchPrice).toBeCloseTo((22.4 + 5) / 0.6)
    expect(quote.unitPrice).toBeCloseTo(quote.batchPrice / 2)
    expect(quote.profit).toBeCloseTo(quote.batchPrice * 0.3)
  })
  it('repassa taxas no acréscimo sobre custo', () => {
    const quote = priceQuote({ ...sheet, mode: 'cost', margin: 50 }, db)
    expect(quote.batchPrice).toBeCloseTo((22.4 * 1.5 + 5) / 0.9)
  })
  it('rejeita margem e taxa que anulam o divisor', () => {
    expect(() => priceQuote({ ...sheet, margin: 90 }, db)).toThrow()
  })
  it('exige custo de aquisição para material utilizado', () => {
    expect(() => priceQuote(sheet, { ...db, movements: [] })).toThrow('Registre uma compra')
  })
})
