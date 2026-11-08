# Rodízio Automático: Organistas CCB

Gerador de rodízio de organistas com exportação para planilha `.xlsx` e para `.pdf`.
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
  rodizio-busca.js    Algoritmo, parte 2: nível 1 (busca exaustiva), programação dinâmica dos níveis 2/3 e escolha de quem toca
  rodizio.js          Algoritmo, parte 3: fluxo geral (gerarRodizio), relatório final, filtrarPorMeses
  ui-dias.js          Checkboxes dos dias de culto
  ui-organistas.js    Campos dinâmicos de organistas (adicionar, remover, mudar posição, embaralhar e ordem alfabética)
  ui-meses.js         Período e meses selecionados
  ui-exclusao.js      Mini-calendário para excluir dias do rodízio
  previa.js           Tabela de prévia, trocas manuais e resumo por organista
  relatorio.js        Relatório do algoritmo na tela (classificação, violações, justificativa); fica na seção recolhida "Relatório completo", no fim da página, junto com o resumo por organista (cada tópico abre separadamente)
  controlador.js      Valida o formulário e orquestra a geração (gerar)
  zip.js              CRC32 e empacotador ZIP sem compressão
  xlsx.js             Montagem do .xlsx (planilha, estilos, pacote)
  pdf.js              Montagem do .pdf (tabela do rodízio, sem bibliotecas)
  download.js         Salvamento dos arquivos (planilha e PDF)
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

### Regras e ordem de prioridade

- **Fundamental**: nenhuma organista toca em dois **cultos seguidos**, isto é, em duas datas vizinhas da
  escala, não importa quantos dias corridos as separem (ex.: QUA 07/01 e SAB 10/01 são seguidos). Só é
  descumprida se for matematicamente impossível (ex.: uma única organista).
- **1** Respeitar a sequência individual de dias (cada organista toca em ciclos, sem quebras de ordem).
- **2** Tocar com o maior tempo possível desde a última vez (maior intervalo mínimo entre dois trabalhos
  da mesma organista; dentro do mesmo grupo, toca quem espera há mais tempo).
- **3** Trabalhos igualmente divididos (pouca ou nenhuma diferença entre quem mais e quem menos tocou).

Quando não dá para cumprir tudo, cede-se sempre a regra de menor prioridade.

### Etapas

1. **Datas válidas**: dias de culto do ano, menos as exclusões. Um dia da semana sem nenhuma data
   válida no ano sai da sequência.
2. **Viabilidade matemática** (seção 9.1): `L_i = max_t(C_i(t) - C_{i-1}(t), 0)` e `N_min = Σ L_i`.
   Com `N ≥ N_min` dá para preencher todas as datas respeitando as sequências.
3. **Nível 1, rodízio perfeito**: examina *todas* as distribuições iniciais viáveis (busca exaustiva, não
   tentativa isolada). Se alguma respeita as sequências **e** evita cultos seguidos, o rodízio é perfeito.
   Entre as distribuições perfeitas fica a de maior intervalo mínimo e, depois, a mais equilibrada.
4. **Níveis 2 e 3**: se o nível 1 é impossível (poucas organistas, ou exclusões que deixam alguém sozinha
   na vez de um dia), as sequências são quebradas só o necessário. Programação dinâmica sobre todos os
   estados minimiza primeiro os cultos seguidos e depois as quebras de sequência; depois de uma quebra,
   o próximo dia da organista parte do dia em que ela realmente tocou. A classificação é pelo resultado:
   **perfeito** (sem cultos seguidos nem quebras), **imperfeito** (sequências respeitadas, mas com cultos
   seguidos inevitáveis, só com uma organista) ou **contingência** (com quebras de sequência; na tela,
   o selo dos dois casos aparece como "Rodízio imperfeito", em cores diferentes).
5. **Quem toca em cada data**: entre as que aguardam o dia, a que está há mais tempo sem tocar; empate,
   ordem alfabética. A que tocou no culto anterior só é escolhida se for a única opção. Em caso de
   quebra, só se escolhe de onde isso não piora o futuro (verificação de datas futuras).
6. **Desempate entre distribuições iniciais equivalentes** (nesta ordem): menos cultos seguidos, menos
   quebras, maior tempo mínimo sem tocar, menor diferença de vezes entre as organistas, intervalos mais
   uniformes.
7. **Relatório final** (tela): classificação, violações por regra (em ordem de prioridade), menor
   intervalo entre cultos, distribuição inicial, ordem dos dias tocados por
   cada organista, exceções e justificativa matemática.

Decisões onde a especificação é omissa:

- "Cultos seguidos" = datas vizinhas da escala já sem as excluídas, independentemente de quantos dias
  corridos as separem (antes, só contavam dias consecutivos do calendário, como DOM e SEG).
- O período do algoritmo é o **ano inteiro**; os meses escolhidos só filtram a prévia e a planilha,
  e as exclusões fora do período continuam valendo (a sequência é a mesma em qualquer período).
- Estado inicial ("dias desde o último trabalho"): o rodízio é tratado como se já estivesse em
  andamento antes de 1º de janeiro, e as organistas são numeradas em ordem alfabética: a mais
  alfabeticamente anterior é a que espera há mais tempo.
- Muitas organistas (limites no topo de `js/rodizio-busca.js`): a busca do nível 1 examina só as
  distribuições mais equilibradas e a programação dinâmica dos níveis 2/3 é trocada por uma solução
  aproximada, que também evita cultos seguidos. O relatório avisa quando o mínimo deixa de ser comprovado.
- Com pouquíssimas organistas para os dias de culto (ex.: 3 organistas para DOM/QUA/SAB), evitar cultos
  seguidos obriga a quebrar sequências e, como a ordem de prioridade põe menos quebras acima do
  equilíbrio, as vezes podem ficar bem desiguais.

Rode `node tests/verificacao.js` depois de mexer no algoritmo: ele compara o resultado com uma
força bruta (todas as combinações) em centenas de casos pequenos (mínimo de cultos seguidos e, depois,
de quebras) e audita o relatório.
`node tests/simulacao.js` mede intervalos e diferença de vezes em centenas de combinações.

## Onde mexer

- **Mudar a lógica do rodízio** → `js/rodizio-analise.js`, `js/rodizio-busca.js` e `js/rodizio.js` (e conferir com `tests/verificacao.js`)
- **Mudar o relatório do algoritmo** → `js/rodizio.js` (dados) e `js/relatorio.js` (tela)
- **Mudar o calendário de exclusão** → `js/ui-exclusao.js` e `css/exclusao.css`
- **Mudar o visual da planilha exportada** → `js/xlsx.js` (e do PDF → `js/pdf.js`)
- **Mudar cores/aparência da página** → `css/variaveis.css` e demais `css/`
- **Mudar validações e mensagens de erro** → `js/controlador.js`

## Observação

Os scripts são carregados em ordem por `<script>` comuns (não `import`), para
que o sistema continue funcionando ao abrir o arquivo por duplo clique.
Se adicionar um arquivo JS novo, inclua-o em `index.html` depois dos que ele usa.
