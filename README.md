# Rodízio Automático: Organistas CCB

Gerador de rodízio de organistas com exportação para planilha `.xlsx`.
Funciona abrindo `index.html` direto no navegador (sem servidor, sem dependências).

## Estrutura

```
index.html            Estrutura da página (HTML) e ordem de carregamento dos scripts
assets/logo.png       Logo (antes embutida em base64 no HTML)
css/
  variaveis.css       Cores e áreas seguras do celular
  base.css            Reset, tipografia, layout geral
  formulario.css      Cartões, campos, dias, meses, lista de organistas
  botoes.css          Botões e mensagem de erro
  previa.css          Tabela de prévia, destaque das trocas e resumo
  relatorio.css       Selo de classificação e seções do relatório
  exclusao.css        Mini-calendário de dias excluídos
js/
  config.js           Constantes (NOMES dos dias, MESES)
  utils.js            Utilitários genéricos ($, mod)
  calendario.js       Ano bissexto, dia da semana, conversão dia-do-ano → data
  estado.js           Variáveis de estado compartilhadas (linhas, trocas)
  rodizio-analise.js  Algoritmo, parte 1: datas válidas, viabilidade matemática (N_min), distribuições iniciais
  rodizio-busca.js    Algoritmo, parte 2: níveis 1/2/3 (busca exaustiva e programação dinâmica) e escolha de quem toca
  rodizio.js          Algoritmo, parte 3: fluxo geral (gerarRodizio), relatório final, filtrarPorMeses
  ui-dias.js          Checkboxes dos dias de culto
  ui-organistas.js    Campos dinâmicos de organistas (adicionar/remover)
  ui-meses.js         Período e meses selecionados
  ui-exclusao.js      Mini-calendário para excluir dias do rodízio
  previa.js           Tabela de prévia, trocas manuais e resumo por organista
  relatorio.js        Relatório do algoritmo na tela (classificação, violações, justificativa)
  controlador.js      Valida o formulário e orquestra a geração (gerar)
  zip.js              CRC32 e empacotador ZIP sem compressão
  xlsx.js             Montagem do .xlsx (planilha, estilos, pacote)
  download.js         Salvamento do arquivo
  main.js             Inicialização e eventos
tests/
  verificacao.js      Prova do algoritmo contra força bruta + auditoria (node tests/verificacao.js)
  simulacao.js        Simulação do rodízio em centenas de combinações (node tests/simulacao.js)
```

## Como o rodízio funciona

Implementa a **Especificação 1.0** do algoritmo de rodízio.

Cada organista tem uma *posição*: o próximo dia da sequência circular dos dias de culto
(ex.: DOM → QUA → SAB → DOM...). Ao tocar, avança uma posição; ao não tocar, fica onde está.
Uma data excluída não existe para o algoritmo (não consome a vez de ninguém).

1. **Datas válidas**: dias de culto do ano, menos as exclusões. Um dia da semana sem nenhuma data
   válida no ano sai da sequência.
2. **Viabilidade matemática** (seção 9.1): `L_i = max_t(C_i(t) - C_{i-1}(t), 0)` e `N_min = Σ L_i`.
   Com `N ≥ N_min` dá para preencher todas as datas respeitando as sequências.
3. **Níveis 1 e 2** (sequências respeitadas): examina *todas* as distribuições iniciais viáveis
   (busca exaustiva, não tentativa isolada). Se alguma evita trabalhos em dias seguidos, o rodízio
   é **perfeito**; senão é **imperfeito**, com o menor número possível de dias seguidos.
4. **Nível 3** (`N < N_min`): **contingência**. Programação dinâmica sobre todos os estados minimiza
   primeiro as quebras de sequência e depois os dias seguidos. Depois de uma quebra, o próximo dia da
   organista parte do dia em que ela realmente tocou.
5. **Quem toca em cada data**: entre as que aguardam o dia, a que está há mais tempo sem tocar;
   empate, ordem alfabética. A que tocou na véspera só é escolhida se for a única opção. Em caso de
   quebra, só se escolhe de onde isso não piora o futuro (verificação de datas futuras).
6. **Desempate entre distribuições iniciais equivalentes**: menor diferença de vezes entre as
   organistas, maior tempo mínimo sem tocar, intervalos mais uniformes.
7. **Relatório final** (tela): classificação, violações por regra, distribuição inicial, dias desde o
   último trabalho, ordem real dos dias de cada organista, exceções e justificativa matemática.

Decisões onde a especificação é omissa:

- "Datas consecutivas" = dias consecutivos do calendário (ex.: DOM e SEG), como diz a seção 9.2.
- O período do algoritmo é o **ano inteiro**; os meses escolhidos só filtram a prévia e a planilha,
  e as exclusões fora do período continuam valendo (a sequência é a mesma em qualquer período).
- Estado inicial ("dias desde o último trabalho"): o rodízio é tratado como se já estivesse em
  andamento antes de 1º de janeiro, e as organistas são numeradas em ordem alfabética: a mais
  alfabeticamente anterior é a que espera há mais tempo.
- Muitas organistas (limites no topo de `js/rodizio-busca.js`): a busca do nível 2 examina só as
  distribuições mais equilibradas e a do nível 3 usa uma solução aproximada. O relatório avisa
  quando o mínimo deixa de ser comprovado.

Rode `node tests/verificacao.js` depois de mexer no algoritmo: ele compara o resultado com uma
força bruta (todas as combinações) em milhares de casos pequenos e audita o relatório.
`node tests/simulacao.js` mede intervalos e diferença de vezes em centenas de combinações.

## Onde mexer

- **Mudar a lógica do rodízio** → `js/rodizio-analise.js`, `js/rodizio-busca.js` e `js/rodizio.js` (e conferir com `tests/verificacao.js`)
- **Mudar o relatório do algoritmo** → `js/rodizio.js` (dados) e `js/relatorio.js` (tela)
- **Mudar o calendário de exclusão** → `js/ui-exclusao.js` e `css/exclusao.css`
- **Mudar o visual da planilha exportada** → `js/xlsx.js`
- **Mudar cores/aparência da página** → `css/variaveis.css` e demais `css/`
- **Mudar validações e mensagens de erro** → `js/controlador.js`

## Observação

Os scripts são carregados em ordem por `<script>` comuns (não `import`), para
que o sistema continue funcionando ao abrir o arquivo por duplo clique.
Se adicionar um arquivo JS novo, inclua-o em `index.html` depois dos que ele usa.
