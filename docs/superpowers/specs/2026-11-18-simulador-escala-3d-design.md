# Simulador de escala 3D

## Intenção

Permitir que a precificação de uma peça seja simulada em outros tamanhos e compartilhada com o cliente por um link independente da área administrativa.

## Objetivos

- Relacionar tamanho linear, percentual, filamento e tempo por uma proporção cúbica.
- Permitir que tamanho, percentual ou preço conduzam o recálculo dos demais valores.
- Oferecer um cálculo cúbico simples e um cálculo detalhado que preserve custos fixos, taxas e margem da precificação original.
- Reutilizar o mesmo componente em `/pricing` e em uma página pública `/simulador`.
- Transportar a simulação em um único parâmetro codificado, evitando a leitura casual da composição da precificação.

## Fora do escopo

- Prometer precisão de fatiador: geometria, paredes, preenchimento e configurações podem alterar consumo e tempo reais.
- Oferecer sigilo criptográfico em uma aplicação estática. O payload codificado é ofuscação, não proteção contra análise técnica.
- Persistir a simulação no banco local ou alterar fichas e produtos já salvos.

## Abordagens consideradas

1. **Escala cúbica completa:** preço, filamento e tempo variam por `fator³`. É previsível, mas trata todos os custos como variáveis.
2. **Recálculo detalhado:** filamento, energia e impressora variam por `fator³`; mão de obra, acessórios e embalagem permanecem fixos. Taxas, lote e margem são reaplicados.
3. **Modelo misto — escolhido:** disponibilizar os dois métodos e guardar no link qual deles inicia selecionado.

## Comportamento

- A escala original é 100% por padrão, mas pode representar outro percentual do modelo de origem.
- `fator = percentual simulado / percentual original` e `tamanho = tamanho original × fator`.
- Filamentos e tempo estimado sempre variam por `fator³`.
- No método simples, `preço = preço original × fator³`.
- No método detalhado, o custo unitário escalado é a soma dos custos fixos com os custos variáveis multiplicados por `fator³`; a fórmula original de margem/acréscimo e taxas produz o preço.
- Alterar o preço usa a fórmula inversa para encontrar fator, percentual e tamanho.
- Valores apresentados e editáveis na simulação são arredondados para no máximo duas casas decimais, mantendo a precisão interna do cálculo.
- Um preço detalhado abaixo do mínimo matemático produz uma mensagem com o menor preço possível.
- Tempo e filamento são apresentados como estimativas, acompanhados de um aviso sobre as limitações do modelo.

## Link compartilhável

- A rota pública `/simulator` não exibe sidebar, topbar ou dados do ateliê; `/simulador` permanece como alias para links antigos.
- Um único parâmetro `n` contém JSON versionado em Base64 URL-safe.
- Os campos internos usam codinomes curtos e incluem referência de tamanho, preço, filamentos, tempo, custos fixos e variáveis, lote, taxas, margem, modo de precificação, método de simulação e percentual atual.
- Payloads inválidos ou incompatíveis exibem uma mensagem segura, sem quebrar a aplicação.

## Visibilidade para o cliente

- Em `/pricing`, os cartões de filamento e tempo originais funcionam como seletores do que será exibido no link.
- Um cartão desativado permanece visível para o administrador com opacidade reduzida.
- Ocultar filamento remove do payload compartilhado seus nomes e pesos e esconde referências, total e detalhamento estimado na página pública.
- Ocultar tempo remove do payload o tempo original e esconde referências e estimativa na página pública.
- O método escolhido permanece no payload e governa a simulação, mas seu seletor e sua explicação não são exibidos ao cliente.
- A nova versão do payload registra as opções de visibilidade; links da versão anterior continuam mostrando todos os campos.
- A escala original é registrada no payload; versões anteriores assumem 100%.

## Critério de conclusão

O trabalho estará concluído quando os dois métodos produzirem resultados diretos e inversos consistentes, o componente funcionar na precificação e na rota pública, o link reproduzir a simulação e os testes, lint e build passarem.
