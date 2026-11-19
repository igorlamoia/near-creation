import { useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { z } from 'zod'
import { Pencil, Plus, Save } from 'lucide-react'
import { type Database, type Printer, id, money } from '../lib/domain'
import IconAction from './IconAction'
import Modal from './Modal'

type Draft = {
  id: string
  name: string
  purchasePrice: string
  lifeHours: string
  usedHours: string
  maintenanceLifetime: string
  powerKw: string
}
const blank = (): Draft => ({
  id: '',
  name: '',
  purchasePrice: '',
  lifeHours: '',
  usedHours: '',
  maintenanceLifetime: '',
  powerKw: '',
})
const show = (value: number) => (value === 0 ? '' : String(value))
const parseDecimal = (value: string) => Number(value.replace(',', '.') || 0)
const fromPrinter = (printer: Printer): Draft => ({
  id: printer.id,
  name: printer.name,
  purchasePrice: show(printer.purchasePrice),
  lifeHours: show(printer.lifeHours),
  usedHours: show(printer.usedHours),
  maintenanceLifetime: show(printer.maintenanceLifetime),
  powerKw: show(printer.powerKw),
})
const decimalString = (label: string, minimum = 0) =>
  z.string().refine((value) => {
    const parsed = parseDecimal(value)
    return Number.isFinite(parsed) && parsed >= minimum
  }, `${label} inválido.`)
const printerSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Informe o nome da impressora.'),
  purchasePrice: decimalString('Valor de aquisição'),
  lifeHours: decimalString('Vida útil', 0.000001),
  usedHours: decimalString('Horas utilizadas'),
  maintenanceLifetime: decimalString('Manutenção'),
  powerKw: decimalString('Consumo'),
})
const energySchema = z.object({ energy: decimalString('Tarifa') })

function NumberField({
  label,
  value,
  placeholder,
  onChange,
  error,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
  error?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          if (/^\d*(?:[.,]\d*)?$/.test(event.target.value)) onChange(event.target.value)
        }}
      />
      {error && <small className="text-brand-pink">{error}</small>}
    </label>
  )
}

export default function PrinterSettings({
  db,
  commit,
}: {
  db: Database
  commit: (next: Database, message: string) => Promise<boolean>
  flash: (message: string) => void
}) {
  const [activeModal, setActiveModal] = useState<'printer' | 'energy' | null>(null)
  const printerForm = useForm({
    defaultValues: blank(),
    validators: { onSubmit: printerSchema },
    onSubmit: async ({ value }) => {
      const printer: Printer = {
        id: value.id || id(),
        name: value.name.trim(),
        purchasePrice: parseDecimal(value.purchasePrice),
        lifeHours: parseDecimal(value.lifeHours),
        usedHours: parseDecimal(value.usedHours),
        maintenanceLifetime: parseDecimal(value.maintenanceLifetime),
        powerKw: parseDecimal(value.powerKw),
      }
      const printers = value.id
        ? db.settings.printers.map((item) => (item.id === value.id ? printer : item))
        : [...db.settings.printers, printer]
      if (
        await commit(
          { ...db, settings: { ...db.settings, printers } },
          value.id ? 'Impressora atualizada.' : 'Impressora cadastrada.',
        )
      )
        setActiveModal(null)
    },
  })
  const energyForm = useForm({
    defaultValues: { energy: '' },
    validators: { onSubmit: energySchema },
    onSubmit: async ({ value }) => {
      if (
        await commit(
          { ...db, settings: { ...db.settings, energyTariff: parseDecimal(value.energy) } },
          'Tarifa de energia salva.',
        )
      )
        setActiveModal(null)
    },
  })
  const openAddPrinter = () => {
    printerForm.reset(blank())
    setActiveModal('printer')
  }
  const openEditPrinter = (printer: Printer) => {
    printerForm.reset(fromPrinter(printer))
    setActiveModal('printer')
  }
  const openEnergy = () => {
    energyForm.reset({ energy: show(db.settings.energyTariff) })
    setActiveModal('energy')
  }
  const values = useStore(printerForm.store, (state) => state.values)
  const hourlyCost =
    parseDecimal(values.lifeHours) > 0
      ? (parseDecimal(values.purchasePrice) + parseDecimal(values.maintenanceLifetime)) /
        parseDecimal(values.lifeHours)
      : 0

  return (
    <>
      <div className="settings-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EQUIPAMENTOS</span>
              <h2>Impressoras 3D</h2>
              <p>Cadastre quantas impressoras precisar. Cada uma terá seus próprios custos.</p>
            </div>
            <button type="button" className="button button-primary" onClick={openAddPrinter}>
              <Plus aria-hidden="true" /> Adicionar
            </button>
          </div>
          {db.settings.printers.length ? (
            <div className="printer-list">
              {db.settings.printers.map((printer) => (
                <div className="printer-row" key={printer.id}>
                  <div>
                    <strong>{printer.name}</strong>
                    <small>
                      {money(
                        (printer.purchasePrice + printer.maintenanceLifetime) / printer.lifeHours,
                      )}
                      /h · {printer.powerKw} kWh/h
                    </small>
                  </div>
                  <IconAction
                    icon={Pencil}
                    label={`Editar impressora ${printer.name}`}
                    onClick={() => openEditPrinter(printer)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="quiet-message">
              Nenhuma impressora cadastrada. Adicione uma para começar a precificar.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONSUMO</span>
              <h2>Energia elétrica</h2>
              <p>A tarifa é geral. O consumo por hora fica no cadastro de cada impressora.</p>
            </div>
            <IconAction icon={Pencil} label="Editar tarifa de energia" onClick={openEnergy} />
          </div>
          <div className="settings-value">
            <span>Tarifa atual</span>
            <strong>
              {money(db.settings.energyTariff)}
              <small> / kWh</small>
            </strong>
          </div>
        </section>
      </div>
      {activeModal === 'printer' && (
        <Modal
          title={values.id ? 'Editar impressora' : 'Adicionar impressora'}
          eyebrow="EQUIPAMENTOS"
          onClose={() => setActiveModal(null)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              void printerForm.handleSubmit()
            }}
          >
            <printerForm.Field name="name">
              {(field) => (
                <label className="field">
                  <span>Nome da impressora</span>
                  <input
                    value={field.state.value}
                    placeholder="Ex.: Bambu Lab A1"
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  {field.state.meta.errors[0] && (
                    <small className="text-brand-pink">{String(field.state.meta.errors[0])}</small>
                  )}
                </label>
              )}
            </printerForm.Field>
            <div className="form-row">
              <printerForm.Field name="purchasePrice">
                {(field) => (
                  <NumberField
                    label="Valor de aquisição (R$)"
                    value={field.state.value}
                    placeholder="Ex.: 3000"
                    onChange={field.handleChange}
                    error={
                      field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined
                    }
                  />
                )}
              </printerForm.Field>
              <printerForm.Field name="lifeHours">
                {(field) => (
                  <NumberField
                    label="Vida útil estimada (h)"
                    value={field.state.value}
                    placeholder="Ex.: 3000"
                    onChange={field.handleChange}
                    error={
                      field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined
                    }
                  />
                )}
              </printerForm.Field>
            </div>
            <div className="form-row">
              <printerForm.Field name="usedHours">
                {(field) => (
                  <NumberField
                    label="Horas já utilizadas"
                    value={field.state.value}
                    placeholder="Ex.: 100"
                    onChange={field.handleChange}
                    error={
                      field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined
                    }
                  />
                )}
              </printerForm.Field>
              <printerForm.Field name="maintenanceLifetime">
                {(field) => (
                  <NumberField
                    label="Manutenção estimada na vida útil (R$)"
                    value={field.state.value}
                    placeholder="Ex.: 300"
                    onChange={field.handleChange}
                    error={
                      field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined
                    }
                  />
                )}
              </printerForm.Field>
            </div>
            <printerForm.Field name="powerKw">
              {(field) => (
                <NumberField
                  label="Consumo médio (kWh por hora)"
                  value={field.state.value}
                  placeholder="Ex.: 0,12"
                  onChange={field.handleChange}
                  error={
                    field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined
                  }
                />
              )}
            </printerForm.Field>
            <div className="inline-balance">
              <span>Custo estimado da impressora por hora</span>
              <strong>{money(hourlyCost)}</strong>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setActiveModal(null)}
              >
                Cancelar
              </button>
              <button className="button button-primary" type="submit">
                <Save aria-hidden="true" /> Salvar impressora
              </button>
            </div>
          </form>
        </Modal>
      )}
      {activeModal === 'energy' && (
        <Modal
          title="Editar tarifa de energia"
          eyebrow="CONSUMO"
          onClose={() => setActiveModal(null)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              void energyForm.handleSubmit()
            }}
          >
            <energyForm.Field name="energy">
              {(field) => (
                <NumberField
                  label="Tarifa de energia (R$/kWh)"
                  value={field.state.value}
                  placeholder="Ex.: 0,85"
                  onChange={field.handleChange}
                  error={
                    field.state.meta.errors[0] ? String(field.state.meta.errors[0]) : undefined
                  }
                />
              )}
            </energyForm.Field>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setActiveModal(null)}
              >
                Cancelar
              </button>
              <button className="button button-primary" type="submit">
                <Save aria-hidden="true" /> Salvar tarifa
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
