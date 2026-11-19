import { Menu } from 'lucide-react'

export default function Topbar({ label, onMenu }: { label: string; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="menu-button" aria-label="Abrir menu" onClick={onMenu}>
        <Menu size={20} aria-hidden="true" />
      </button>
      <div className="breadcrumb">
        Visão geral <span>/</span> <strong>{label}</strong>
      </div>
      <div className="topbar-right">
        <span className="today">
          {new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }).format(new Date())}
        </span>
        <div className="avatar">NC</div>
      </div>
    </header>
  )
}
