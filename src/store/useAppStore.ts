import { create } from 'zustand'
import { emptyDatabase, type Database } from '../lib/domain'
import { LocalStorageRepository } from '../lib/storage'
import { blankSheet } from '../lib/blankSheet'
import { usePricingDraft } from './usePricingDraft'

type AppStore = {
  db: Database
  loading: boolean
  loadError: string
  notice: string
  initialize: () => Promise<void>
  commit: (next: Database, message: string) => Promise<boolean>
  setNotice: (notice: string) => void
}

const repository = new LocalStorageRepository()

export const useAppStore = create<AppStore>((set) => ({
  db: emptyDatabase(),
  loading: true,
  loadError: '',
  notice: '',
  initialize: async () => {
    try {
      const db = await repository.load()
      usePricingDraft.getState().setSheet(blankSheet(db))
      set({ db, loading: false, loadError: '' })
    } catch (error) {
      set({
        loading: false,
        loadError: error instanceof Error ? error.message : 'Não foi possível carregar os dados.',
      })
    }
  },
  commit: async (next, message) => {
    try {
      await repository.save(next)
      set({ db: next, notice: message })
      return true
    } catch (error) {
      set({
        notice: error instanceof Error ? error.message : 'Não foi possível salvar os dados.',
      })
      return false
    }
  },
  setNotice: (notice) => set({ notice }),
}))
