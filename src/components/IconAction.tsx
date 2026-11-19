import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className={`icon-action icon-action-${tone} ${className}`}
          aria-label={label}
          {...props}
        >
          <Icon size={17} strokeWidth={2} aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  )
}
