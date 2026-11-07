/* Regra do rodízio (lógica pura: não lê nem altera a tela) */

// Ajustes da escolha da organista de cada data (custos em "dias de espera"):
//  - PESO_QUEBRA: custo de pular um passo da sequência da organista. É alto: a ordem
//    só é quebrada quando ninguém está na vez daquele dia (ex.: todas as datas daquele
//    dia foram excluídas) ou quando a organista da vez tocaria cedo demais.
//  - PESO_CEDO: custo, por dia, de tocar antes do limite de "cedo demais".
//  - FRACAO_CEDO: "cedo demais" = menos que essa fração do intervalo médio entre as
//    jogadas dela (e nunca menos que o menor intervalo do rodízio normal).
const PESO_QUEBRA = 100;
const PESO_CEDO = 20;
const FRACAO_CEDO = 0.5;

// Em quantas semanas (a partir da primeira) cada dia da lista é deslocado no ciclo.
// A organista p toca o dia j na semana s quando (s - desloc[j]) % n == p.
// Com isso cada data tem exatamente uma organista, e cada uma percorre os dias
// sempre na mesma ordem.
//   vet = dias da semana escolhidos, em ordem crescente (0 = DOM ... 6 = SAB)
//   n   = quantidade de organistas
function deslocamentos(vet, n) {
  const k = vet.length;
  // poucas organistas para muitos dias: elas se alternam dia a dia
  if (n < k) return vet.map((_, j) => j);

  // g[j] = dias entre o dia j e o seguinte da lista (o último volta ao primeiro)
  const g = vet.map((v, j) => j < k - 1 ? vet[j + 1] - v : 7 - (vet[k - 1] - vet[0]));
  // reparte as n-1 semanas extras do ciclo entre os trechos, sempre no trecho
  // mais curto, para os intervalos ficarem o mais parecidos possível
  const m = Array(k).fill(0);
  for (let x = 0; x < n - 1; x++) {
    let menor = 0;
    for (let j = 1; j < k; j++) if (g[j] + 7 * m[j] < g[menor] + 7 * m[menor]) menor = j;
    m[menor]++;
  }
  const desloc = [0];
  for (let j = 1; j < k; j++) desloc.push(desloc[j - 1] + m[j - 1]);
  return desloc;
}

// Gera as linhas [dia, data, organista] do ano inteiro, data por data.
//   vet       = dias da semana escolhidos, em ordem crescente
//   nomes     = organistas na ordem informada
//   excluidos = Set de datas "dd/mm/aaaa" sem culto (não entram no rodízio)
//
// Cada organista tem um estado: a sequência fixa de dias dela (ex.: DOM, SEG, QUI),
// em que ponto dessa sequência está e quando tocou pela última vez. O estado inicial
// vem do rodízio ideal "sem exclusões", como se ele já estivesse rodando antes de 1º de janeiro.
// Para cada data, só concorrem as organistas que estão "na vez" daquele dia; entre elas
// toca a que está há mais tempo sem tocar. Uma data excluída não consome a vez de ninguém:
// a organista continua esperando o mesmo dia da sequência dela, que nunca é embaralhada.
function calcularRodizio(vet, nomes, ano, excluidos = new Set()) {
  const k = vet.length, n = nomes.length;
  const max = bissexto(ano) ? 366 : 365;
  const desloc = deslocamentos(vet, n);

  // d0 = primeira ocorrência do 1º dia da lista no ano (início da "semana 0" do ciclo)
  let d0 = 1;
  while (diaAtual(d0, ano) !== vet[0]) d0++;

  // jogadas do rodízio ideal nas 2 semanas-ciclo anteriores ao ano (e na semana parcial inicial)
  const hist = nomes.map(() => []);
  for (let s = -2 * n; s < 0; s++)
    for (let j = 0; j < k; j++)
      hist[mod(s - desloc[j], n)].push([d0 + 7 * s + (vet[j] - vet[0]), j]);

  // menor intervalo entre duas jogadas da mesma organista no rodízio normal
  let minimo = Infinity;
  hist.forEach(P => P.forEach(([dia], x) => { if (x) minimo = Math.min(minimo, dia - P[x - 1][0]); }));

  // abaixo deste intervalo a organista tocaria "cedo demais" (nunca menos que o normal, nem
  // menos que uma fração do intervalo médio entre as jogadas dela)
  const limiar = Math.min(minimo, FRACAO_CEDO * 7 * n / k);

  const est = hist.map(P => {
    let ult = null, i = 0;
    P.forEach(([dia], x) => { if (dia < 1) { ult = dia; i = x + 1; } });
    return { ciclo: P.slice(0, k).map(x => x[1]), pos: i % k, ult };
  });

  const linhas = [];
  for (let dia = 1; dia <= max; dia++) {
    const j = vet.indexOf(diaAtual(dia, ano));
    if (j < 0) continue;
    const data = dataDoDia(dia, ano);
    if (excluidos.has(data)) continue;

    let escolhida = 0, menorCusto = Infinity, passos = 0;
    est.forEach((e, i) => {
      let p = 0;   // passos que a organista teria de pular na sequência para tocar este dia
      while (e.ciclo[(e.pos + p) % k] !== j) p++;
      const espera = dia - e.ult;
      const custo = p * PESO_QUEBRA - espera + Math.max(0, limiar - espera) * PESO_CEDO;
      if (custo < menorCusto) { menorCusto = custo; escolhida = i; passos = p; }
    });

    const e = est[escolhida];
    e.pos = (e.pos + passos + 1) % k;
    e.ult = dia;
    linhas.push([NOMES[vet[j]], data, nomes[escolhida]]);
  }
  return linhas;
}

// Mantém só as linhas dos meses selecionados (1 a 12).
// O rodízio é calculado para o ano todo e depois filtrado,
// assim a sequência das organistas continua igual em qualquer período.
function filtrarPorMeses(linhas, meses) {
  return linhas.filter(l => meses.includes(parseInt(l[1].slice(3, 5), 10)));
}
