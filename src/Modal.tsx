import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export default function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="app-modal-overlay" />
      <Dialog.Content className="app-modal" aria-describedby={undefined}>
        <div className="app-modal-header">
          <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<Dialog.Title>{title}</Dialog.Title></div>
          <Dialog.Close className="app-modal-close" aria-label="Fechar"><X size={18} aria-hidden="true" /></Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
