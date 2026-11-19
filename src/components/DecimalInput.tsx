import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'

type DecimalInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: number | null
  onValueChange: (value: number | null) => void
  emptyValue?: 0 | null
  precision?: number
}

const displayValue = (value: number | null) => (value === null || value === 0 ? '' : String(value))
const decimalPattern = /^\d*(?:[.,]\d*)?$/
const parseDecimal = (value: string) => Number(value.replace(',', '.'))

export default function DecimalInput({
  value,
  onValueChange,
  emptyValue = 0,
  precision,
  onFocus,
  onBlur,
  ...props
}: DecimalInputProps) {
  const [draft, setDraft] = useState(() => displayValue(value))
  const focused = useRef(false)
  const normalize = (next: number) => (precision == null ? next : Number(next.toFixed(precision)))

  useEffect(() => {
    if (!focused.current) setDraft(displayValue(value))
  }, [value])

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      onFocus={(event) => {
        focused.current = true
        onFocus?.(event)
      }}
      onChange={(event) => {
        const next = event.target.value
        if (!decimalPattern.test(next)) return
        setDraft(next)
        if (next === '') {
          onValueChange(emptyValue)
        } else {
          const parsed = parseDecimal(next)
          if (Number.isFinite(parsed)) onValueChange(normalize(parsed))
        }
      }}
      onBlur={(event) => {
        focused.current = false
        if (draft !== '') {
          const parsed = parseDecimal(draft)
          if (Number.isFinite(parsed)) {
            const normalized = normalize(parsed)
            setDraft(String(normalized))
            onValueChange(normalized)
          } else {
            setDraft('')
            onValueChange(emptyValue)
          }
        }
        onBlur?.(event)
      }}
    />
  )
}
