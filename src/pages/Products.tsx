import { useState } from 'react'
import { Eye, EyeOff, Package, Plus, RotateCcw } from 'lucide-react'
import { type Product, money } from '../lib/domain'
import logo from '../public/img/near_creation_3d.svg'
import ProductFilaments from '../components/ProductFilaments'
import SpotlightCard from '../components/SpotlightCard'
import IconAction from '../components/IconAction'
import Empty from '../components/Empty'
import { blankSheet } from '../lib/blankSheet'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from '@tanstack/react-router'
import { usePricingDraft } from '../store/usePricingDraft'

export default function Products() {
  const { db } = useAppStore()
  const navigate = useNavigate()
  const go = (target: 'dashboard' | 'materials' | 'pricing' | 'products' | 'settings') => {
    void navigate({ to: target === 'dashboard' ? '/' : `/${target}` })
    window.scrollTo(0, 0)
  }
  const { setSheet, setProductDraft, setEditingProduct } = usePricingDraft()
  const [productDetail, setProductDetail] = useState('')
  function recalculate(product: Product) {
    setEditingProduct(product.id)
    setProductDraft({
      name: product.name,
      sku: product.sku,
      category: product.category,
    })
    setSheet(structuredClone(product.quotes.at(-1)!.sheet))
    go('pricing')
  }
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Produtos e fichas</h1>
          <p>Consulte custos salvos e recalcule quando os materiais mudarem.</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setEditingProduct('')
            setProductDraft({ name: '', sku: '', category: '' })
            setSheet(blankSheet(db))
            go('pricing')
          }}
        >
          <Plus aria-hidden="true" /> Novo produto
        </button>
      </div>
      {db.products.length ? (
        <div className="product-grid">
          {db.products.map((product) => {
            const latest = product.quotes.at(-1)!
            return (
              <SpotlightCard
                key={product.id}
                className="product-spotlight-card"
                theme="dark"
                spotlightColor="#8860D8"
                intensity={0.15}
                spotlightSize={240}
                softness={0.7}
                shape="circle"
                borderGlow={0.6}
                proximity={80}
                smoothing={0.3}
                grain={0}
                ambient={false}
                flare
              >
                <div className="product-cover">
                  <img
                    className="product-cover-image product-cover-placeholder"
                    src={logo}
                    alt=""
                  />
                  <div className="product-cover-heading">
                    <div className="product-cover-identity">
                      <span className="product-cover-sku">{product.sku}</span>
                      <h3>{product.name}</h3>
                    </div>
                    <span className="product-cover-category">
                      {product.category || 'Sem categoria'}
                    </span>
                  </div>
                  <div className="product-cover-content">
                    <div className="product-cover-price">
                      <span>Preço / un.</span>
                      <strong>{money(latest.unitPrice)}</strong>
                    </div>
                    <span className="product-cover-cost">Custo {money(latest.unitCost)} / un.</span>
                  </div>
                </div>
                <div className="product-card-body">
                  <ProductFilaments db={db} filaments={latest.sheet.filaments} />
                  <div className="product-actions">
                    <span>
                      {product.quotes.length} {product.quotes.length === 1 ? 'versão' : 'versões'}
                    </span>
                    <div>
                      <IconAction
                        icon={RotateCcw}
                        label={`Recalcular ${product.name}`}
                        onClick={() => recalculate(product)}
                      />
                      <IconAction
                        icon={productDetail === product.id ? EyeOff : Eye}
                        label={
                          productDetail === product.id
                            ? `Ocultar histórico de ${product.name}`
                            : `Ver histórico de ${product.name}`
                        }
                        tone="blue"
                        onClick={() =>
                          setProductDetail(productDetail === product.id ? '' : product.id)
                        }
                      />
                    </div>
                  </div>
                  {productDetail === product.id && (
                    <div className="version-list">
                      {[...product.quotes].reverse().map((quote, index) => (
                        <div key={quote.id}>
                          <strong>Versão {product.quotes.length - index}</strong>
                          <small>
                            {new Date(quote.createdAt).toLocaleDateString('pt-BR')} · Custo{' '}
                            {money(quote.unitCost)} · Preço {money(quote.unitPrice)}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </SpotlightCard>
            )
          })}
        </div>
      ) : (
        <div className="panel">
          <Empty
            title="Seu catálogo começa aqui"
            description="Precifique um produto e salve sua ficha técnica para acompanhar futuras versões."
            action={
              <button className="button button-primary" onClick={() => go('pricing')}>
                <Plus aria-hidden="true" /> Criar primeira ficha
              </button>
            }
          />
        </div>
      )}
      <div className="info-banner">
        <span>
          <Package size={20} aria-hidden="true" />
        </span>
        <div>
          <strong>Controle de estoque de produtos chega na próxima etapa.</strong>
          <p>
            Por enquanto, esta área guarda fichas técnicas e preços. Nenhuma produção ou venda é
            registrada.
          </p>
        </div>
      </div>
    </>
  )
}
