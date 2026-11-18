import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyDatabase } from '../lib/domain'
import { blankSheet } from '../lib/blankSheet'
import { useAppStore } from '../store/useAppStore'
import { usePricingDraft } from '../store/usePricingDraft'

const repository = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }))
vi.mock('../lib/storage', () => ({
  LocalStorageRepository: class {
    load = repository.load
    save = repository.save
  },
}))

beforeEach(() => {
  vi.resetAllMocks()
  useAppStore.setState({ db: emptyDatabase(), loading: true, loadError: '', notice: '' })
  usePricingDraft.setState({
    sheet: blankSheet(emptyDatabase()),
    productDraft: { name: '', sku: '', category: '' },
    editingProduct: '',
  })
})

describe('estado compartilhado das páginas', () => {
  it('inicia novas fichas com margem sobre venda de 30%', () => {
    expect(blankSheet(emptyDatabase())).toMatchObject({ mode: 'sale', margin: 30 })
  })
  it('inicializa a ficha com o canal salvo no navegador', async () => {
    const db = emptyDatabase()
    db.settings.channels = [{ id: 'loja', name: 'Loja', percentFee: 5, fixedFee: 1 }]
    repository.load.mockResolvedValue(db)
    await useAppStore.getState().initialize()
    expect(useAppStore.getState().loading).toBe(false)
    expect(usePricingDraft.getState().sheet.channelId).toBe('loja')
  })

  it('preserva a ficha e a identidade do produto ao trocar de página', () => {
    const catalogue = usePricingDraft.getState()
    catalogue.setEditingProduct('produto-1')
    catalogue.setProductDraft({ name: 'Chaveiro', sku: 'CHV-1', category: 'Acessórios' })
    catalogue.setSheet({ ...blankSheet(emptyDatabase()), batch: 10, margin: 30 })
    // Pricing reads the same draft even after the catalogue component unmounts.
    const pricing = usePricingDraft.getState()
    pricing.setSheet((previous) => ({ ...previous, printHours: 0.5 }))
    expect(usePricingDraft.getState()).toMatchObject({
      editingProduct: 'produto-1',
      productDraft: { name: 'Chaveiro', sku: 'CHV-1' },
      sheet: { batch: 10, margin: 30, printHours: 0.5 },
    })
  })

  it('mantém a tela e os dados atuais quando o armazenamento falha', async () => {
    const previous = useAppStore.getState().db
    repository.save.mockRejectedValue(new Error('Armazenamento cheio.'))
    const next = { ...previous, settings: { ...previous.settings, energyTariff: 1.5 } }
    expect(await useAppStore.getState().commit(next, 'Salvo.')).toBe(false)
    expect(useAppStore.getState().db).toBe(previous)
    expect(useAppStore.getState().loadError).toBe('')
    expect(useAppStore.getState().notice).toBe('Armazenamento cheio.')
  })

  it('atualiza os dados e o aviso somente depois de salvar', async () => {
    const next = emptyDatabase()
    repository.save.mockResolvedValue(undefined)
    expect(await useAppStore.getState().commit(next, 'Movimentação registrada.')).toBe(true)
    expect(repository.save).toHaveBeenCalledWith(next)
    expect(useAppStore.getState().db).toBe(next)
    expect(useAppStore.getState().notice).toBe('Movimentação registrada.')
  })
})
