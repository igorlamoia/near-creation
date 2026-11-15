import { Database, emptyDatabase } from './domain'

export interface DataRepository {
  load(): Promise<Database>
  save(database: Database): Promise<void>
}

const KEY = 'near-creation-3d:v1'

export class LocalStorageRepository implements DataRepository {
  async load(): Promise<Database> {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyDatabase()
    try {
      const data: unknown = JSON.parse(raw)
      if (!data || typeof data !== 'object' || !('schemaVersion' in data) || data.schemaVersion !== 1 || !('materials' in data) || !Array.isArray(data.materials) || !('movements' in data) || !Array.isArray(data.movements) || !('products' in data) || !Array.isArray(data.products) || !('settings' in data)) throw new Error()
      return data as Database
    } catch {
      throw new Error('Os dados salvos não puderam ser lidos. Nenhuma informação foi substituída.')
    }
  }

  async save(database: Database): Promise<void> {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(database))
    } catch {
      throw new Error('Não foi possível salvar neste navegador. Verifique o espaço disponível e as permissões de armazenamento.')
    }
  }
}
