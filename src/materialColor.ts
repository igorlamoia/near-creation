/** Converts supported CSS color inputs to the single format stored for materials. */
export function normalizeMaterialColor(input: string): string | null {
  const value = input.trim()
  if (!value) return null
  const hex = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(value)
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(char => char + char).join('') : hex[1]
    return `#${digits.toUpperCase()}`
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value)
  if (!rgb) return null
  const channels = rgb.slice(1).map(Number)
  if (channels.some(channel => channel > 255)) return null
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
