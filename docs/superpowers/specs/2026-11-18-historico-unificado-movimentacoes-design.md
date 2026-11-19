# Histórico unificado de movimentações

## Intenção

Manter os inventários de materiais separados por categoria, mas apresentar todas as movimentações em um único histórico para facilitar a consulta cronológica.

## Escopo

- Preservar uma tabela de inventário para cada categoria de material.
- Remover o histórico repetido de dentro de cada categoria.
- Exibir uma única tabela de movimentações após todos os inventários.
- Manter a identificação do material, a ordem atual (mais recentes primeiro) e as ações de editar e excluir.
- Não alterar cadastro, saldos, custos ou persistência das movimentações.

## Abordagens consideradas

1. **Histórico global após os inventários (escolhida):** corresponde diretamente ao pedido e reutiliza a coleção global de movimentações já existente.
2. **Manter históricos por categoria com um filtro visual:** continuaria fragmentando a consulta e não atenderia ao objetivo de unir as movimentações.
3. **Unir também os inventários:** foi descartada porque os materiais devem continuar separados.

## Critério de conclusão

A página `/materials` mostra os inventários separados por categoria e exatamente um histórico contendo as movimentações de todos os materiais.
