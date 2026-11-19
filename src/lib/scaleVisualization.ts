import { normalizeMaterialColor } from './materialColor'

export const PERSON_HEIGHT_METERS = 1.7
export const HOLD_LIMIT_CM = PERSON_HEIGHT_METERS * 100 * 0.45
export const DEFAULT_OBJECT_COLOR = '#8860D8'

export type SimulationShape = 'cube' | 'box-vertical' | 'box-horizontal' | 'sphere' | 'disc'

export type SimulationVisualConfig = {
  shape: SimulationShape
  objectColor: string
  showLabels: boolean
}

export type ShapeDimensions = {
  width: number
  height: number
  depth: number
}

export type ObjectPlacement = {
  mode: 'held' | 'ground'
  position: [number, number, number]
}

export const DEFAULT_VISUAL_CONFIG: SimulationVisualConfig = {
  shape: 'cube',
  objectColor: DEFAULT_OBJECT_COLOR,
  showLabels: true,
}

export const simulationShapeOptions: readonly { value: SimulationShape; label: string }[] = [
  { value: 'cube', label: 'Cubo' },
  { value: 'box-vertical', label: 'Retângulo vertical' },
  { value: 'box-horizontal', label: 'Retângulo horizontal' },
  { value: 'sphere', label: 'Esfera' },
  { value: 'disc', label: 'Disco' },
]

export function getShapeDimensions(shape: SimulationShape, sizeCm: number): ShapeDimensions {
  const size = Math.max(0, sizeCm) / 100
  switch (shape) {
    case 'box-vertical':
      return { width: size * 0.35, height: size, depth: size * 0.35 }
    case 'box-horizontal':
      return { width: size, height: size * 0.35, depth: size * 0.35 }
    case 'disc':
      return { width: size, height: size, depth: size * 0.15 }
    case 'cube':
    case 'sphere':
      return { width: size, height: size, depth: size }
  }
}

export function getObjectPlacement(shape: SimulationShape, sizeCm: number): ObjectPlacement {
  const dimensions = getShapeDimensions(shape, sizeCm)
  const largestDimension = Math.max(dimensions.width, dimensions.height, dimensions.depth)
  if (largestDimension <= HOLD_LIMIT_CM / 100) {
    return {
      mode: 'held',
      position: [0, 1.13, 0.25 + dimensions.depth / 2],
    }
  }
  return {
    mode: 'ground',
    position: [0.38 + dimensions.width / 2, dimensions.height / 2, 0],
  }
}

export function getDominantObjectColor(
  filaments: readonly { grams: number; color: string | null | undefined }[],
) {
  const dominant = filaments.reduce<(typeof filaments)[number] | null>(
    (selected, filament) => (!selected || filament.grams > selected.grams ? filament : selected),
    null,
  )
  return normalizeMaterialColor(dominant?.color ?? '') ?? DEFAULT_OBJECT_COLOR
}

export function isSimulationShape(value: unknown): value is SimulationShape {
  return simulationShapeOptions.some((option) => option.value === value)
}
