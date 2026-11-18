import { normalizeMaterialColor } from '../lib/materialColor'

export default function MaterialColorInput({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (value: string) => void
  id: string
}) {
  const color = normalizeMaterialColor(value)
  return (
    <div className="material-color-input">
      <input
        aria-label="Selecionar cor"
        type="color"
        value={color || '#FFFFFF'}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <input
        id={id}
        aria-label="Cor em HEX ou RGB"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#AABBCC ou rgb(170, 187, 204)"
        spellCheck={false}
      />
    </div>
  )
}

export function MaterialColor({ color }: { color: string | null }) {
  return color ? (
    <span className="material-color-label">
      <span className="material-color-swatch" style={{ backgroundColor: color }} />
      {color}
    </span>
  ) : (
    <span className="text-text-secondary">Sem cor</span>
  )
}
