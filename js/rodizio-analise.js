/* Algoritmo de rodízio (Especificação 1.0), parte 1: entrada, análise matemática e distribuição inicial.
   Lógica pura: não lê nem altera a tela.

   Modelo (seção 2): cada organista tem uma POSIÇÃO = índice, na sequência circular dos dias de culto,
   do próximo dia em que pode tocar. Ao tocar, avança uma posição; ao não tocar, fica onde está.
   Duas organistas na mesma posição são intercambiáveis para o preenchimento do calendário; por isso
   o cálculo matemático trabalha com CONTAGENS por posição (a[i] = quantas organistas esperam o dia i). */

// Seção 1: datas válidas do ano (dias de culto que não foram excluídos), em ordem cronológica.
//   j = índice da data na sequência circular dos dias (0 = primeiro dia da lista)
// Cultos seguidos = duas datas vizinhas desta lista, não importa quantos dias corridos as separem
// (ex.: QUA 07/01 e SAB 10/01 são seguidos; a lista já não contém as datas excluídas).
// Um dia da semana sem nenhuma data válida no ano (todas excluídas) sai da sequência circular.
function prepararDatas(vet, ano, excluidos) {
  const max = bissexto(ano) ? 366 : 365;
  const brutas = [];
  for (let dia = 1; dia <= max; dia++) {
    const sem = diaAtual(dia, ano);
    if (vet.includes(sem) && !excluidos.has(dataDoDia(dia, ano))) brutas.push({ dia, sem });
  }
  const dias = vet.filter(v => brutas.some(d => d.sem === v));
  const datas = brutas.map(d => ({
    dia: d.dia, sem: d.sem, data: dataDoDia(d.dia, ano), j: dias.indexOf(d.sem)
  }));
  return { dias, datas };
}

// Seção 9.1: C[i] = quantas datas válidas o dia i tem no período;
// L[i] = max_t (C_i(t) - C_{i-1}(t), 0) = mínimo de organistas que precisam começar esperando o dia i;
// nMin = soma dos L[i]. Com N >= nMin existe distribuição inicial que preenche todas as datas
// respeitando as sequências; com N < nMin isso é impossível.
function analisarViabilidade(datas, k) {
  const C = Array(k).fill(0), L = Array(k).fill(0);
  datas.forEach(d => {
    C[d.j]++;
    // com um único dia a sequência é ele mesmo: a fórmula não se aplica e basta uma organista
    const v = k === 1 ? 1 : C[d.j] - C[(d.j + k - 1) % k];
    if (v > L[d.j]) L[d.j] = v;
  });
  return { C, L, nMin: L.reduce((a, b) => a + b, 0) };
}

const somar = v => v.reduce((a, b) => a + b, 0);

// C(n, r) como número (usado só para saber o tamanho do espaço de busca)
function combinacoes(n, r) {
  let c = 1;
  for (let i = 1; i <= r; i++) c = c * (n - r + i) / i;
  return Math.round(c);
}

// quantas formas existem de repartir `extras` organistas entre k posições
const totalDistribuicoes = (extras, k) => combinacoes(extras + k - 1, k - 1);

// Percorre TODAS as distribuições iniciais a (a[i] >= L[i], soma N). O vetor passado ao callback é reaproveitado.
function percorrerDistribuicoes(L, N, cb) {
  const k = L.length, a = L.slice();
  (function rec(i, resto) {
    if (i === k - 1) { a[i] = L[i] + resto; cb(a); return; }
    for (let e = 0; e <= resto; e++) { a[i] = L[i] + e; rec(i + 1, resto - e); }
  })(0, N - somar(L));
}

// Quando o espaço de busca é grande demais: só as distribuições a no máximo 1 de distância da mais
// equilibrada (os extras vão sempre para o menor grupo).
function distribuicoesProximasDoEquilibrio(L, N) {
  const k = L.length, base = L.slice();
  for (let x = N - somar(L); x > 0; x--) {
    let m = 0;
    for (let i = 1; i < k; i++) if (base[i] < base[m]) m = i;
    base[m]++;
  }
  const saida = [], a = Array(k);
  (function rec(i, resto) {
    if (i === k) { if (resto === 0) saida.push(a.slice()); return; }
    for (let v = Math.max(L[i], base[i] - 1); v <= base[i] + 1 && v <= resto; v++) { a[i] = v; rec(i + 1, resto - v); }
  })(0, N);
  return saida;
}

// Quão desequilibrados estão os grupos (soma dos quadrados dos desvios em relação ao tamanho médio)
function desequilibrio(a) {
  const m = somar(a) / a.length;
  return a.reduce((s, x) => s + (x - m) * (x - m), 0);
}

// Estado inicial de cada organista ("dias desde o último trabalho" + próximo dia).
// O rodízio é tratado como se já estivesse em andamento antes de 1º de janeiro: quem espera o dia i
// tocou, pela última vez, no dia anterior da sequência (i-1); as organistas de um mesmo grupo tocaram
// em semanas diferentes (a mais antiga é a que toca primeiro). Devolve as vagas da mais antiga à mais recente.
// Datas anteriores a 1º de janeiro têm número <= 0 (dia 0 = 31/12 do ano anterior).
function historicoInicial(a, ctx) {
  const { dias, k, ano } = ctx;
  const sem0 = mod(anoInicio(ano) - 1, 7);   // dia da semana do dia 0
  const vagas = [];
  a.forEach((qtd, i) => {
    const anterior = dias[(i + k - 1) % k];
    const base = -mod(sem0 - anterior, 7);   // última ocorrência do dia anterior até o dia 0
    for (let m = 0; m < qtd; m++) vagas.push({ pos: i, ult: base - 7 * m });
  });
  vagas.sort((x, y) => x.ult - y.ult);
  return vagas;
}
