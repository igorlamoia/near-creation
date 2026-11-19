import { SegmentedControl } from '../components/ui/segmented-control'
import { Fragment, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  type Material,
  type MaterialKind,
  type Movement,
  id,
  materialBalance,
  money,
  number,
  today,
} from '../lib/domain'
import MaterialColorInput, { MaterialColor } from '../components/MaterialColorInput'
import { normalizeMaterialColor } from '../lib/materialColor'
import Modal from '../components/Modal'
import IconAction from '../components/IconAction'
import DecimalInput from '../components/DecimalInput'
import Field from '../components/Field'
import Empty from '../components/Empty'
import SectionHeading from '../components/SectionHeading'
import { useAppStore } from '../store/useAppStore'

const categories: {
  kind: MaterialKind
  title: string
  singular: string
  unit: Material['unit']
}[] = [
  { kind: 'Filamento', title: 'Filamentos', singular: 'filamento', unit: 'kg' },
  { kind: 'Embalagem', title: 'Embalagens', singular: 'embalagem', unit: 'un' },
  { kind: 'Acessório', title: 'Acessórios', singular: 'acessório', unit: 'un' },
  { kind: 'Outro', title: 'Outros', singular: 'outro insumo', unit: 'un' },
]

export default function Materials() {
  const { db, commit, setNotice: flash } = useAppStore()
  const [activeKind, setActiveKind] = useState<MaterialKind>('Filamento')
  const activeCategory = categories.find((category) => category.kind === activeKind)!
  const [materialForm, setMaterialForm] = useState({
    name: '',
    kind: 'Filamento' as MaterialKind,
    unit: 'kg' as Material['unit'],
    minimum: 0,
    quantity: 0,
    unitCost: 0,
  })
  const [newMaterialColor, setNewMaterialColor] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [materialModal, setMaterialModal] = useState<'material' | 'movement' | null>(null)
  const [editingMaterialId, setEditingMaterialId] = useState('')
  const [editingMovementId, setEditingMovementId] = useState('')
  const [deleteMovementId, setDeleteMovementId] = useState('')
  const [purchase, setPurchase] = useState({
    quantity: 0,
    unitCost: 0,
    date: today(),
    note: '',
  })
  const [adjustment, setAdjustment] = useState({
    quantity: 0,
    date: today(),
    note: '',
  })
  const [materialTab, setMaterialTab] = useState<'purchase' | 'adjustment'>('purchase')
  const materialSummary = db.materials.map((material) => ({
    material,
    balance: materialBalance(material.id, db.movements, material.stockBaseline),
  }))
  const selected = db.materials.find((m) => m.id === selectedMaterial)
  const selectedBalance = selected
    ? materialBalance(selected.id, db.movements, selected.stockBaseline)
    : null
  function openAddMaterial(kind: MaterialKind) {
    const category = categories.find((item) => item.kind === kind)!
    setActiveKind(kind)
    setEditingMaterialId('')
    setMaterialForm({
      name: '',
      kind,
      unit: category.unit,
      minimum: 0,
      quantity: 0,
      unitCost: 0,
    })
    setNewMaterialColor('')
    setMaterialModal('material')
  }
  function openEditMaterial(material: Material) {
    setActiveKind(material.kind)
    const balance = materialBalance(material.id, db.movements, material.stockBaseline)
    const currentCost =
      balance.quantity === 0 ? (material.stockBaseline?.unitCost ?? 0) : balance.average
    setEditingMaterialId(material.id)
    setMaterialForm({
      name: material.name,
      kind: material.kind,
      unit: material.unit,
      minimum: material.minimum,
      quantity: balance.quantity,
      unitCost: currentCost,
    })
    setNewMaterialColor(material.color || '')
    setMaterialModal('material')
  }
  function openMovement(kind: MaterialKind, materialId?: string) {
    setActiveKind(kind)
    setEditingMovementId('')
    setSelectedMaterial(materialId || db.materials.find((item) => item.kind === kind)?.id || '')
    setMaterialTab('purchase')
    setPurchase({ quantity: 0, unitCost: 0, date: today(), note: '' })
    setAdjustment({ quantity: 0, date: today(), note: '' })
    setMaterialModal('movement')
  }
  function openEditMovement(movement: Movement) {
    setActiveKind(db.materials.find((item) => item.id === movement.materialId)!.kind)
    setEditingMovementId(movement.id)
    setSelectedMaterial(movement.materialId)
    setMaterialTab(movement.type)
    if (movement.type === 'purchase')
      setPurchase({
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        date: movement.date,
        note: movement.note,
      })
    else
      setAdjustment({
        quantity: Math.abs(movement.quantity),
        date: movement.date,
        note: movement.note,
      })
    setMaterialModal('movement')
  }
  async function saveMaterial(event: FormEvent) {
    event.preventDefault()
    const name = materialForm.name.trim()
    if (!name) return flash('Informe o nome do material.')
    if (
      [materialForm.minimum, materialForm.quantity, materialForm.unitCost].some(
        (value) => !Number.isFinite(value) || value < 0,
      )
    )
      return flash('Estoque mínimo, saldo e custo devem ser valores válidos não negativos.')
    if (materialForm.kind === 'Filamento' && materialForm.unit !== 'kg')
      return flash('Filamentos devem ser cadastrados em kg.')
    const color = normalizeMaterialColor(newMaterialColor)
    if (newMaterialColor.trim() && !color) return flash('Informe uma cor HEX ou RGB válida.')
    const existing = db.materials.find((material) => material.id === editingMaterialId)
    if (existing) {
      const usedInQuotes = db.products.some((product) =>
        product.quotes.some(
          (quote) =>
            quote.sheet.filaments.some((line) => line.materialId === existing.id) ||
            quote.sheet.lines.some((line) => line.materialId === existing.id),
        ),
      )
      if (
        (usedInQuotes || db.movements.some((movement) => movement.materialId === existing.id)) &&
        (materialForm.kind !== existing.kind || materialForm.unit !== existing.unit)
      )
        return flash('Tipo e unidade não podem mudar após movimentações ou uso em fichas.')
      const balance = materialBalance(existing.id, db.movements, existing.stockBaseline)
      const currentCost =
        balance.quantity === 0 ? (existing.stockBaseline?.unitCost ?? 0) : balance.average
      const stockChanged =
        Math.abs(materialForm.quantity - balance.quantity) > 1e-9 ||
        Math.abs(materialForm.unitCost - currentCost) > 1e-9
      const updated: Material = {
        ...existing,
        name,
        kind: materialForm.kind,
        unit: materialForm.unit,
        minimum: materialForm.minimum,
        color,
        stockBaseline: stockChanged
          ? {
              quantity: materialForm.quantity,
              unitCost: materialForm.unitCost,
              includedMovementIds: db.movements
                .filter((movement) => movement.materialId === existing.id)
                .map((movement) => movement.id),
            }
          : existing.stockBaseline,
      }
      if (
        await commit(
          {
            ...db,
            materials: db.materials.map((material) =>
              material.id === existing.id ? updated : material,
            ),
          },
          'Material e inventário atualizados.',
        )
      )
        setMaterialModal(null)
      return
    }
    const newMaterial: Material = {
      id: id(),
      name,
      kind: materialForm.kind,
      unit: materialForm.unit,
      minimum: materialForm.minimum,
      color,
      stockBaseline:
        materialForm.quantity > 0 || materialForm.unitCost > 0
          ? {
              quantity: materialForm.quantity,
              unitCost: materialForm.unitCost,
              includedMovementIds: [],
            }
          : null,
      createdAt: new Date().toISOString(),
    }
    if (
      await commit(
        { ...db, materials: [...db.materials, newMaterial] },
        'Material cadastrado com sucesso.',
      )
    ) {
      setSelectedMaterial(newMaterial.id)
      setMaterialModal(null)
    }
  }
  async function addMovement(event: FormEvent) {
    event.preventDefault()
    if (!selected) return flash('Selecione um material.')
    const existing = db.movements.find((movement) => movement.id === editingMovementId)
    const saveMovement = async (movement: Movement, message: string) => {
      const movements = existing
        ? db.movements.map((item) => (item.id === existing.id ? movement : item))
        : [...db.movements, movement]
      const material = db.materials.find((item) => item.id === movement.materialId)
      if (
        material &&
        materialBalance(material.id, movements, material.stockBaseline).quantity < -1e-9
      )
        return flash(
          'A movimentação deixaria o estoque negativo. Ajuste a quantidade ou edite o saldo diretamente.',
        )
      if (await commit({ ...db, movements }, message)) {
        setEditingMovementId('')
        setMaterialModal(null)
      }
    }
    if (materialTab === 'purchase') {
      if (
        !Number.isFinite(purchase.quantity) ||
        !Number.isFinite(purchase.unitCost) ||
        purchase.quantity <= 0 ||
        purchase.unitCost < 0 ||
        !purchase.date
      )
        return flash('Informe quantidade, preço e data válidos.')
      const movement: Movement = {
        id: existing?.id ?? id(),
        materialId: selected.id,
        type: 'purchase' as const,
        quantity: purchase.quantity,
        unitCost: purchase.unitCost,
        date: purchase.date,
        note: purchase.note.trim(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      await saveMovement(
        movement,
        existing ? 'Movimentação atualizada.' : 'Entrada registrada. O custo médio foi atualizado.',
      )
    } else {
      const available = existing
        ? materialBalance(
            selected.id,
            db.movements.filter((movement) => movement.id !== existing.id),
            selected.stockBaseline,
          ).quantity
        : selectedBalance?.quantity || 0
      if (
        !Number.isFinite(adjustment.quantity) ||
        adjustment.quantity <= 0 ||
        (existing &&
          !selected.stockBaseline?.includedMovementIds.includes(existing.id) &&
          adjustment.quantity > available) ||
        (!existing && adjustment.quantity > available) ||
        !adjustment.date ||
        !adjustment.note.trim()
      )
        return flash('Informe uma saída válida e o motivo do ajuste.')
      const movement: Movement = {
        id: existing?.id ?? id(),
        materialId: selected.id,
        type: 'adjustment' as const,
        quantity: -adjustment.quantity,
        unitCost: selectedBalance!.average,
        date: adjustment.date,
        note: adjustment.note.trim(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      await saveMovement(
        movement,
        existing ? 'Movimentação atualizada.' : 'Ajuste de estoque registrado.',
      )
    }
  }
  async function deleteMovement() {
    if (!deleteMovementId) return
    if (
      await commit(
        {
          ...db,
          movements: db.movements.filter((movement) => movement.id !== deleteMovementId),
        },
        'Movimentação excluída.',
      )
    )
      setDeleteMovementId('')
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">INVENTÁRIO</span>
          <h1>Materiais e insumos</h1>
          <p>Registre entradas, acompanhe saldos e preserve o histórico de preços.</p>
        </div>
      </div>
      {materialModal === 'material' && (
        <Modal
          key={`material-${activeKind}`}
          title={`${editingMaterialId ? 'Editar' : 'Adicionar'} ${activeCategory.singular}`}
          eyebrow={activeCategory.title.toUpperCase()}
          onClose={() => setMaterialModal(null)}
        >
          <section className="panel">
            <SectionHeading
              eyebrow={editingMaterialId ? 'ALTERAR CADASTRO' : 'NOVO CADASTRO'}
              title={`Dados de ${activeCategory.title.toLowerCase()}`}
            />
            <form onSubmit={saveMaterial} className="form-grid">
              <Field label="Nome do material">
                <input
                  value={materialForm.name}
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      name: e.target.value,
                    })
                  }
                  placeholder={
                    activeKind === 'Filamento'
                      ? 'Ex.: PLA Branco'
                      : activeKind === 'Embalagem'
                        ? 'Ex.: Caixa de envio'
                        : activeKind === 'Acessório'
                          ? 'Ex.: Argola de chaveiro'
                          : 'Ex.: Cola'
                  }
                  required
                />
              </Field>
              <div className="form-row">
                <Field label="Tipo">
                  <input value={materialForm.kind} readOnly />
                </Field>
                <Field label="Unidade">
                  <select
                    value={materialForm.unit}
                    disabled={materialForm.kind === 'Filamento'}
                    onChange={(e) =>
                      setMaterialForm({
                        ...materialForm,
                        unit: e.target.value as Material['unit'],
                      })
                    }
                  >
                    <option value="kg">kg</option>
                    <option value="un">unidade</option>
                    <option value="ml">ml</option>
                  </select>
                </Field>
              </div>
              <Field label="Estoque mínimo">
                <DecimalInput
                  min="0"
                  step="any"
                  value={materialForm.minimum}
                  placeholder="Ex.: 1"
                  onValueChange={(value) =>
                    setMaterialForm({
                      ...materialForm,
                      minimum: value ?? 0,
                    })
                  }
                />
              </Field>
              <Field label="Cor (opcional)" hint="Selecione uma cor ou digite HEX/RGB.">
                <MaterialColorInput
                  id="new-material-color"
                  value={newMaterialColor}
                  onChange={setNewMaterialColor}
                />
              </Field>
              <div className="form-row">
                <Field
                  label={`Saldo atual (${materialForm.unit})`}
                  hint="Pode ser editado diretamente, sem criar movimentação."
                >
                  <DecimalInput
                    min="0"
                    step="any"
                    value={materialForm.quantity}
                    placeholder="Ex.: 1"
                    onValueChange={(value) =>
                      setMaterialForm({
                        ...materialForm,
                        quantity: value ?? 0,
                      })
                    }
                  />
                </Field>
                <Field label={`Custo médio por ${materialForm.unit}`}>
                  <DecimalInput
                    min="0"
                    step="any"
                    value={materialForm.unitCost}
                    placeholder="Ex.: 100"
                    onValueChange={(value) =>
                      setMaterialForm({
                        ...materialForm,
                        unitCost: value ?? 0,
                      })
                    }
                  />
                </Field>
              </div>
              {editingMaterialId && (
                <p className="modal-explanation">
                  Ao alterar o saldo ou custo médio, as movimentações já registradas deixam de
                  afetar o inventário. As próximas movimentações poderão ser editadas ou excluídas e
                  recalcularão o saldo.
                </p>
              )}
              <button className="button button-primary" type="submit">
                {editingMaterialId ? 'Salvar alterações' : `Cadastrar ${activeCategory.singular}`}{' '}
                <Save aria-hidden="true" />
              </button>
            </form>
          </section>
        </Modal>
      )}
      {materialModal === 'movement' && (
        <Modal
          key={`movement-${activeKind}`}
          title={`${editingMovementId ? 'Editar' : 'Registrar'} movimentação de ${activeCategory.title.toLowerCase()}`}
          eyebrow={activeCategory.title.toUpperCase()}
          onClose={() => setMaterialModal(null)}
        >
          <section className="panel">
            <SectionHeading eyebrow="MOVIMENTAÇÃO" title="Registrar no estoque" />
            <form onSubmit={addMovement} className="form-grid">
              <Field label="Material">
                <select
                  value={selectedMaterial}
                  disabled={!!editingMovementId}
                  onChange={(e) => {
                    setSelectedMaterial(e.target.value)
                  }}
                  required
                >
                  <option value="">Selecione um material</option>
                  {db.materials
                    .filter((m) => m.kind === activeKind)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </Field>
              {selected && (
                <div className="inline-balance">
                  <span>Saldo atual</span>
                  <strong>
                    {number(selectedBalance!.quantity, 3)} {selected.unit}
                  </strong>
                  <span>
                    Custo médio: {money(selectedBalance!.average)}/{selected.unit}
                  </span>
                </div>
              )}
              <SegmentedControl
                label="Tipo de movimentação"
                value={materialTab}
                onValueChange={setMaterialTab}
                disabled={!!editingMovementId}
                options={[
                  { value: 'purchase', label: 'Entrada / compra' },
                  { value: 'adjustment', label: 'Ajuste de saída' },
                ]}
              />
              {materialTab === 'purchase' ? (
                <>
                  <div className="form-row">
                    <Field label={`Quantidade${selected ? ` (${selected.unit})` : ''}`}>
                      <DecimalInput
                        min="0.000001"
                        step="any"
                        value={purchase.quantity}
                        placeholder="Ex.: 1"
                        onValueChange={(value) =>
                          setPurchase({
                            ...purchase,
                            quantity: value ?? 0,
                          })
                        }
                        required
                      />
                    </Field>
                    <Field label={`Preço por ${selected?.unit || 'unidade'}`}>
                      <DecimalInput
                        min="0"
                        step="any"
                        value={purchase.unitCost}
                        placeholder="Ex.: 100"
                        onValueChange={(value) =>
                          setPurchase({
                            ...purchase,
                            unitCost: value ?? 0,
                          })
                        }
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Data da compra">
                    <input
                      type="date"
                      value={purchase.date}
                      onChange={(e) =>
                        setPurchase({
                          ...purchase,
                          date: e.target.value,
                        })
                      }
                      required
                    />
                  </Field>
                  <Field label="Observação">
                    <input
                      value={purchase.note}
                      onChange={(e) =>
                        setPurchase({
                          ...purchase,
                          note: e.target.value,
                        })
                      }
                      placeholder="Fornecedor, lote ou referência"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <Field label={`Quantidade a retirar${selected ? ` (${selected.unit})` : ''}`}>
                      <DecimalInput
                        min="0.000001"
                        max={selectedBalance?.quantity || 0}
                        step="any"
                        value={adjustment.quantity}
                        placeholder="Ex.: 1"
                        onValueChange={(value) =>
                          setAdjustment({
                            ...adjustment,
                            quantity: value ?? 0,
                          })
                        }
                        required
                      />
                    </Field>
                    <Field label="Data">
                      <input
                        type="date"
                        value={adjustment.date}
                        onChange={(e) =>
                          setAdjustment({
                            ...adjustment,
                            date: e.target.value,
                          })
                        }
                        required
                      />
                    </Field>
                  </div>
                  <Field label="Motivo do ajuste">
                    <input
                      value={adjustment.note}
                      onChange={(e) =>
                        setAdjustment({
                          ...adjustment,
                          note: e.target.value,
                        })
                      }
                      placeholder="Ex.: perda ou correção de contagem"
                      required
                    />
                  </Field>
                </>
              )}
              <button className="button button-primary" type="submit">
                {editingMovementId ? 'Salvar' : 'Registrar'}{' '}
                {materialTab === 'purchase' ? 'entrada' : 'ajuste'} <Save aria-hidden="true" />
              </button>
            </form>
          </section>
        </Modal>
      )}
      <SectionHeading eyebrow="INVENTÁRIO POR CATEGORIA" title="Seu inventário" />
      {categories.map((category) => {
        const categoryMaterials = materialSummary.filter(
          (item) => item.material.kind === category.kind,
        )
        const materialIds = new Set(categoryMaterials.map((item) => item.material.id))
        const categoryMovements = db.movements.filter((item) => materialIds.has(item.materialId))
        return (
          <Fragment key={category.kind}>
            <section className="panel table-panel" aria-label={category.title}>
              <div className="flex items-center justify-between">
                <SectionHeading eyebrow="SALDOS ATUAIS" title={category.title} />
                <div className="inventory-actions">
                  <span className="page-tag">{categoryMaterials.length} itens</span>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={!categoryMaterials.length}
                    onClick={() => openMovement(category.kind)}
                  >
                    <ArrowUpDown aria-hidden="true" /> Movimentar {category.title.toLowerCase()}
                  </button>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => openAddMaterial(category.kind)}
                  >
                    <Plus aria-hidden="true" /> Adicionar {category.singular}
                  </button>
                </div>
              </div>

              {categoryMaterials.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Cor</th>
                        <th>Tipo</th>
                        <th>Saldo</th>
                        <th>Custo médio</th>
                        <th>Valor em estoque</th>
                        <th>Status</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryMaterials.map(({ material, balance }) => (
                        <tr key={material.id}>
                          <td
                            style={
                              material.color
                                ? {
                                    boxShadow: `inset 4px 0 0 ${material.color}`,
                                  }
                                : undefined
                            }
                          >
                            <strong>{material.name}</strong>
                          </td>
                          <td>
                            <MaterialColor color={material.color} />
                          </td>
                          <td>{material.kind}</td>
                          <td>
                            {number(balance.quantity, 3)} {material.unit}
                          </td>
                          <td>
                            {money(balance.average)}/{material.unit}
                          </td>
                          <td>{money(balance.value)}</td>
                          <td>
                            <span
                              className={`status ${material.minimum > 0 && balance.quantity < material.minimum ? 'warning' : 'good'}`}
                            >
                              {material.minimum > 0 && balance.quantity < material.minimum
                                ? 'Abaixo do mínimo'
                                : 'Em dia'}
                            </span>
                          </td>
                          <td className="inventory-row-actions">
                            <IconAction
                              icon={ArrowUpDown}
                              tone="blue"
                              label={`Movimentar ${material.name}`}
                              onClick={() => openMovement(category.kind, material.id)}
                            />
                            <IconAction
                              icon={Pencil}
                              label={`Editar ${material.name}`}
                              onClick={() => openEditMaterial(material)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title={`Nenhum item em ${category.title.toLowerCase()}`}
                  description={`Use Adicionar ${category.singular} para começar a controlar seus custos.`}
                />
              )}
            </section>
            <section className="panel table-panel">
              <SectionHeading
                eyebrow="HISTÓRICO DE MOVIMENTAÇÕES"
                title={`Movimentações de ${category.title.toLowerCase()}`}
              />
              {categoryMovements.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Material</th>
                        <th>Tipo</th>
                        <th>Quantidade</th>
                        <th>Custo unitário</th>
                        <th>Observação</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...categoryMovements].reverse().map((m) => (
                        <tr key={m.id}>
                          <td>
                            <span className="movement-date">
                              {m.quantity < 0 ? (
                                <ArrowDown size={16} className="negative" aria-label="Saída" />
                              ) : (
                                <ArrowUp size={16} className="positive" aria-label="Entrada" />
                              )}
                              {new Date(`${m.date}T12:00:00`).toLocaleDateString('pt-BR')}
                            </span>
                          </td>
                          <td>
                            <strong>
                              {db.materials.find((item) => item.id === m.materialId)?.name}
                            </strong>
                          </td>
                          <td>{m.type === 'purchase' ? 'Entrada' : 'Ajuste'}</td>
                          <td className={m.quantity < 0 ? 'negative' : 'positive'}>
                            {m.quantity > 0 ? '+' : ''}
                            {number(m.quantity, 3)}
                          </td>
                          <td>{money(m.unitCost)}</td>
                          <td>{m.note || '—'}</td>
                          <td className="inventory-row-actions">
                            <IconAction
                              icon={Pencil}
                              label={`Editar movimentação de ${db.materials.find((item) => item.id === m.materialId)?.name || 'material'}`}
                              onClick={() => openEditMovement(m)}
                            />
                            <IconAction
                              icon={Trash2}
                              tone="pink"
                              label="Excluir movimentação"
                              onClick={() => setDeleteMovementId(m.id)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="quiet-message">As compras e os ajustes aparecerão aqui.</div>
              )}
            </section>
          </Fragment>
        )
      })}
      {deleteMovementId && (
        <Modal
          title="Excluir movimentação?"
          eyebrow="CONFIRMAÇÃO"
          onClose={() => setDeleteMovementId('')}
        >
          <p className="modal-explanation">
            Essa movimentação será removida. Se ela foi registrada após uma edição manual do saldo,
            o inventário e o custo médio serão recalculados.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-outline"
              onClick={() => setDeleteMovementId('')}
            >
              <X aria-hidden="true" /> Cancelar
            </button>
            <button type="button" className="button button-danger" onClick={deleteMovement}>
              <Trash2 aria-hidden="true" /> Excluir movimentação
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
