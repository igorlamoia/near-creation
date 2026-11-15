import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Save } from 'lucide-react'
import { type Database, type Printer, id, money } from './domain'
import IconAction from './IconAction'
import Modal from './Modal'

type Draft = { id: string; name: string; purchasePrice: string; lifeHours: string; usedHours: string; maintenanceLifetime: string; powerKw: string }
const blank = (): Draft => ({ id: '', name: '', purchasePrice: '', lifeHours: '', usedHours: '', maintenanceLifetime: '', powerKw: '' })
const show = (value: number) => value === 0 ? '' : String(value)
const parseDecimal = (value: string) => Number(value.replace(',', '.') || 0)
const fromPrinter = (printer: Printer): Draft => ({ id: printer.id, name: printer.name, purchasePrice: show(printer.purchasePrice), lifeHours: show(printer.lifeHours), usedHours: show(printer.usedHours), maintenanceLifetime: show(printer.maintenanceLifetime), powerKw: show(printer.powerKw) })

function NumberField({ label, value, placeholder, onChange, required = false }: { label: string; value: string; placeholder: string; onChange: (value: string) => void; required?: boolean }) {
  return <label className="field"><span>{label}</span><input type="text" inputMode="decimal" value={value} placeholder={placeholder} onChange={event => { if (/^\d*(?:[.,]\d*)?$/.test(event.target.value)) onChange(event.target.value) }} required={required} /></label>
}

export default function PrinterSettings({ db, commit, flash }: { db: Database; commit: (next: Database, message: string) => Promise<boolean>; flash: (message: string) => void }) {
  const [draft, setDraft] = useState<Draft>(blank)
  const [energyDraft, setEnergyDraft] = useState('')
  const [activeModal, setActiveModal] = useState<'printer' | 'energy' | null>(null)
  const update = (field: keyof Draft, value: string) => setDraft(previous => ({ ...previous, [field]: value }))

  function openAddPrinter() {
    setDraft(blank())
    setActiveModal('printer')
  }
  function openEditPrinter(printer: Printer) {
    setDraft(fromPrinter(printer))
    setActiveModal('printer')
  }
  function openEnergy() {
    setEnergyDraft(show(db.settings.energyTariff))
    setActiveModal('energy')
  }

  async function savePrinter(event: FormEvent) {
    event.preventDefault()
    const printer: Printer = {
      id: draft.id || id(), name: draft.name.trim(),
      purchasePrice: parseDecimal(draft.purchasePrice), lifeHours: parseDecimal(draft.lifeHours),
      usedHours: parseDecimal(draft.usedHours), maintenanceLifetime: parseDecimal(draft.maintenanceLifetime),
      powerKw: parseDecimal(draft.powerKw),
    }
    if (!printer.name || printer.lifeHours <= 0 || Object.entries(printer).some(([key, value]) => key !== 'id' && key !== 'name' && (!Number.isFinite(value) || Number(value) < 0)))
      return flash('Informe nome, vida útil e valores válidos para a impressora.')
    const printers = draft.id ? db.settings.printers.map(item => item.id === draft.id ? printer : item) : [...db.settings.printers, printer]
    if (await commit({ ...db, settings: { ...db.settings, printers } }, draft.id ? 'Impressora atualizada.' : 'Impressora cadastrada.')) setActiveModal(null)
  }

  async function saveEnergy(event: FormEvent) {
    event.preventDefault()
    const energyTariff = parseDecimal(energyDraft)
    if (!Number.isFinite(energyTariff) || energyTariff < 0) return flash('Informe uma tarifa de energia válida.')
    if (await commit({ ...db, settings: { ...db.settings, energyTariff } }, 'Tarifa de energia salva.')) setActiveModal(null)
  }

  const hourlyCost = parseDecimal(draft.lifeHours) > 0 ? (parseDecimal(draft.purchasePrice) + parseDecimal(draft.maintenanceLifetime)) / parseDecimal(draft.lifeHours) : 0

  return <>
    <div className="settings-grid">
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">EQUIPAMENTOS</span><h2>Impressoras 3D</h2><p>Cadastre quantas impressoras precisar. Cada uma terá seus próprios custos.</p></div>
          <button type="button" className="button button-primary" onClick={openAddPrinter}><Plus aria-hidden="true" /> Adicionar</button>
        </div>
        {db.settings.printers.length ? <div className="printer-list">{db.settings.printers.map(printer =>
          <div className="printer-row" key={printer.id}>
            <div><strong>{printer.name}</strong><small>{money((printer.purchasePrice + printer.maintenanceLifetime) / printer.lifeHours)}/h · {printer.powerKw} kWh/h</small></div>
            <IconAction icon={Pencil} label={`Editar impressora ${printer.name}`} onClick={() => openEditPrinter(printer)} />
          </div>
        )}</div> : <p className="quiet-message">Nenhuma impressora cadastrada. Adicione uma para começar a precificar.</p>}
      </section>
      <section className="panel">
        <div className="section-heading">
          <div><span className="eyebrow">CONSUMO</span><h2>Energia elétrica</h2><p>A tarifa é geral. O consumo por hora fica no cadastro de cada impressora.</p></div>
          <IconAction icon={Pencil} label="Editar tarifa de energia" onClick={openEnergy} />
        </div>
        <div className="settings-value"><span>Tarifa atual</span><strong>{money(db.settings.energyTariff)}<small> / kWh</small></strong></div>
      </section>
    </div>
    {activeModal === 'printer' && <Modal title={draft.id ? 'Editar impressora' : 'Adicionar impressora'} eyebrow="EQUIPAMENTOS" onClose={() => setActiveModal(null)}>
      <form className="form-grid" onSubmit={savePrinter}>
        <label className="field"><span>Nome da impressora</span><input value={draft.name} onChange={event => update('name', event.target.value)} placeholder="Ex.: Bambu Lab A1" required /></label>
        <div className="form-row"><NumberField label="Valor de aquisição (R$)" value={draft.purchasePrice} placeholder="Ex.: 3000" onChange={value => update('purchasePrice', value)} /><NumberField label="Vida útil estimada (h)" value={draft.lifeHours} placeholder="Ex.: 3000" onChange={value => update('lifeHours', value)} required /></div>
        <div className="form-row"><NumberField label="Horas já utilizadas" value={draft.usedHours} placeholder="Ex.: 100" onChange={value => update('usedHours', value)} /><NumberField label="Manutenção estimada na vida útil (R$)" value={draft.maintenanceLifetime} placeholder="Ex.: 300" onChange={value => update('maintenanceLifetime', value)} /></div>
        <NumberField label="Consumo médio (kWh por hora)" value={draft.powerKw} placeholder="Ex.: 0,12" onChange={value => update('powerKw', value)} />
        <div className="inline-balance"><span>Custo estimado da impressora por hora</span><strong>{money(hourlyCost)}</strong></div>
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setActiveModal(null)}>Cancelar</button><button className="button button-primary" type="submit"><Save aria-hidden="true" /> Salvar impressora</button></div>
      </form>
    </Modal>}
    {activeModal === 'energy' && <Modal title="Editar tarifa de energia" eyebrow="CONSUMO" onClose={() => setActiveModal(null)}>
      <form className="form-grid" onSubmit={saveEnergy}>
        <NumberField label="Tarifa de energia (R$/kWh)" value={energyDraft} placeholder="Ex.: 0,85" onChange={setEnergyDraft} />
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setActiveModal(null)}>Cancelar</button><button className="button button-primary" type="submit"><Save aria-hidden="true" /> Salvar tarifa</button></div>
      </form>
    </Modal>}
  </>
}
