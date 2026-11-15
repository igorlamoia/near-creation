export type Unit = 'kg' | 'un' | 'ml'
export type MaterialKind = 'Filamento' | 'Acessório' | 'Embalagem' | 'Outro'
export type StockBaseline = { quantity: number; unitCost: number; includedMovementIds: string[] }
export type Material = { id: string; name: string; kind: MaterialKind; unit: Unit; minimum: number; color: string | null; stockBaseline: StockBaseline | null; createdAt: string }
export type Movement = { id: string; materialId: string; type: 'purchase' | 'adjustment'; quantity: number; unitCost: number; date: string; note: string; createdAt: string }
export type Channel = { id: string; name: string; fixedFee: number; percentFee: number }
export type Printer = { id: string; name: string; purchasePrice: number; lifeHours: number; usedHours: number; maintenanceLifetime: number; powerKw: number }
export type Settings = { printers: Printer[]; energyTariff: number; channels: Channel[] }
export type FilamentLine = { materialId: string; weightGrams: number }
export type SheetLine = { materialId: string; quantity: number }
export type Sheet = { printerId: string; filaments: FilamentLine[]; lines: SheetLine[]; printHours: number; labor: number; batch: number | null; channelId: string; mode: 'cost' | 'sale'; margin: number | null }
export type Quote = { id: string; createdAt: string; sheet: Sheet; costs: CostBreakdown; unitCost: number; batchCost: number; batchPrice: number; unitPrice: number; profit: number; sourceCosts: { materialId: string; unitCost: number }[]; assumptions: { printerName: string; channelName: string; fixedFee: number; percentFee: number; printerHourlyCost: number; energyHourlyCost: number } }
export type Product = { id: string; name: string; sku: string; category: string; createdAt: string; quotes: Quote[] }
export type Database = { schemaVersion: 5; materials: Material[]; movements: Movement[]; settings: Settings; products: Product[] }
export type CostBreakdown = { filament: number; supplies: number; energy: number; printer: number; labor: number }

export const emptyDatabase = (): Database => ({
  schemaVersion: 5,
  materials: [], movements: [], products: [],
  settings: { printers: [], energyTariff: 0, channels: [{ id: 'direct', name: 'Venda direta', fixedFee: 0, percentFee: 0 }] },
})

export const id = () => crypto.randomUUID()
export const today = () => new Date().toISOString().slice(0, 10)
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
export const number = (value: number, digits = 2) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value)

export function materialBalance(materialId: string, movements: Movement[], baseline: StockBaseline | null = null) {
  let quantity = baseline?.quantity ?? 0
  let value = baseline ? baseline.quantity * baseline.unitCost : 0
  const included = new Set(baseline?.includedMovementIds ?? [])
  for (const movement of movements.filter(item => item.materialId === materialId && !included.has(item.id))) {
    const cost = movement.quantity < 0 ? (quantity > 0 ? value / quantity : movement.unitCost) : movement.unitCost
    quantity += movement.quantity
    value += movement.quantity * cost
  }
  if (Math.abs(quantity) < 1e-9) return { quantity: 0, value: 0, average: 0 }
  return { quantity, value, average: value / quantity }
}

export function priceQuote(sheet: Sheet, db: Database) {
  const batch = sheet.batch
  const margin = sheet.margin
  if (batch === null || !Number.isInteger(batch) || batch < 1) throw new Error('Informe um lote com pelo menos 1 unidade.')
  if (margin === null || margin < 0 || margin >= 100) throw new Error('Informe uma margem entre 0% e 99,99%.')
  if (sheet.printHours < 0 || sheet.labor < 0) throw new Error('Os custos e quantidades não podem ser negativos.')
  if (!sheet.filaments.length) throw new Error('Adicione ao menos um filamento à ficha técnica.')
  const printer = db.settings.printers.find(p => p.id === sheet.printerId)
  if (!printer) throw new Error('Selecione uma impressora cadastrada.')
  if (printer.lifeHours <= 0 || [printer.purchasePrice, printer.usedHours, printer.maintenanceLifetime, printer.powerKw].some(value => !Number.isFinite(value) || value < 0)) throw new Error('Confira os valores da impressora.')
  const channel = db.settings.channels.find(c => c.id === sheet.channelId)
  if (!channel) throw new Error('Selecione um canal de venda.')
  if (channel.percentFee < 0 || channel.percentFee >= 100 || channel.fixedFee < 0) throw new Error('Verifique as taxas do canal.')
  const denominator = 1 - channel.percentFee / 100 - (sheet.mode === 'sale' ? margin / 100 : 0)
  if (denominator <= 0) throw new Error('A soma da margem e da taxa percentual deve ser menor que 100%.')
  const sourceCosts = new Map<string, number>()
  const average = (materialId: string) => {
    const balance = materialBalance(materialId, db.movements, db.materials.find(material => material.id === materialId)?.stockBaseline)
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
  const filamentCost = sheet.filaments.reduce((sum, line) => {
    const material = db.materials.find(item => item.id === line.materialId)
    if (!material || material.unit !== 'kg' || material.kind !== 'Filamento') throw new Error('Selecione filamentos cadastrados em kg.')
    if (!Number.isFinite(line.weightGrams) || line.weightGrams <= 0) throw new Error('Informe um peso maior que zero para cada filamento.')
    return sum + line.weightGrams / 1000 * average(material.id)
  }, 0)
  const costs: CostBreakdown = {
    filament: filamentCost,
    supplies,
    energy: printer.powerKw * sheet.printHours * db.settings.energyTariff,
    printer: sheet.printHours * ((printer.purchasePrice + printer.maintenanceLifetime) / printer.lifeHours),
    labor: sheet.labor,
  }
  if (Object.values(costs).some(v => !Number.isFinite(v) || v < 0)) throw new Error('Confira os valores nas configurações.')
  const unitCost = Object.values(costs).reduce((a, b) => a + b, 0)
  const batchCost = unitCost * batch
  const batchPrice = sheet.mode === 'sale'
    ? (batchCost + channel.fixedFee) / denominator
    : (batchCost * (1 + margin / 100) + channel.fixedFee) / denominator
  const unitPrice = batchPrice / batch
  const profit = batchPrice * (1 - channel.percentFee / 100) - channel.fixedFee - batchCost
  const assumptions = { printerName: printer.name, channelName: channel.name, fixedFee: channel.fixedFee, percentFee: channel.percentFee, printerHourlyCost: (printer.purchasePrice + printer.maintenanceLifetime) / printer.lifeHours, energyHourlyCost: printer.powerKw * db.settings.energyTariff }
  return { costs, unitCost, batchCost, batchPrice, unitPrice, profit, sourceCosts: [...sourceCosts].map(([materialId, unitCost]) => ({ materialId, unitCost })), assumptions }
}
