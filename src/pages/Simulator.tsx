import { AlertTriangle } from 'lucide-react'
import ScaleSimulator from '../components/ScaleSimulator'
import { decodeSimulationPayload } from '../lib/scaleSimulation'

export default function Simulator() {
  const encoded = new URLSearchParams(window.location.search).get('n')
  let decoded: ReturnType<typeof decodeSimulationPayload> | null = null
  let error = ''
  try {
    if (!encoded) throw new Error('Este link de simulação está incompleto.')
    decoded = decodeSimulationPayload(encoded)
  } catch (cause) {
    error = (cause as Error).message
  }

  return (
    <div className="public-simulator-page">
      <header className="public-simulator-header">
        <span className="eyebrow">NEAR CREATION 3D</span>
        <h1>Simule sua peça</h1>
        <p>Ajuste o tamanho ou o valor para comparar as possibilidades de produção.</p>
      </header>
      {decoded ? (
        <ScaleSimulator
          base={{
            unitPrice: decoded.base.unitPrice,
            filaments: decoded.base.filaments,
            timeHours: decoded.base.timeHours,
            fixedUnitCost: decoded.base.fixedUnitCost,
            scalableUnitCost: decoded.base.scalableUnitCost,
            batch: decoded.base.batch,
            fixedFee: decoded.base.fixedFee,
            percentFee: decoded.base.percentFee,
            pricingMode: decoded.base.pricingMode,
            margin: decoded.base.margin,
          }}
          initialSizeCm={decoded.base.sizeCm}
          initialBasePercent={decoded.base.basePercent}
          initialPercent={decoded.percent}
          initialMethod={decoded.method}
          initialVisibility={decoded.visibility}
          initialShape={decoded.visual.shape}
          initialShowLabels={decoded.visual.showLabels}
          objectColor={decoded.visual.objectColor}
          showMethodSelector={false}
        />
      ) : (
        <section className="panel public-simulator-error" role="alert">
          <AlertTriangle aria-hidden="true" />
          <h2>Não foi possível abrir a simulação</h2>
          <p>{error}</p>
          <p>Solicite um novo link para quem preparou a precificação.</p>
        </section>
      )}
    </div>
  )
}
