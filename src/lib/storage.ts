import { type Database, type Product, emptyDatabase } from './domain'

export interface DataRepository {
  load(): Promise<Database>
  save(database: Database): Promise<void>
}

const KEY = 'near-creation-3d:v5'
const PREVIOUS_KEY = 'near-creation-3d:v4'
const OLDER_KEY = 'near-creation-3d:v3'
const LEGACY_KEY = 'near-creation-3d:v2'
const OLDEST_KEY = 'near-creation-3d:v1'

type LegacySettings = {
  printerName: string
  printerPrice: number
  lifeHours: number
  usedHours: number
  maintenanceLifetime: number
  powerKw: number
  energyTariff: number
  channels: Database['settings']['channels']
}

function isDatabaseLike(data: unknown, version: number): data is Record<string, unknown> {
  return (
    !!data &&
    typeof data === 'object' &&
    'schemaVersion' in data &&
    data.schemaVersion === version &&
    'materials' in data &&
    Array.isArray(data.materials) &&
    'movements' in data &&
    Array.isArray(data.movements) &&
    'products' in data &&
    Array.isArray(data.products) &&
    'settings' in data &&
    !!data.settings &&
    typeof data.settings === 'object'
  )
}

function migrateStockBaseline(data: Record<string, unknown>): Database {
  return {
    ...(data as Omit<Database, 'schemaVersion' | 'materials'>),
    schemaVersion: 5,
    materials: (data.materials as Database['materials']).map((material) => ({
      ...material,
      color: material.color ?? null,
      stockBaseline: null,
    })),
  }
}

function migrateSingleFilament(data: Record<string, unknown>): Database {
  const products = (data.products as Product[]).map((product) => ({
    ...product,
    quotes: product.quotes.map((quote) => {
      const { filamentId, weightGrams, ...sheet } = quote.sheet as typeof quote.sheet & {
        filamentId: string
        weightGrams: number
      }
      return { ...quote, sheet: { ...sheet, filaments: [{ materialId: filamentId, weightGrams }] } }
    }),
  }))
  return migrateStockBaseline({
    schemaVersion: 3,
    materials: data.materials as Database['materials'],
    movements: data.movements as Database['movements'],
    products,
    settings: data.settings as Database['settings'],
  })
}

function migrateLegacy(data: Record<string, unknown>): Database {
  const settings = data.settings as LegacySettings
  if (!Array.isArray(settings.channels) || typeof settings.printerName !== 'string')
    throw new Error('Dados antigos incompletos.')
  const printer = {
    id: 'legacy-printer',
    name: settings.printerName || 'Bambu Lab A1',
    purchasePrice: settings.printerPrice,
    lifeHours: settings.lifeHours,
    usedHours: settings.usedHours,
    maintenanceLifetime: settings.maintenanceLifetime,
    powerKw: settings.powerKw,
  }
  const products = (data.products as Product[]).map((product) => ({
    ...product,
    quotes: product.quotes.map((quote) => ({
      ...quote,
      sheet: { ...quote.sheet, printerId: printer.id },
      assumptions: { ...quote.assumptions, printerName: printer.name },
    })),
  }))
  return migrateSingleFilament({
    schemaVersion: 2,
    materials: data.materials as Database['materials'],
    movements: data.movements as Database['movements'],
    products,
    settings: {
      printers: [printer],
      energyTariff: settings.energyTariff,
      channels: settings.channels,
    },
  })
}

export class LocalStorageRepository implements DataRepository {
  async load(): Promise<Database> {
    const current = window.localStorage.getItem(KEY)
    const previous = current ? null : window.localStorage.getItem(PREVIOUS_KEY)
    const older = current || previous ? null : window.localStorage.getItem(OLDER_KEY)
    const legacy = current || previous || older ? null : window.localStorage.getItem(LEGACY_KEY)
    const oldest =
      current || previous || older || legacy ? null : window.localStorage.getItem(OLDEST_KEY)
    if (!current && !previous && !older && !legacy && !oldest) return emptyDatabase()
    try {
      const data: unknown = JSON.parse(current || previous || older || legacy || oldest!)
      if (current) {
        if (
          !isDatabaseLike(data, 5) ||
          !Array.isArray((data.settings as Record<string, unknown>).printers)
        )
          throw new Error()
        return data as Database
      }
      if (previous) {
        if (!isDatabaseLike(data, 4)) throw new Error()
        return migrateStockBaseline(data)
      }
      if (older) {
        if (!isDatabaseLike(data, 3)) throw new Error()
        return migrateStockBaseline(data)
      }
      if (legacy) {
        if (!isDatabaseLike(data, 2)) throw new Error()
        return migrateSingleFilament(data)
      }
      if (!isDatabaseLike(data, 1)) throw new Error()
      return migrateLegacy(data)
    } catch {
      throw new Error('Os dados salvos não puderam ser lidos. Nenhuma informação foi substituída.')
    }
  }

  async save(database: Database): Promise<void> {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(database))
    } catch {
      throw new Error(
        'Não foi possível salvar neste navegador. Verifique o espaço disponível e as permissões de armazenamento.',
      )
    }
  }
}
