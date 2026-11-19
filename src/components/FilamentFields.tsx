import type { Dispatch, SetStateAction } from 'react'
import { Plus, X } from 'lucide-react'
import { type Database, type Sheet, materialBalance, money } from '../lib/domain'
import IconAction from './IconAction'
import DecimalInput from './DecimalInput'

export default function FilamentFields({
  db,
  sheet,
  setSheet,
}: {
  db: Database
  sheet: Sheet
  setSheet: Dispatch<SetStateAction<Sheet>>
}) {
  const available = db.materials.filter(
    (material) => material.kind === 'Filamento' && material.unit === 'kg',
  )
  const update = (index: number, changes: Partial<Sheet['filaments'][number]>) => {
    setSheet((previous) => ({
      ...previous,
      filaments: previous.filaments.map((line, position) =>
        position === index ? { ...line, ...changes } : line,
      ),
    }))
  }
  return (
    <div className="filament-fields">
      <div className="subsection-title">
        <strong>Filamentos por unidade</strong>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setSheet((previous) => ({
              ...previous,
              filaments: [...previous.filaments, { materialId: '', weightGrams: 0 }],
            }))
          }
        >
          <Plus size={16} aria-hidden="true" /> Adicionar filamento
        </button>
      </div>
      {sheet.filaments.map((line, index) => (
        <div className="filament-row" key={index}>
          <label className="field">
            <span>Filamento {index + 1}</span>
            <select
              value={line.materialId}
              onChange={(event) => update(index, { materialId: event.target.value })}
              required
            >
              <option value="">Selecione</option>
              {available.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ·{' '}
                  {money(
                    materialBalance(material.id, db.movements, material.stockBaseline).average,
                  )}
                  /kg
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Peso por unidade (g)</span>
            <DecimalInput
              min="0.000001"
              step="any"
              value={line.weightGrams}
              placeholder="Ex.: 25"
              onValueChange={(value) => update(index, { weightGrams: value ?? 0 })}
              required
            />
          </label>
          <IconAction
            icon={X}
            tone="pink"
            label={`Remover filamento ${index + 1}`}
            onClick={() =>
              setSheet((previous) => ({
                ...previous,
                filaments: previous.filaments.filter((_, position) => position !== index),
              }))
            }
          />
        </div>
      ))}
      {!sheet.filaments.length && (
        <p className="field-hint">Adicione ao menos um filamento para calcular o custo.</p>
      )}
    </div>
  )
}
