/* Controlador: lê o formulário, valida, chama o rodízio e atualiza a prévia */

function erro(t) { $("msg").textContent = t; }

function gerar() {
  $("msg").textContent = "";
  const vet = diasEscolhidos();
  const nomes = nomesDigitados();
  const ano = parseInt($("ano").value);

  if (!vet.length) return erro("Marque ao menos um dia de culto.");
  if (!nomes.length) return erro("Informe ao menos uma organista.");
  if (!ano || ano < 1) return erro("Informe um ano válido.");

  const sel = mesesEscolhidos();
  if (!sel.length) return erro("Selecione ao menos um mês.");

  const resultado = gerarRodizio(vet, nomes, ano, excluidos);
  const linhas = filtrarPorMeses(resultado.linhas, sel);
  if (!linhas.length) return erro("Todos os dias do período foram excluídos.");

  // descarta trocas de organistas que não estão mais na lista
  Object.keys(trocas).forEach(k => { if (!nomes.includes(trocas[k])) delete trocas[k]; });
  diasAtuais = vet;
  linhasAtuais = linhas;
  nomesAtuais = nomes;
  relatorioAtual = resultado.relatorio;
  renderizar();
  renderizarRelatorio();
}
