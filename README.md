# NEAR CREATION 3D

MVP local para gestão de materiais, custos e precificação de impressão 3D.

## Executar

```bash
npm install
npm run dev
```

`npm run build` valida o TypeScript e gera a SPA. `npm test` executa os testes das regras de negócio.

Os dados ficam exclusivamente no `localStorage` do navegador, sob a chave `near-creation-3d:v1`. A interface `DataRepository` em `src/storage.ts` concentra o acesso e permite substituir a implementação no futuro. Não há sincronização entre navegadores ou dispositivos.
