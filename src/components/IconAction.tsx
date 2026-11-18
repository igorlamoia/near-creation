import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'title'> & {
  icon: LucideIcon
  label: string
  tone?: 'purple' | 'pink' | 'blue'
}

export default function IconAction({
  icon: Icon,
  label,
  tone = 'purple',
  className = '',
  ...props
}: Props) {
  return (
    <button
      type="button"
      className={`icon-action icon-action-${tone} ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
