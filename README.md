# NEAR CREATION 3D

MVP local para gestão de materiais, custos e precificação de impressão 3D.

A interface usa React, Vite e Tailwind CSS. Os ícones usam `lucide-react` e os modais usam Radix Dialog. A paleta da marca está definida em `src/palette.css` com `@theme`; o SVG da logo é importado de `src/public/img/near_creation_3d.svg`.

## Executar

```bash
npm install
npm run dev
```

`npm run build` valida o TypeScript e gera a SPA. `npm test` executa os testes das regras de negócio.

Os dados ficam exclusivamente no `localStorage` do navegador, sob a chave `near-creation-3d:v5`. Dados das versões anteriores são lidos e migrados sem apagar as chaves antigas. A interface `DataRepository` em `src/storage.ts` concentra o acesso e permite substituir a implementação no futuro. Não há sincronização entre navegadores ou dispositivos.

É possível cadastrar várias impressoras, cada uma com aquisição, manutenção, vida útil e consumo próprios. A calculadora usa a impressora selecionada na ficha e preserva o custo calculado em cada versão do produto.

Cada ficha pode incluir vários filamentos, com peso por unidade para cada um. O custo dos filamentos é somado usando o custo médio de aquisição de cada material.

Em Materiais e insumos, o cadastro e as movimentações abrem em modais. A edição direta do saldo ou do custo médio define um novo ponto de partida: movimentações anteriores deixam de afetar o inventário, enquanto entradas e saídas posteriores podem ser editadas ou excluídas e recalculam saldo e custo médio. Materiais com cor exibem uma faixa colorida na linha do inventário.
