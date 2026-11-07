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
  previa.css          Tabela de prévia e destaque das trocas
js/
  config.js           Constantes (NOMES dos dias, MESES)
  utils.js            Utilitários genéricos ($, mod)
  calendario.js       Ano bissexto, dia da semana, conversão dia-do-ano → data
  estado.js           Variáveis de estado compartilhadas (linhas, trocas)
  rodizio.js          REGRA do rodízio (lógica pura): calcularRodizio, filtrarPorMeses
  ui-dias.js          Checkboxes dos dias de culto
  ui-organistas.js    Campos dinâmicos de organistas (adicionar/remover)
  ui-meses.js         Período e meses selecionados
  previa.js           Tabela de prévia e trocas manuais
  controlador.js      Valida o formulário e orquestra a geração (gerar)
  zip.js              CRC32 e empacotador ZIP sem compressão
  xlsx.js             Montagem do .xlsx (planilha, estilos, pacote)
  download.js         Salvamento do arquivo
  main.js             Inicialização e eventos
```

## Onde mexer

- **Mudar a lógica do rodízio** → `js/rodizio.js`
- **Mudar o visual da planilha exportada** → `js/xlsx.js`
- **Mudar cores/aparência da página** → `css/variaveis.css` e demais `css/`
- **Mudar validações e mensagens de erro** → `js/controlador.js`

## Observação

Os scripts são carregados em ordem por `<script>` comuns (não `import`), para
que o sistema continue funcionando ao abrir o arquivo por duplo clique.
Se adicionar um arquivo JS novo, inclua-o em `index.html` depois dos que ele usa.
