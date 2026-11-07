/* Regra do rodízio (lógica pura: não lê nem altera a tela) */

// Gera as linhas [dia, data, organista] do ano inteiro.
//   vet   = dias da semana escolhidos, em ordem crescente (0 = DOM ... 6 = SAB)
//   nomes = organistas na ordem informada
function calcularRodizio(vet, nomes, ano) {
  const dias = vet.length;
  const org = nomes.length;
  const passo = Math.max(1, Math.floor(org / dias));
  const max = bissexto(ano) ? 366 : 365;
  const linhas = [];

  // o ciclo (a "semana" do rodízio) começa no Dia 1 da lista e dura 7 dias.
  // d0 é a primeira ocorrência do Dia 1 no ano; os dias de 1º de janeiro até d0-1
  // pertencem ao ciclo anterior (semana = -1), então nenhuma data é perdida
  // e a ordem dos dias escolhidos não altera quais datas aparecem na planilha.
  // A posição do dia na lista (j) define o deslocamento dele no rodízio.
  let d0 = 1;
  while (d0 <= max && diaAtual(d0, ano) !== vet[0]) d0++;

  for (let dia = 1; dia <= max; dia++) {
    const j = vet.indexOf(diaAtual(dia, ano));
    if (j < 0) continue;
    const semana = Math.floor((dia - d0) / 7);
    linhas.push([NOMES[vet[j]], dataDoDia(dia, ano), nomes[mod(semana - passo * j, org)]]);
  }
  return linhas;
}

// Mantém só as linhas dos meses selecionados (1 a 12).
// O rodízio é calculado para o ano todo e depois filtrado,
// assim a sequência das organistas continua igual em qualquer período.
function filtrarPorMeses(linhas, meses) {
  return linhas.filter(l => meses.includes(parseInt(l[1].slice(3, 5), 10)));
}
