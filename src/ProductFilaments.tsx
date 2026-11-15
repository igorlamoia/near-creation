import { type Database, type FilamentLine, number } from './domain'
import { MaterialColor } from './MaterialColorInput'

export default function ProductFilaments({ db, filaments }: { db: Database; filaments: FilamentLine[] }) {
  return <div className="product-filaments"><strong>Filamentos da ficha</strong>{filaments.map((line, index) => {
    const material = db.materials.find(item => item.id === line.materialId)
    return <div key={`${line.materialId}-${index}`}><span>{material?.name || 'Material não encontrado'}{material?.color && <span className="product-filament-color"><MaterialColor color={material.color} /></span>}</span><span>{number(line.weightGrams, 3)} g/un.</span></div>
  })}</div>
}
