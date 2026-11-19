# Restauração do layout e das movimentações

## Intenção

Corrigir as regressões introduzidas pela separação do aplicativo em páginas, recuperando a hierarquia visual, a densidade e os fluxos funcionais da versão anterior sem desfazer a nova arquitetura de rotas, componentes e store.

## Objetivos

- Restaurar em todas as páginas os títulos e subtítulos internos que identificavam listagens e seções, incluindo `SALDOS ATUAIS / Seu inventário` e os contadores ou ações associados.
- Recuperar a apresentação e a densidade anteriores: espaçamentos, tamanhos de controles, tabelas, painéis e campos relacionados na mesma linha quando houver largura disponível.
- Restaurar o histórico de movimentações como tabela, com as setas simples junto à data, sem bloco, fundo ou contêiner colorido; apenas a cor do próprio ícone e da quantidade diferencia entrada e saída.
- Em Precificação, manter `Quantidade no lote` e `Canal de venda` lado a lado, como na versão anterior.
- Fazer o cadastro e a edição de movimentações funcionarem pelos botões geral e contextual.
- Exibir mensagens claras quando uma movimentação for inválida, inclusive estoque negativo e campos obrigatórios.
- Preservar o comportamento responsivo: duas colunas no desktop e empilhamento em telas estreitas.

## Fora do escopo

- Alterar regras de cálculo de estoque, custo médio ou precificação que já funcionavam na versão anterior.
- Desfazer a divisão atual em rotas, páginas, componentes e store Zustand.
- Criar uma identidade visual nova.

## Restrições

- O diretório contém uma refatoração ainda não consolidada; as mudanças devem ser pontuais e não sobrescrever trabalho não relacionado.
- A versão em `HEAD` será a referência de comportamento e composição visual, adaptada à estrutura atual.
- Os textos devem permanecer em português e com codificação UTF-8 correta.

## Abordagens consideradas

1. **Correção mínima:** recolocar apenas o título do inventário, alinhar os dois campos citados e corrigir o ID da movimentação. É mais rápida, mas deixaria outras perdas de títulos, tabelas e densidade causadas pela mesma refatoração.
2. **Restauração completa e adaptada — escolhida:** comparar cada página atual com a versão anterior, recuperar seus cabeçalhos, agrupamentos, tabelas e espaçamentos, mantendo a arquitetura nova. Resolve a regressão de forma consistente e reduz correções fragmentadas futuras.

## Implementação proposta

- Extrair novamente um componente reutilizável de cabeçalho de seção, equivalente ao antigo `SectionHeading`.
- Reaplicar os cabeçalhos e metadados das seções nas páginas de materiais, produtos, configurações, precificação e dashboard onde tenham sido perdidos.
- Restaurar classes e estruturas de layout da versão anterior, evitando regras globais mais largas que mudem telas não relacionadas.
- Remover os cartões coloridos adicionados ao redor das setas de movimentação e recuperar as colunas antigas de data, material, tipo, quantidade, custo, observação e ações.
- Corrigir a seleção inicial da movimentação para persistir o primeiro material quando ela for aberta pelo botão geral.
- Restaurar as validações e avisos do fluxo antigo, sem falhas silenciosas.
- Adicionar testes para a seleção inicial e o salvamento de entradas e saídas, além de validar build, testes existentes e comportamento responsivo principal.

## Critério de conclusão

O trabalho estará concluído quando as páginas recuperarem a hierarquia e densidade da versão anterior, os campos relacionados voltarem a compartilhar linhas no desktop, e movimentações válidas puderem ser salvas e editadas com erros inválidos comunicados ao usuário.
