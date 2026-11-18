import { useState, type FormEvent } from 'react'
import { Calculator, Plus, Save, X } from 'lucide-react'
import { type Product, id, money, number, priceQuote } from '../lib/domain'
import FilamentFields from '../components/FilamentFields'
import Modal from '../components/Modal'
import IconAction from '../components/IconAction'
import DecimalInput from '../components/DecimalInput'
import Field from '../components/Field'
import SectionHeading from '../components/SectionHeading'
import { blankSheet } from '../lib/blankSheet'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from '@tanstack/react-router'
import { usePricingDraft } from '../store/usePricingDraft'

export default function Pricing() {
  const { db, commit, setNotice: flash } = useAppStore()
  const navigate = useNavigate()
  const go = (target: 'dashboard' | 'materials' | 'pricing' | 'products' | 'settings') => {
    void navigate({ to: target === 'dashboard' ? '/' : `/${target}` })
    window.scrollTo(0, 0)
  }
  const { sheet, setSheet, productDraft, setProductDraft, editingProduct, setEditingProduct } =
    usePricingDraft()
  const [pricingSaveOpen, setPricingSaveOpen] = useState(false)
  let calculated: ReturnType<typeof priceQuote> | null = null
  let calcError = ''
  try {
    calculated = priceQuote(sheet, db)
  } catch (error) {
    calcError = (error as Error).message
  }
  function openPricingSave(event: FormEvent) {
    event.preventDefault()
    if (!calculated) return flash(calcError)
    setPricingSaveOpen(true)
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (!calculated) return flash(calcError)
    const name = productDraft.name.trim(),
      sku = productDraft.sku.trim()
    if (!name || !sku) return flash('Informe nome e SKU do produto.')
    if (
      db.products.some((p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== editingProduct)
    )
      return flash('Já existe um produto com este SKU.')
    const quote = {
      id: id(),
      createdAt: new Date().toISOString(),
      sheet: structuredClone(sheet),
      ...calculated,
    }
    let products: Product[]
    if (editingProduct)
      products = db.products.map((p) =>
        p.id === editingProduct
          ? {
              ...p,
              name,
              sku,
              category: productDraft.category.trim(),
              quotes: [...p.quotes, quote],
            }
          : p,
      )
    else
      products = [
        ...db.products,
        {
          id: id(),
          name,
          sku,
          category: productDraft.category.trim(),
          createdAt: new Date().toISOString(),
          quotes: [quote],
        },
      ]
    if (
      await commit(
        { ...db, products },
        editingProduct ? 'Nova versão da ficha salva.' : 'Produto e ficha técnica salvos.',
      )
    ) {
      setPricingSaveOpen(false)
      setEditingProduct('')
      setProductDraft({ name: '', sku: '', category: '' })
      setSheet(blankSheet(db))
      go('products')
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">CUSTO & VALOR</span>
          <h1>{editingProduct ? 'Recalcular produto' : 'Precificação'}</h1>
          <p>Monte a ficha técnica e encontre um preço que respeita seus custos.</p>
        </div>
        {editingProduct && (
          <button
            className="button button-outline"
            onClick={() => {
              setEditingProduct('')
              setProductDraft({ name: '', sku: '', category: '' })
              setSheet(blankSheet(db))
            }}
          >
            <X aria-hidden="true" /> Cancelar edição
          </button>
        )}
      </div>
      <form onSubmit={openPricingSave} className="pricing-grid">
        <div className="pricing-forms">
          <section className="panel">
            <SectionHeading eyebrow="01 / FABRICAÇÃO" title="Ficha técnica" />
            <div className="form-grid">
              <Field label="Impressora">
                <select
                  value={sheet.printerId}
                  onChange={(e) => setSheet({ ...sheet, printerId: e.target.value })}
                  required
                >
                  <option value="">Selecione uma impressora</option>
                  {db.settings.printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name} ·{' '}
                      {money(
                        (printer.purchasePrice + printer.maintenanceLifetime) / printer.lifeHours,
                      )}
                      /h
                    </option>
                  ))}
                </select>
              </Field>
              <FilamentFields db={db} sheet={sheet} setSheet={setSheet} />
              <div className="form-row">
                <Field label="Tempo por unidade (horas)">
                  <DecimalInput
                    min="0"
                    step="any"
                    value={sheet.printHours}
                    placeholder="Ex.: 2"
                    onValueChange={(value) =>
                      setSheet({
                        ...sheet,
                        printHours: value ?? 0,
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Mão de obra por unidade (R$)">
                  <DecimalInput
                    min="0"
                    step="any"
                    value={sheet.labor}
                    placeholder="Opcional"
                    onValueChange={(value) =>
                      setSheet({
                        ...sheet,
                        labor: value ?? 0,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="subsection-title">
                <strong>Acessórios e embalagem</strong>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setSheet({
                      ...sheet,
                      lines: [...sheet.lines, { materialId: '', quantity: 0 }],
                    })
                  }
                >
                  <Plus size={16} aria-hidden="true" /> Adicionar insumo
                </button>
              </div>
              {sheet.lines.map((line, index) => (
                <div className="supply-row" key={index}>
                  <select
                    value={line.materialId}
                    onChange={(e) =>
                      setSheet({
                        ...sheet,
                        lines: sheet.lines.map((item, i) =>
                          i === index ? { ...item, materialId: e.target.value } : item,
                        ),
                      })
                    }
                    required
                  >
                    <option value="">Selecione um insumo</option>
                    {db.materials
                      .filter((m) => m.kind !== 'Filamento')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                  </select>
                  <DecimalInput
                    aria-label="Quantidade por unidade"
                    min="0"
                    step="any"
                    value={line.quantity}
                    onValueChange={(value) =>
                      setSheet({
                        ...sheet,
                        lines: sheet.lines.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                quantity: value ?? 0,
                              }
                            : item,
                        ),
                      })
                    }
                    placeholder="Qtd./un."
                    required
                  />
                  <IconAction
                    icon={X}
                    tone="pink"
                    label="Remover insumo"
                    onClick={() =>
                      setSheet({
                        ...sheet,
                        lines: sheet.lines.filter((_, i) => i !== index),
                      })
                    }
                  />
                </div>
              ))}
              {!sheet.lines.length && (
                <p className="field-hint">
                  Adicione elos, embalagens ou outros insumos se necessário.
                </p>
              )}
            </div>
          </section>
          <section className="panel">
            <SectionHeading eyebrow="02 / PREÇO" title="Margem e canal" />
            <div className="form-grid">
              <div className="form-row">
                <Field label="Quantidade no lote">
                  <DecimalInput
                    min="1"
                    step="1"
                    value={sheet.batch}
                    placeholder="Ex.: 10"
                    emptyValue={null}
                    onValueChange={(value) =>
                      setSheet({
                        ...sheet,
                        batch: value,
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Canal de venda">
                  <select
                    value={sheet.channelId}
                    onChange={(e) => setSheet({ ...sheet, channelId: e.target.value })}
                    required
                  >
                    {db.settings.channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="segmented">
                <button
                  type="button"
                  className={sheet.mode === 'cost' ? 'selected' : ''}
                  onClick={() => setSheet({ ...sheet, mode: 'cost' })}
                >
                  Acréscimo sobre custo
                </button>
                <button
                  type="button"
                  className={sheet.mode === 'sale' ? 'selected' : ''}
                  onClick={() => setSheet({ ...sheet, mode: 'sale' })}
                >
                  Margem sobre venda
                </button>
              </div>
              <Field
                label={sheet.mode === 'cost' ? 'Acréscimo desejado (%)' : 'Margem desejada (%)'}
              >
                <DecimalInput
                  min="0"
                  max="99.99"
                  step="any"
                  value={sheet.margin}
                  placeholder="Ex.: 30"
                  emptyValue={null}
                  onValueChange={(value) =>
                    setSheet({
                      ...sheet,
                      margin: value,
                    })
                  }
                  required
                />
              </Field>
            </div>
          </section>
        </div>
        <aside className="result-panel">
          <span className="eyebrow">RESULTADO EM TEMPO REAL</span>
          <h2>Seu preço sugerido</h2>
          {calculated ? (
            <>
              <div className="price-highlight">
                <small>POR UNIDADE</small>
                <strong>{money(calculated.unitPrice)}</strong>
                <span>
                  Lote de {sheet.batch} unidades: {money(calculated.batchPrice)}
                </span>
              </div>
              <p className="selected-printer">Impressora: {calculated.assumptions.printerName}</p>
              <div className="result-section">
                <h3>
                  Composição do custo <span>por unidade</span>
                </h3>
                {[
                  ['Filamentos', calculated.costs.filament],
                  ['Insumos', calculated.costs.supplies],
                  ['Energia', calculated.costs.energy],
                  ['Impressora e manutenção', calculated.costs.printer],
                  ['Mão de obra', calculated.costs.labor],
                ].map(([label, value]) => (
                  <div className="result-line" key={label}>
                    <span>{label}</span>
                    <strong>{money(value as number)}</strong>
                  </div>
                ))}
                <div className="result-line total">
                  <span>Custo unitário</span>
                  <strong>{money(calculated.unitCost)}</strong>
                </div>
              </div>
              <div className="result-section">
                <h3>Resultado do lote</h3>
                <div className="result-line">
                  <span>Custo de fabricação</span>
                  <strong>{money(calculated.batchCost)}</strong>
                </div>
                <div className="result-line">
                  <span>Lucro estimado após taxas</span>
                  <strong>{money(calculated.profit)}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="result-placeholder">
              <Calculator size={24} aria-hidden="true" />
              <p>{calcError}</p>
            </div>
          )}
          <button className="button button-lime" type="submit" disabled={!calculated}>
            {editingProduct ? 'Salvar nova versão' : 'Salvar produto e ficha'}{' '}
            <Save aria-hidden="true" />
          </button>
          <p className="result-note">
            O custo desta ficha será preservado. Para atualizar preços, recalcule o produto depois.
          </p>
        </aside>
      </form>
      {pricingSaveOpen && calculated && (
        <Modal
          title={editingProduct ? 'Salvar nova versão' : 'Salvar produto e ficha'}
          eyebrow="REVISÃO DA PRECIFICAÇÃO"
          onClose={() => setPricingSaveOpen(false)}
        >
          <div className="pricing-save-summary">
            <div>
              <span>Preço por unidade</span>
              <strong>{money(calculated.unitPrice)}</strong>
            </div>
            <div>
              <span>Custo por unidade</span>
              <strong>{money(calculated.unitCost)}</strong>
            </div>
            <div>
              <span>Lote de {sheet.batch} unidades</span>
              <strong>{money(calculated.batchPrice)}</strong>
            </div>
            <p>
              {calculated.assumptions.printerName} · {calculated.assumptions.channelName} ·{' '}
              {sheet.mode === 'cost' ? 'Acréscimo' : 'Margem'} de {number(sheet.margin ?? 0)}%
            </p>
          </div>
          <form className="form-grid pricing-save-form" onSubmit={saveProduct}>
            <div className="form-row">
              <Field label="Nome do produto">
                <input
                  value={productDraft.name}
                  onChange={(event) =>
                    setProductDraft({
                      ...productDraft,
                      name: event.target.value,
                    })
                  }
                  placeholder="Ex.: Chaveiro personalizado"
                  required
                />
              </Field>
              <Field label="SKU">
                <input
                  value={productDraft.sku}
                  onChange={(event) =>
                    setProductDraft({
                      ...productDraft,
                      sku: event.target.value,
                    })
                  }
                  placeholder="Ex.: CHV-001"
                  required
                />
              </Field>
            </div>
            <Field label="Categoria (opcional)">
              <input
                value={productDraft.category}
                onChange={(event) =>
                  setProductDraft({
                    ...productDraft,
                    category: event.target.value,
                  })
                }
                placeholder="Ex.: Chaveiros"
              />
            </Field>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setPricingSaveOpen(false)}
              >
                Voltar
              </button>
              <button type="submit" className="button button-primary">
                <Save aria-hidden="true" /> Confirmar salvamento
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
