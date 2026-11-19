import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  Calculator,
  ChartNoAxesCombined,
  Factory,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import logo from '../public/img/near_creation_3d.svg'

export type SidebarPage = 'dashboard' | 'materials' | 'pricing' | 'products' | 'settings'
type Item = { id: SidebarPage; label: string; icon: LucideIcon; enabled: boolean }

const items: Item[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { id: 'dashboard', label: 'Financeiro', icon: Wallet, enabled: false },
  { id: 'dashboard', label: 'Despesas e compras', icon: ReceiptText, enabled: false },
  { id: 'materials', label: 'Materiais e insumos', icon: Boxes, enabled: true },
  { id: 'pricing', label: 'Precificação', icon: Calculator, enabled: true },
  { id: 'dashboard', label: 'Produção', icon: Factory, enabled: false },
  { id: 'products', label: 'Produtos e estoque', icon: Package, enabled: true },
  { id: 'dashboard', label: 'Vendas e pedidos', icon: ShoppingBag, enabled: false },
  { id: 'dashboard', label: 'Relatórios', icon: ChartNoAxesCombined, enabled: false },
  { id: 'settings', label: 'Configurações', icon: Settings2, enabled: true },
]

export default function Sidebar({
  page,
  open,
  onNavigate,
  onClose,
}: {
  page: SidebarPage
  open: boolean
  onNavigate: (page: SidebarPage) => void
  onClose: () => void
}) {
  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img className="brand-logo" src={logo} alt="Logo NEAR Creation 3D" />
          <div>
            <strong>NEAR CREATION</strong>
            <small>3D · GESTÃO CRIATIVA</small>
          </div>
        </div>
        <div className="sidebar-caption">ESPAÇO DE TRABALHO</div>
        <nav>
          {items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              disabled={!item.enabled}
              onClick={
                item.enabled
                  ? () => {
                      onNavigate(item.id)
                      onClose()
                    }
                  : undefined
              }
              className={`nav-item ${page === item.id && item.enabled ? 'active' : ''}`}
            >
              <span className="nav-icon">
                <item.icon size={18} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
              {!item.enabled && <span className="soon-dot" title="Em breve" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="local-badge">
            <span aria-hidden="true">●</span>
            Salvo neste navegador
          </div>
          <p>MVP · versão 0.1</p>
        </div>
      </aside>
      {open && <button className="menu-scrim" aria-label="Fechar menu" onClick={onClose} />}
    </>
  )
}
