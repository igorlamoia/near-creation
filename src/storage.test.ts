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
    database.settings.printerPrice = 4200
    await repository.save(database)
    expect(await repository.load()).toEqual(database)
  })

  it('preserva dados inválidos e informa erro de leitura', async () => {
    values.set('near-creation-3d:v1', '{invalid')
    await expect(new LocalStorageRepository().load()).rejects.toThrow('Nenhuma informação foi substituída')
    expect(values.get('near-creation-3d:v1')).toBe('{invalid')
  })
})
