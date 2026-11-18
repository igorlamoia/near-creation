import { describe, expect, it } from 'vitest'
import { emptyDatabase, materialBalance, priceQuote, type Movement } from '../lib/domain'

const entry = (
  quantity: number,
  unitCost: number,
  type: Movement['type'] = 'purchase',
): Movement => ({
  id: `${quantity}-${unitCost}`,
  materialId: 'pla',
  type,
  quantity,
  unitCost,
  date: '2026-01-01',
  note: '',
  createdAt: '2026-01-01',
})

describe('materiais', () => {
  it('preserva as compras e calcula média ponderada após ajuste', () => {
    const movements = [entry(1, 100), entry(1, 120), entry(-0.5, 110, 'adjustment')]
    expect(materialBalance('pla', movements)).toEqual({ quantity: 1.5, value: 165, average: 110 })
    expect(movements[0].unitCost).toBe(100)
  })
  it('aceita saldo manual como novo ponto de partida e aplica apenas movimentos posteriores', () => {
    const old = entry(1, 100)
    const recent = { ...entry(2, 120), id: 'recent' }
    const baseline = { quantity: 5, unitCost: 80, includedMovementIds: [old.id] }
    expect(materialBalance('pla', [old, recent], baseline)).toEqual({
      quantity: 7,
      value: 640,
      average: 640 / 7,
    })
    expect(materialBalance('pla', [recent], baseline)).toEqual({
      quantity: 7,
      value: 640,
      average: 640 / 7,
    })
    expect(materialBalance('pla', [old], baseline)).toEqual({
      quantity: 5,
      value: 400,
      average: 80,
    })
  })
  it('recalcula entradas e saídas posteriores à edição quando uma movimentação muda ou é excluída', () => {
    const before = entry(10, 100)
    const purchase = { ...entry(2, 120), id: 'purchase-after' }
    const withdrawal = { ...entry(-1, 113.333, 'adjustment'), id: 'withdrawal-after' }
    const baseline = { quantity: 1, unitCost: 100, includedMovementIds: [before.id] }
    expect(materialBalance('pla', [before, purchase, withdrawal], baseline).average).toBeCloseTo(
      340 / 3,
    )
    const updated = { ...purchase, quantity: 1, unitCost: 80 }
    expect(materialBalance('pla', [before, updated, withdrawal], baseline)).toEqual({
      quantity: 1,
      value: 90,
      average: 90,
    })
    expect(materialBalance('pla', [before, withdrawal], baseline)).toEqual({
      quantity: 0,
      value: 0,
      average: 0,
    })
    expect(materialBalance('pla', [before], baseline)).toEqual({
      quantity: 1,
      value: 100,
      average: 100,
    })
  })
})

describe('precificação', () => {
  const db = emptyDatabase()
  db.materials.push({
    id: 'pla',
    name: 'PLA',
    kind: 'Filamento',
    unit: 'kg',
    minimum: 0,
    color: null,
    stockBaseline: null,
    createdAt: '',
  })
  db.materials.push({
    id: 'petg',
    name: 'PETG',
    kind: 'Filamento',
    unit: 'kg',
    minimum: 0,
    color: null,
    stockBaseline: null,
    createdAt: '',
  })
  db.movements.push(entry(1, 100))
  db.movements.push({ ...entry(1, 200), materialId: 'petg' })
  db.settings.printers.push({
    id: 'a1',
    name: 'Bambu Lab A1',
    purchasePrice: 3000,
    lifeHours: 3000,
    usedHours: 0,
    maintenanceLifetime: 300,
    powerKw: 0.1,
  })
  db.settings.printers.push({
    id: 'other',
    name: 'Outra impressora',
    purchasePrice: 6000,
    lifeHours: 3000,
    usedHours: 0,
    maintenanceLifetime: 0,
    powerKw: 0.2,
  })
  db.settings.energyTariff = 1
  db.settings.channels.push({ id: 'market', name: 'Market', fixedFee: 5, percentFee: 10 })
  const sheet = {
    printerId: 'a1',
    filaments: [{ materialId: 'pla', weightGrams: 100 }],
    lines: [],
    printHours: 1,
    labor: 0,
    batch: 2,
    channelId: 'market',
    mode: 'sale' as const,
    margin: 30,
  }
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
  it('aceita acréscimos de 100% e 500% sobre custo, sem confundir com margem sobre venda', () => {
    for (const margin of [100, 150, 500]) {
      const quote = priceQuote({ ...sheet, mode: 'cost', margin }, db)
      expect(quote.batchPrice).toBeCloseTo((22.4 * (1 + margin / 100) + 5) / 0.9)
      expect((quote.profit / quote.batchCost) * 100).toBeCloseTo(margin)
    }
    expect(() => priceQuote({ ...sheet, margin: 100 }, db)).toThrow('menor que 100%')
  })
  it('discrimina a taxa percentual e soma a taxa fixa uma vez por lote', () => {
    const quote = priceQuote(sheet, db)
    expect(quote.percentageFee).toBeCloseTo(quote.batchPrice * 0.1)
    expect(quote.totalFees).toBeCloseTo(quote.batchPrice * 0.1 + 5)
    expect(quote.batchPrice - quote.totalFees - quote.batchCost).toBeCloseTo(quote.profit)
    const direct = priceQuote({ ...sheet, channelId: 'direct' }, db)
    expect(direct.totalFees).toBe(0)
  })
  it('recalcula a margem líquida a partir do preço final digitado', () => {
    const quote = priceQuote({ ...sheet, salePrice: 30 }, db)
    expect(quote.unitPrice).toBe(30)
    expect(quote.batchPrice).toBe(60)
    expect(quote.totalFees).toBe(11)
    expect(quote.profit).toBeCloseTo(26.6)
    expect(quote.effectiveMargin).toBeCloseTo((26.6 / 60) * 100)
    const forward = priceQuote({ ...sheet, margin: quote.effectiveMargin }, db)
    expect(forward.unitPrice).toBeCloseTo(30)
  })
  it('recalcula acréscimo acima de 100% pelo preço final e permite voltar à fórmula', () => {
    const quote = priceQuote({ ...sheet, mode: 'cost', salePrice: 70 }, db)
    expect(quote.effectiveMargin).toBeGreaterThan(100)
    const forward = priceQuote({ ...sheet, mode: 'cost', margin: quote.effectiveMargin }, db)
    expect(forward.unitPrice).toBeCloseTo(70)
  })
  it('mantém o preço informado ao alterar custos, lote ou canal e recalcula a margem', () => {
    const original = priceQuote({ ...sheet, salePrice: 30 }, db)
    for (const changes of [{ labor: 10 }, { batch: 10 }, { channelId: 'direct' }]) {
      const changed = priceQuote({ ...sheet, ...changes, salePrice: 30 }, db)
      expect(changed.unitPrice).toBe(30)
      expect(changed.effectiveMargin).not.toBe(original.effectiveMargin)
    }
  })
  it('representa prejuízo sem trocar silenciosamente o preço informado', () => {
    const quote = priceQuote({ ...sheet, salePrice: 5 }, db)
    expect(quote.unitPrice).toBe(5)
    expect(quote.profit).toBeLessThan(0)
    expect(quote.effectiveMargin).toBeLessThan(0)
  })
  it('rejeita preços e percentuais não finitos', () => {
    for (const salePrice of [0, -1, NaN, Infinity])
      expect(() => priceQuote({ ...sheet, salePrice }, db)).toThrow('preço de venda')
    for (const margin of [NaN, Infinity, -1])
      expect(() => priceQuote({ ...sheet, margin }, db)).toThrow('margem válida')
  })
  it('rejeita margem e taxa que anulam o divisor', () => {
    expect(() => priceQuote({ ...sheet, margin: 90 }, db)).toThrow()
  })
  it('exige custo de aquisição para material utilizado', () => {
    expect(() => priceQuote(sheet, { ...db, movements: [] })).toThrow('Registre uma compra')
  })
  it('usa os custos da impressora selecionada', () => {
    const other = priceQuote({ ...sheet, printerId: 'other' }, db)
    expect(other.costs.printer).toBe(2)
    expect(other.costs.energy).toBe(0.2)
    expect(other.assumptions.printerName).toBe('Outra impressora')
    expect(() => priceQuote({ ...sheet, printerId: '' }, db)).toThrow('Selecione uma impressora')
  })
  it('exige quantidade do lote e margem preenchidas', () => {
    expect(() => priceQuote({ ...sheet, batch: null }, db)).toThrow('Informe um lote')
    expect(() => priceQuote({ ...sheet, margin: null }, db)).toThrow('Informe uma margem')
  })
  it('soma o custo de vários filamentos na mesma ficha', () => {
    const quote = priceQuote(
      { ...sheet, filaments: [...sheet.filaments, { materialId: 'petg', weightGrams: 50 }] },
      db,
    )
    expect(quote.costs.filament).toBeCloseTo(20)
    expect(quote.unitCost).toBeCloseTo(21.2)
    expect(quote.sourceCosts).toEqual(
      expect.arrayContaining([
        { materialId: 'pla', unitCost: 100 },
        { materialId: 'petg', unitCost: 200 },
      ]),
    )
  })
  it('exige ao menos um filamento válido com peso positivo', () => {
    expect(() => priceQuote({ ...sheet, filaments: [] }, db)).toThrow(
      'Adicione ao menos um filamento',
    )
    expect(() =>
      priceQuote({ ...sheet, filaments: [{ materialId: 'pla', weightGrams: 0 }] }, db),
    ).toThrow('peso maior que zero')
  })
})
