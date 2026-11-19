import { ArrowUpRight, Boxes, CircleDollarSign, PackageCheck, TriangleAlert } from 'lucide-react'
import { materialBalance, money, number } from '../lib/domain'
import logo from '../public/img/near_creation_3d.svg'
import ElectricBorder from '../components/ElectricBorder'
import SectionHeading from '../components/SectionHeading'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from '@tanstack/react-router'

export default function Dashboard() {
  const { db } = useAppStore()
  const navigate = useNavigate()
  const go = (target: 'dashboard' | 'materials' | 'pricing' | 'products' | 'settings') => {
    void navigate({ to: target === 'dashboard' ? '/' : `/${target}` })
    window.scrollTo(0, 0)
  }
  const materialSummary = db.materials.map((material) => ({
    material,
    balance: materialBalance(material.id, db.movements, material.stockBaseline),
  }))
  const stockValue = materialSummary.reduce((sum, item) => sum + item.balance.value, 0)
  const lowMaterials = materialSummary.filter(
    (item) => item.material.minimum > 0 && item.balance.quantity < item.material.minimum,
  )
  return (
    <>
      <ElectricBorder
        color="#8860D8"
        speed={1}
        chaos={0.5}
        spread={0.6}
        strands={3}
        thickness={1.5}
        borderRadius={24}
      >
        <div className="hero">
          <div>
            <span className="hero-kicker">SEU ATELIÊ EM ORDEM</span>
            <h1>
              Bem-vindo à sua
              <br />
              <em>central de criação.</em>
            </h1>
            <p>Organize seus insumos, conheça seus custos e precifique com confiança.</p>
            <button className="button button-light" onClick={() => go('pricing')}>
              Nova precificação <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
          <div className="hero-art ">
            <span className="orbit orbit-a" />
            <span className="orbit orbit-b" />
            <img className="hero-logo backdrop-blur-xs" src={logo} alt="" aria-hidden="true" />
          </div>
        </div>
      </ElectricBorder>
      <SectionHeading
        eyebrow="VISÃO GERAL"
        title="O que está acontecendo"
        text="Acompanhe os dados disponíveis nesta primeira versão."
      />
      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon teal">
            <CircleDollarSign aria-hidden="true" />
          </span>
          <small>Valor dos materiais em estoque</small>
          <strong>{money(stockValue)}</strong>
          <span>Custo de aquisição atual</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon orange">
            <PackageCheck aria-hidden="true" />
          </span>
          <small>Produtos precificados</small>
          <strong>{db.products.length}</strong>
          <span>Com ficha técnica salva</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon pink">
            <Boxes aria-hidden="true" />
          </span>
          <small>Materiais cadastrados</small>
          <strong>{db.materials.length}</strong>
          <span>
            {db.movements.filter((m) => m.type === 'purchase').length} entradas registradas
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-icon yellow">
            <TriangleAlert aria-hidden="true" />
          </span>
          <small>Abaixo do mínimo</small>
          <strong>{lowMaterials.length}</strong>
          <span>Materiais que pedem atenção</span>
        </div>
      </div>
      <div className="dashboard-bottom">
        <div className="panel">
          <SectionHeading eyebrow="PRÓXIMOS PASSOS" title="Comece por aqui" />
          <div className="step-list">
            <button onClick={() => go('materials')}>
              <span>01</span>
              <div>
                <strong>Cadastre seus materiais</strong>
                <small>Filamentos, acessórios e embalagens</small>
              </div>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
            <button onClick={() => go('settings')}>
              <span>02</span>
              <div>
                <strong>Configure seus custos</strong>
                <small>Impressora, energia e canais de venda</small>
              </div>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
            <button onClick={() => go('pricing')}>
              <span>03</span>
              <div>
                <strong>Precifique um produto</strong>
                <small>Veja custo e preço por unidade e lote</small>
              </div>
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="panel attention">
          <SectionHeading eyebrow="ESTOQUE" title="Pontos de atenção" />
          {lowMaterials.length ? (
            lowMaterials.map(({ material, balance }) => (
              <div className="attention-row" key={material.id}>
                <span className="alert-dot" />
                <div>
                  <strong>{material.name}</strong>
                  <small>
                    {number(balance.quantity, 3)} {material.unit} disponíveis · mínimo{' '}
                    {number(material.minimum, 3)} {material.unit}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <div className="quiet-message">Nenhum material abaixo do estoque mínimo.</div>
          )}
        </div>
      </div>
    </>
  )
}
