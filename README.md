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
  exclusao.css        Mini-calendário de dias excluídos
js/
  config.js           Constantes (NOMES dos dias, MESES)
  utils.js            Utilitários genéricos ($, mod)
  calendario.js       Ano bissexto, dia da semana, conversão dia-do-ano → data
  estado.js           Variáveis de estado compartilhadas (linhas, trocas)
  rodizio.js          REGRA do rodízio (lógica pura): deslocamentos, calcularRodizio, filtrarPorMeses
  ui-dias.js          Checkboxes dos dias de culto
  ui-organistas.js    Campos dinâmicos de organistas (adicionar/remover)
  ui-meses.js         Período e meses selecionados
  ui-exclusao.js      Mini-calendário para excluir dias do rodízio
  previa.js           Tabela de prévia, trocas manuais e resumo por organista
  controlador.js      Valida o formulário e orquestra a geração (gerar)
  zip.js              CRC32 e empacotador ZIP sem compressão
  xlsx.js             Montagem do .xlsx (planilha, estilos, pacote)
  download.js         Salvamento do arquivo
  main.js             Inicialização e eventos
tests/
  simulacao.js        Simulação do rodízio (node tests/simulacao.js)
```

## Como o rodízio funciona

Cada organista segue uma sequência fixa de dias (ex.: DOM, SEG, QUI, DOM...).
O ponto de partida é o rodízio ideal sem exclusões, com os intervalos o mais
parecidos possível. Depois o algoritmo percorre as datas uma a uma: em cada
data, entre as organistas que estão "na vez" daquele dia, toca a que está há
mais tempo sem tocar. Uma data excluída não consome a vez de ninguém; a
organista apenas toca na próxima data do mesmo dia. A ordem só é quebrada se
ninguém estiver na vez ou se a da vez fosse tocar cedo demais. As quebras
aparecem no "Resumo por organista".

Os limites ficam no topo de `js/rodizio.js` (PESO_QUEBRA, PESO_CEDO, FRACAO_CEDO).
Rode `node tests/simulacao.js` depois de mexer neles. Ele mede intervalos,
quebras de ordem e diferença de vezes em centenas de combinações.

## Onde mexer

- **Mudar a lógica do rodízio** → `js/rodizio.js` (e conferir com `tests/simulacao.js`)
- **Mudar o calendário de exclusão** → `js/ui-exclusao.js` e `css/exclusao.css`
- **Mudar o visual da planilha exportada** → `js/xlsx.js`
- **Mudar cores/aparência da página** → `css/variaveis.css` e demais `css/`
- **Mudar validações e mensagens de erro** → `js/controlador.js`

## Observação

Os scripts são carregados em ordem por `<script>` comuns (não `import`), para
que o sistema continue funcionando ao abrir o arquivo por duplo clique.
Se adicionar um arquivo JS novo, inclua-o em `index.html` depois dos que ele usa.
