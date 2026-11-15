export type Unit = 'kg' | 'un' | 'ml'
export type MaterialKind = 'Filamento' | 'Acessório' | 'Embalagem' | 'Outro'
export type Material = { id: string; name: string; kind: MaterialKind; unit: Unit; minimum: number; createdAt: string }
export type Movement = { id: string; materialId: string; type: 'purchase' | 'adjustment'; quantity: number; unitCost: number; date: string; note: string; createdAt: string }
export type Channel = { id: string; name: string; fixedFee: number; percentFee: number }
export type Settings = { printerName: string; printerPrice: number; lifeHours: number; usedHours: number; maintenanceLifetime: number; powerKw: number; energyTariff: number; channels: Channel[] }
export type SheetLine = { materialId: string; quantity: number }
export type Sheet = { filamentId: string; weightGrams: number; lines: SheetLine[]; printHours: number; labor: number; batch: number; channelId: string; mode: 'cost' | 'sale'; margin: number }
export type Quote = { id: string; createdAt: string; sheet: Sheet; costs: CostBreakdown; unitCost: number; batchCost: number; batchPrice: number; unitPrice: number; profit: number; sourceCosts: { materialId: string; unitCost: number }[]; assumptions: { channelName: string; fixedFee: number; percentFee: number; printerHourlyCost: number; energyHourlyCost: number } }
export type Product = { id: string; name: string; sku: string; category: string; createdAt: string; quotes: Quote[] }
export type Database = { schemaVersion: 1; materials: Material[]; movements: Movement[]; settings: Settings; products: Product[] }
export type CostBreakdown = { filament: number; supplies: number; energy: number; printer: number; labor: number }

export const emptyDatabase = (): Database => ({
  schemaVersion: 1,
  materials: [], movements: [], products: [],
  settings: { printerName: 'Bambu Lab A1', printerPrice: 0, lifeHours: 3000, usedHours: 0, maintenanceLifetime: 0, powerKw: 0, energyTariff: 0, channels: [{ id: 'direct', name: 'Venda direta', fixedFee: 0, percentFee: 0 }] },
})

export const id = () => crypto.randomUUID()
export const today = () => new Date().toISOString().slice(0, 10)
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const number = (value: number, digits = 2) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value)

export function materialBalance(materialId: string, movements: Movement[]) {
  let quantity = 0
  let value = 0
  for (const movement of movements.filter(item => item.materialId === materialId)) {
    quantity += movement.quantity
    value += movement.quantity * movement.unitCost
  }
  if (Math.abs(quantity) < 1e-9) return { quantity: 0, value: 0, average: 0 }
  return { quantity, value, average: value / quantity }
}

export function priceQuote(sheet: Sheet, db: Database) {
  if (!Number.isInteger(sheet.batch) || sheet.batch < 1) throw new Error('Informe um lote com pelo menos 1 unidade.')
  if (sheet.margin < 0 || sheet.margin >= 100) throw new Error('A margem deve estar entre 0% e 99,99%.')
  if (sheet.weightGrams < 0 || sheet.printHours < 0 || sheet.labor < 0) throw new Error('Os custos e quantidades não podem ser negativos.')
  const filament = db.materials.find(m => m.id === sheet.filamentId)
  if (!filament || filament.unit !== 'kg' || filament.kind !== 'Filamento') throw new Error('Selecione um filamento cadastrado em kg.')
  const channel = db.settings.channels.find(c => c.id === sheet.channelId)
  if (!channel) throw new Error('Selecione um canal de venda.')
  if (channel.percentFee < 0 || channel.percentFee >= 100 || channel.fixedFee < 0) throw new Error('Verifique as taxas do canal.')
  const denominator = 1 - channel.percentFee / 100 - (sheet.mode === 'sale' ? sheet.margin / 100 : 0)
  if (denominator <= 0) throw new Error('A soma da margem e da taxa percentual deve ser menor que 100%.')
  const sourceCosts = new Map<string, number>()
  const average = (materialId: string) => {
    const balance = materialBalance(materialId, db.movements)
    if (balance.quantity <= 0) throw new Error('Registre uma compra dos materiais usados antes de precificar.')
    const cost = balance.average
    sourceCosts.set(materialId, cost)
    return cost
  }
  const supplies = sheet.lines.reduce((sum, line) => {
    const material = db.materials.find(m => m.id === line.materialId)
    if (!material || line.quantity < 0 || !Number.isFinite(line.quantity)) throw new Error('Verifique os insumos da ficha técnica.')
    return sum + line.quantity * average(line.materialId)
  }, 0)
  const costs: CostBreakdown = {
    filament: sheet.weightGrams / 1000 * average(filament.id),
    supplies,
    energy: db.settings.powerKw * sheet.printHours * db.settings.energyTariff,
    printer: sheet.printHours * ((db.settings.printerPrice + db.settings.maintenanceLifetime) / db.settings.lifeHours),
    labor: sheet.labor,
  }
  if (db.settings.lifeHours <= 0 || Object.values(costs).some(v => !Number.isFinite(v) || v < 0)) throw new Error('Confira os valores nas configurações.')
  const unitCost = Object.values(costs).reduce((a, b) => a + b, 0)
  const batchCost = unitCost * sheet.batch
  const batchPrice = sheet.mode === 'sale'
    ? (batchCost + channel.fixedFee) / denominator
    : (batchCost * (1 + sheet.margin / 100) + channel.fixedFee) / denominator
  const unitPrice = batchPrice / sheet.batch
  const profit = batchPrice * (1 - channel.percentFee / 100) - channel.fixedFee - batchCost
  const assumptions = { channelName: channel.name, fixedFee: channel.fixedFee, percentFee: channel.percentFee, printerHourlyCost: (db.settings.printerPrice + db.settings.maintenanceLifetime) / db.settings.lifeHours, energyHourlyCost: db.settings.powerKw * db.settings.energyTariff }
  return { costs, unitCost, batchCost, batchPrice, unitPrice, profit, sourceCosts: [...sourceCosts].map(([materialId, unitCost]) => ({ materialId, unitCost })), assumptions }
}
