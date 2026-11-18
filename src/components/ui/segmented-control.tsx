import { RadioGroup, RadioGroupItem } from './radio-group'

export function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  disabled,
}: {
  label: string
  value: T
  onValueChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  disabled?: boolean
}) {
  return (
    <RadioGroup
      className="segmented"
      aria-label={label}
      orientation="horizontal"
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        const option = options.find((item) => item.value === next)
        if (option) onValueChange(option.value)
      }}
    >
      {options.map((option) => (
        <RadioGroupItem key={option.value} value={option.value} variant="segment">
          {option.label}
        </RadioGroupItem>
      ))}
    </RadioGroup>
  )
}
