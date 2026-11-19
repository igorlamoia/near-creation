import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OBJECT_COLOR,
  getDominantObjectColor,
  getObjectPlacement,
  getShapeDimensions,
  HOLD_LIMIT_CM,
  PERSON_HEIGHT_METERS,
} from '../lib/scaleVisualization'

describe('visualização de escala 3D', () => {
  it('converte o maior eixo para metros e preserva as proporções dos formatos', () => {
    expect(getShapeDimensions('cube', 30)).toEqual({ width: 0.3, height: 0.3, depth: 0.3 })
    expect(getShapeDimensions('box-vertical', 30)).toEqual({
      width: 0.105,
      height: 0.3,
      depth: 0.105,
    })
    expect(getShapeDimensions('box-horizontal', 30)).toEqual({
      width: 0.3,
      height: 0.105,
      depth: 0.105,
    })
    expect(getShapeDimensions('disc', 30)).toEqual({
      width: 0.3,
      height: 0.3,
      depth: 0.045,
    })
  })

  it('coloca objetos pequenos nas mãos e objetos grandes ao lado da pessoa', () => {
    expect(PERSON_HEIGHT_METERS).toBe(1.7)
    expect(HOLD_LIMIT_CM).toBe(76.5)
    expect(getObjectPlacement('cube', HOLD_LIMIT_CM).mode).toBe('held')
    expect(getObjectPlacement('cube', HOLD_LIMIT_CM + 0.01).mode).toBe('ground')
  })

  it('usa a cor do filamento dominante e tem fallback roxo', () => {
    expect(
      getDominantObjectColor([
        { grams: 20, color: '#FF0000' },
        { grams: 55, color: '#00ff00' },
      ]),
    ).toBe('#00FF00')
    expect(getDominantObjectColor([{ grams: 10, color: null }])).toBe(DEFAULT_OBJECT_COLOR)
    expect(getDominantObjectColor([])).toBe(DEFAULT_OBJECT_COLOR)
  })
})
