import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import Sidebar, { type SidebarPage } from './Sidebar'
import Topbar from './Topbar'
import { useAppStore } from '../store/useAppStore'

const labels: Record<SidebarPage, string> = {
  dashboard: 'Dashboard',
  materials: 'Materiais e insumos',
  pricing: 'Precificação',
  products: 'Produtos e estoque',
  settings: 'Configurações',
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { loading, loadError, notice, initialize, setNotice } = useAppStore()
  const segment = pathname
    .replace(/^\/near-creation(?=\/|$)/, '')
    .replace(/^\//, '')
    .split('/')[0]
  const page = (
    ['materials', 'pricing', 'products', 'settings'].includes(segment) ? segment : 'dashboard'
  ) as SidebarPage

  useEffect(() => {
    void initialize()
  }, [initialize])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice, setNotice])

  if (loading)
    return (
      <main className="load-error">
        <h1>Carregando seu ateliê...</h1>
      </main>
    )
  if (loadError)
    return (
      <main className="load-error">
        <h1>Não foi possível abrir seus dados</h1>
        <p>{loadError}</p>
        <p>
          Os dados do navegador foram preservados. Verifique o armazenamento antes de continuar.
        </p>
      </main>
    )

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        open={menuOpen}
        onNavigate={(target) => {
          void navigate({ to: target === 'dashboard' ? '/' : `/${target}` })
          window.scrollTo(0, 0)
        }}
        onClose={() => setMenuOpen(false)}
      />
      <div className="main-area">
        <Topbar label={labels[page]} onMenu={() => setMenuOpen(true)} />
        <main className="content">{children}</main>
      </div>
      <div aria-live="polite">
        {notice && (
          <div className="toast" role="status">
            {notice}
            <button onClick={() => setNotice('')} aria-label="Fechar aviso">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
