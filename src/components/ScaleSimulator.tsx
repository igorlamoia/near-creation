import { useMemo, useState } from 'react'
import { Clock3, Copy, Cuboid, Info, Percent, Ruler, Weight } from 'lucide-react'
import DecimalInput from './DecimalInput'
import Field from './Field'
import SectionHeading from './SectionHeading'
import { SegmentedControl } from './ui/segmented-control'
import { Slider } from './ui/slider'
import { money, number } from '../lib/domain'
import {
  encodeSimulationPayload,
  minimumDetailedPrice,
  percentFromPrice,
  simulateScale,
  type ScaleSimulationBase,
  type SimulationMethod,
  type SimulationVisibility,
} from '../lib/scaleSimulation'

type ScaleSimulatorProps = {
  base: Omit<ScaleSimulationBase, 'sizeCm' | 'basePercent'>
  initialSizeCm?: number | null
  initialBasePercent?: number
  initialPercent?: number
  initialMethod?: SimulationMethod
  initialVisibility?: SimulationVisibility
  editableReferenceSize?: boolean
  allowVisibilitySelection?: boolean
  showMethodSelector?: boolean
}

const methodOptions = [
  { value: 'detailed', label: 'Precificação detalhada' },
  { value: 'cubic', label: 'Proporção 3D direta' },
] as const

const formatTime = (hours: number) =>
  hours < 1 ? `${number(hours * 60)} min` : `${number(hours)} h`
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export default function ScaleSimulator({
  base,
  initialSizeCm = null,
  initialBasePercent = 100,
  initialPercent,
  initialMethod = 'detailed',
  initialVisibility = { filament: true, time: true },
  editableReferenceSize = false,
  allowVisibilitySelection = false,
  showMethodSelector = true,
}: ScaleSimulatorProps) {
  const [sizeCm, setSizeCm] = useState<number | null>(initialSizeCm)
  const [basePercent, setBasePercent] = useState(initialBasePercent)
  const [percent, setPercent] = useState(initialPercent ?? initialBasePercent)
  const [method, setMethod] = useState<SimulationMethod>(initialMethod)
  const [visibility, setVisibility] = useState(initialVisibility)
  const [inputError, setInputError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const simulationBase = useMemo<ScaleSimulationBase | null>(
    () =>
      sizeCm != null && sizeCm > 0 && basePercent > 0 ? { ...base, sizeCm, basePercent } : null,
    [base, basePercent, sizeCm],
  )

  let result: ReturnType<typeof simulateScale> | null = null
  let calculationError = ''
  if (simulationBase) {
    try {
      result = simulateScale(simulationBase, percent, method)
    } catch (error) {
      calculationError = (error as Error).message
    }
  }

  const changePercent = (value: number | null) => {
    setInputError('')
    if (value != null && value > 0) setPercent(value)
  }

  const changeCurrentSize = (value: number | null) => {
    setInputError('')
    if (value != null && value > 0 && simulationBase)
      setPercent((value / simulationBase.sizeCm) * simulationBase.basePercent)
  }

  const changePrice = (value: number | null) => {
    if (value == null || !simulationBase) return
    try {
      setPercent(percentFromPrice(simulationBase, value, method))
      setInputError('')
    } catch (error) {
      const minimum =
        method === 'detailed' ? ` Mínimo: ${money(minimumDetailedPrice(simulationBase))}.` : ''
      setInputError(`${(error as Error).message}${minimum}`)
    }
  }

  const copyLink = async () => {
    if (!simulationBase || !result) return
    const encoded = encodeSimulationPayload({ base: simulationBase, method, percent, visibility })
    const path = `${import.meta.env.BASE_URL}simulator?n=${encodeURIComponent(encoded)}`
    const link = new URL(path, window.location.origin).toString()
    try {
      await navigator.clipboard.writeText(link)
      setCopyStatus('Link copiado.')
    } catch {
      setCopyStatus('Não foi possível copiar o link automaticamente.')
    }
  }

  const sliderMax = Math.max(300, Math.ceil(percent / 25) * 25)
  const showTime = allowVisibilitySelection || visibility.time
  const showFilament = allowVisibilitySelection || visibility.filament

  return (
    <section className="panel scale-simulator">
      <SectionHeading
        eyebrow="SIMULAÇÃO 3D"
        title="Tamanho, consumo e valor"
        text="Compare outros tamanhos mantendo as proporções tridimensionais da peça."
        action={
          result ? (
            <button className="button button-outline" type="button" onClick={copyLink}>
              <Copy size={16} aria-hidden="true" /> Compartilhar simulação
            </button>
          ) : null
        }
      />

      <div className="simulation-reference">
        <div>
          <Ruler aria-hidden="true" />
          {editableReferenceSize ? (
            <Field label="Tamanho original (cm)">
              <DecimalInput
                min="0.01"
                step="0.01"
                precision={2}
                value={sizeCm == null ? null : round2(sizeCm)}
                emptyValue={null}
                placeholder="Ex.: 10"
                onValueChange={(value) => {
                  setSizeCm(value)
                  setInputError('')
                }}
              />
            </Field>
          ) : (
            <span>
              <small>Tamanho original</small>
              <strong>{sizeCm == null ? '—' : `${number(sizeCm)} cm`}</strong>
            </span>
          )}
        </div>
        <div>
          <Percent aria-hidden="true" />
          {editableReferenceSize ? (
            <Field label="Escala original (%)">
              <DecimalInput
                min="0.01"
                step="0.01"
                precision={2}
                value={round2(basePercent)}
                emptyValue={null}
                onValueChange={(value) => {
                  if (value != null && value > 0) {
                    setBasePercent(value)
                    setPercent(value)
                    setInputError('')
                  }
                }}
              />
            </Field>
          ) : (
            <span>
              <small>Escala original</small>
              <strong>{number(basePercent)}%</strong>
            </span>
          )}
        </div>
        <div>
          <Cuboid aria-hidden="true" />
          <span>
            <small>Preço original</small>
            <strong>{money(base.unitPrice)}</strong>
          </span>
        </div>
        {allowVisibilitySelection ? (
          <button
            type="button"
            className={`simulation-reference-toggle ${visibility.filament ? '' : 'is-hidden'}`}
            aria-pressed={visibility.filament}
            title="Alternar exibição do filamento no link"
            onClick={() =>
              setVisibility((current) => ({ ...current, filament: !current.filament }))
            }
          >
            <Weight aria-hidden="true" />
            <span>
              <small>Filamento original</small>
              <strong>{number(base.filaments.reduce((sum, item) => sum + item.grams, 0))} g</strong>
            </span>
          </button>
        ) : visibility.filament ? (
          <div>
            <Weight aria-hidden="true" />
            <span>
              <small>Filamento original</small>
              <strong>{number(base.filaments.reduce((sum, item) => sum + item.grams, 0))} g</strong>
            </span>
          </div>
        ) : null}
        {allowVisibilitySelection ? (
          <button
            type="button"
            className={`simulation-reference-toggle ${visibility.time ? '' : 'is-hidden'}`}
            aria-pressed={visibility.time}
            title="Alternar exibição do tempo no link"
            onClick={() => setVisibility((current) => ({ ...current, time: !current.time }))}
          >
            <Clock3 aria-hidden="true" />
            <span>
              <small>Tempo original</small>
              <strong>{formatTime(base.timeHours)}</strong>
            </span>
          </button>
        ) : visibility.time ? (
          <div>
            <Clock3 aria-hidden="true" />
            <span>
              <small>Tempo original</small>
              <strong>{formatTime(base.timeHours)}</strong>
            </span>
          </div>
        ) : null}
      </div>

      {allowVisibilitySelection && (
        <p className="simulation-visibility-hint">
          Clique em filamento ou tempo para escolher o que o cliente verá no link. Itens com
          transparência serão omitidos.
        </p>
      )}

      {!simulationBase ? (
        <div className="simulation-empty">
          <Ruler aria-hidden="true" />
          <p>Informe o tamanho original da peça para iniciar a simulação.</p>
        </div>
      ) : (
        <>
          {showMethodSelector && (
            <>
              <SegmentedControl
                label="Método de cálculo da simulação"
                value={method}
                onValueChange={(value) => {
                  setMethod(value)
                  setInputError('')
                }}
                options={methodOptions}
              />
              <p className="field-hint simulation-method-hint">
                {method === 'detailed'
                  ? 'Escala filamento, energia e impressora; mantém mão de obra, acessórios e embalagem fixos.'
                  : 'Aplica o fator cúbico diretamente ao preço original.'}
              </p>
            </>
          )}

          <div className="simulation-controls">
            <Field label="Escala (%)">
              <DecimalInput
                min="0.01"
                step="0.01"
                precision={2}
                value={round2(percent)}
                emptyValue={null}
                onValueChange={changePercent}
              />
            </Field>
            <Field label="Tamanho simulado (cm)">
              <DecimalInput
                min="0.01"
                step="0.01"
                precision={2}
                value={result ? round2(result.sizeCm) : null}
                emptyValue={null}
                onValueChange={changeCurrentSize}
              />
            </Field>
            <Field label="Valor desejado (R$)">
              <DecimalInput
                min="0.01"
                step="0.01"
                precision={2}
                value={result ? round2(result.unitPrice) : null}
                emptyValue={null}
                onValueChange={changePrice}
              />
            </Field>
          </div>
          <Slider
            className="simulation-slider"
            aria-label="Ajustar percentual do tamanho"
            min={1}
            max={sliderMax}
            step={1}
            value={[Math.max(1, Math.min(sliderMax, percent))]}
            onValueChange={([value]) => changePercent(value)}
          />

          {(inputError || calculationError) && (
            <p className="simulation-error" role="status">
              {inputError || calculationError}
            </p>
          )}

          {result && (
            <div
              className={`simulation-results ${!showTime && !showFilament ? 'simulation-results-price-only' : ''}`}
            >
              <div className="simulation-price">
                <small>VALOR SIMULADO</small>
                <strong>{money(result.unitPrice)}</strong>
                <span>
                  {number(result.sizeCm)} cm · {number(result.percent)}% da referência
                </span>
              </div>
              {(showTime || showFilament) && (
                <div className="simulation-estimates">
                  {showTime && (
                    <div>
                      <Clock3 aria-hidden="true" />
                      <span>
                        <small>Tempo estimado</small>
                        <strong>Até {formatTime(result.timeHours)}</strong>
                      </span>
                    </div>
                  )}
                  {showFilament && (
                    <div>
                      <Weight aria-hidden="true" />
                      <span>
                        <small>Filamento estimado</small>
                        <strong>{number(result.totalFilamentGrams)} g</strong>
                      </span>
                    </div>
                  )}
                  {showFilament && (
                    <div className="simulation-filaments">
                      {result.filaments.map((filament, index) => (
                        <span key={`${filament.name}-${index}`}>
                          {filament.name}: <strong>{number(filament.grams)} g</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="simulation-disclaimer">
            <Info size={16} aria-hidden="true" />
            Estimativa tridimensional. Geometria, preenchimento, paredes, altura de camada e
            configurações do fatiador podem reduzir ou aumentar o consumo e o tempo reais.
          </p>
          {copyStatus && (
            <p className="simulation-copy-status" role="status">
              {copyStatus}
            </p>
          )}
        </>
      )}
    </section>
  )
}
