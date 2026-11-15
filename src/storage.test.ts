import { afterEach, describe, expect, it } from 'vitest'
import { emptyDatabase } from './domain'
import { LocalStorageRepository } from './storage'

const values = new Map<string, string>()
Object.defineProperty(globalThis, 'window', { value: { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } } }, configurable: true })
afterEach(() => values.clear())

describe('LocalStorageRepository', () => {
  it('salva e recupera o banco versionado', async () => {
    const repository = new LocalStorageRepository()
    const database = emptyDatabase()
    database.settings.printers.push({ id: 'a1', name: 'A1', purchasePrice: 4200, lifeHours: 3000, usedHours: 0, maintenanceLifetime: 0, powerKw: 0.1 })
    await repository.save(database)
    expect(await repository.load()).toEqual(database)
  })

  it('preserva dados inválidos e informa erro de leitura', async () => {
    values.set('near-creation-3d:v5', '{invalid')
    await expect(new LocalStorageRepository().load()).rejects.toThrow('Nenhuma informação foi substituída')
    expect(values.get('near-creation-3d:v5')).toBe('{invalid')
  })

  it('migra a impressora e as fichas salvas da versão anterior', async () => {
    const legacy = { schemaVersion: 1, materials: [], movements: [], settings: { printerName: 'Bambu Lab A1', printerPrice: 3000, lifeHours: 3000, usedHours: 20, maintenanceLifetime: 300, powerKw: 0.1, energyTariff: 0.8, channels: [{ id: 'direct', name: 'Venda direta', fixedFee: 0, percentFee: 0 }] }, products: [{ id: 'p1', name: 'Produto', sku: 'P1', category: '', createdAt: '', quotes: [{ id: 'q1', createdAt: '', sheet: { filamentId: 'pla', weightGrams: 10, lines: [], printHours: 1, labor: 0, batch: 1, channelId: 'direct', mode: 'cost', margin: 50 }, costs: {}, unitCost: 10, batchCost: 10, batchPrice: 15, unitPrice: 15, profit: 5, sourceCosts: [], assumptions: { channelName: 'Venda direta', fixedFee: 0, percentFee: 0, printerHourlyCost: 1.1, energyHourlyCost: 0.08 } }] }] }
    values.set('near-creation-3d:v1', JSON.stringify(legacy))
    const migrated = await new LocalStorageRepository().load()
    expect(migrated.schemaVersion).toBe(5)
    expect(migrated.settings.printers[0].name).toBe('Bambu Lab A1')
    expect(migrated.products[0].quotes[0].sheet.printerId).toBe('legacy-printer')
    expect(migrated.products[0].quotes[0].sheet.filaments).toEqual([{ materialId: 'pla', weightGrams: 10 }])
    expect(values.has('near-creation-3d:v1')).toBe(true)
  })

  it('migra fichas da versão 2 sem alterar preços históricos', async () => {
    const previous = emptyDatabase()
    const old = { ...previous, schemaVersion: 2, products: [{ id: 'p2', name: 'Peça', sku: 'P2', category: '', createdAt: '', quotes: [{ id: 'q2', createdAt: '', sheet: { printerId: 'a1', filamentId: 'petg', weightGrams: 35, lines: [], printHours: 1, labor: 0, batch: 1, channelId: 'direct', mode: 'cost', margin: 50 }, costs: {}, unitCost: 8, batchCost: 8, batchPrice: 12, unitPrice: 12, profit: 4, sourceCosts: [], assumptions: { printerName: 'A1', channelName: 'Venda direta', fixedFee: 0, percentFee: 0, printerHourlyCost: 1, energyHourlyCost: 0.1 } }] }] }
    values.set('near-creation-3d:v2', JSON.stringify(old))
    const migrated = await new LocalStorageRepository().load()
    expect(migrated.schemaVersion).toBe(5)
    expect(migrated.products[0].quotes[0].sheet.filaments).toEqual([{ materialId: 'petg', weightGrams: 35 }])
    expect(migrated.products[0].quotes[0].unitPrice).toBe(12)
    expect(values.has('near-creation-3d:v2')).toBe(true)
  })

  it('migra materiais da versão 3 sem perder compras nem fichas', async () => {
    const previous = emptyDatabase()
    previous.materials.push({ id: 'pla', name: 'PLA', kind: 'Filamento', unit: 'kg', minimum: 1, color: null, stockBaseline: null, createdAt: '' })
    previous.movements.push({ id: 'buy', materialId: 'pla', type: 'purchase', quantity: 2, unitCost: 100, date: '2026-01-01', note: '', createdAt: '' })
    const old = { ...previous, schemaVersion: 3, materials: previous.materials.map(({ color: _color, ...material }) => material) }
    values.set('near-creation-3d:v3', JSON.stringify(old))
    const migrated = await new LocalStorageRepository().load()
    expect(migrated.schemaVersion).toBe(5)
    expect(migrated.materials[0].color).toBeNull()
    expect(migrated.materials[0].stockBaseline).toBeNull()
    expect(migrated.movements).toEqual(previous.movements)
    expect(values.has('near-creation-3d:v3')).toBe(true)
  })

  it('migra a versão 4 preservando a cor e o estoque calculado', async () => {
    const previous = emptyDatabase()
    previous.materials.push({ id: 'pla', name: 'PLA', kind: 'Filamento', unit: 'kg', minimum: 1, color: '#AABBCC', stockBaseline: null, createdAt: '' })
    const old = { ...previous, schemaVersion: 4, materials: previous.materials.map(({ stockBaseline: _stockBaseline, ...material }) => material) }
    values.set('near-creation-3d:v4', JSON.stringify(old))
    const migrated = await new LocalStorageRepository().load()
    expect(migrated.schemaVersion).toBe(5)
    expect(migrated.materials[0].color).toBe('#AABBCC')
    expect(migrated.materials[0].stockBaseline).toBeNull()
  })
})
