import { useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogClose, DialogTitle } from './ui/dialog'
import { X } from 'lucide-react'
import BorderGlow from './BorderGlow'

export default function Modal({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: ReactNode
}) {
  const [returnFocus] = useState(() => document.activeElement)
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="app-modal max-w-none gap-0 rounded-2xl bg-transparent p-0 ring-0 sm:max-w-none"
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          if (returnFocus instanceof HTMLElement && returnFocus.isConnected) {
            event.preventDefault()
            returnFocus.focus()
          }
        }}
      >
        <BorderGlow
          className="app-modal-glow"
          edgeSensitivity={30}
          glowColor="263 62 72"
          backgroundColor="#121522"
          borderRadius={16}
          glowRadius={24}
          glowIntensity={0.65}
          coneSpread={25}
          animated={false}
          fillOpacity={0.18}
          colors={['#8860D8', '#3868D9', '#DB55AD']}
        >
          <div className="app-modal-header">
            <div>
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogClose className="app-modal-close" aria-label="Fechar">
              <X size={18} aria-hidden="true" />
            </DialogClose>
          </div>
          {children}
        </BorderGlow>
      </DialogContent>
    </Dialog>
  )
}
