import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import BorderGlow from './components/BorderGlow'

export default function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="app-modal-overlay" />
      <Dialog.Content className="app-modal" aria-describedby={undefined}>
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
            <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<Dialog.Title>{title}</Dialog.Title></div>
            <Dialog.Close className="app-modal-close" aria-label="Fechar"><X size={18} aria-hidden="true" /></Dialog.Close>
          </div>
          {children}
        </BorderGlow>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
