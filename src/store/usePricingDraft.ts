import { create } from 'zustand'
import type { SetStateAction } from 'react'
import { emptyDatabase, type Sheet } from '../lib/domain'
import { blankSheet } from '../lib/blankSheet'

type ProductDraft = { name: string; sku: string; category: string }
type PricingDraft = {
  sheet: Sheet
  productDraft: ProductDraft
  editingProduct: string
  setSheet: (sheet: SetStateAction<Sheet>) => void
  setProductDraft: (productDraft: ProductDraft) => void
  setEditingProduct: (editingProduct: string) => void
}

// Keep a quote draft when navigating between the catalogue and pricing.
export const usePricingDraft = create<PricingDraft>((set) => ({
  sheet: blankSheet(emptyDatabase()),
  productDraft: { name: '', sku: '', category: '' },
  editingProduct: '',
  setSheet: (update) =>
    set((state) => ({ sheet: typeof update === 'function' ? update(state.sheet) : update })),
  setProductDraft: (productDraft) => set({ productDraft }),
  setEditingProduct: (editingProduct) => set({ editingProduct }),
}))
