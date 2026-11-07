/* Verificação do algoritmo (Especificação 1.0). Uso: node tests/verificacao.js
   1) Força bruta: em casos pequenos testa TODAS as combinações (posição inicial de cada organista e
      quem toca em cada data) e confere se a classificação e os mínimos de quebras/consecutivos que o
      algoritmo declara são realmente os melhores possíveis.
   2) Auditoria: refaz a contagem de quebras e consecutivos a partir do rodízio pronto e confere o relatório.
   3) Invariantes: toda data com exatamente uma organista, nomes válidos, relatório coerente.
   Sai com código 1 se algo falhar. */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = vm.createContext({ console, Set, Date, Intl });
["config", "utils", "calendario", "rodizio-analise", "rodizio-busca", "rodizio"].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", f + ".js"), "utf8") + "\n", ctx, { filename: f }));
const run = code => vm.runInContext(code, ctx);

const ANO = +process.env.ANO || 2026;   // ex.: ANO=2028 node tests/verificacao.js
let seed = 987654321;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const sorteio = n => Math.floor(rnd() * n);
let falhas = 0;
const falhar = (msg, info) => { falhas++; if (falhas <= 15) console.log("FALHA:", msg, JSON.stringify(info)); };

const nomesDe = N => Array.from({ length: N }, (_, i) => String.fromCharCode(65 + i));

// chama o algoritmo
function gerar(vet, nomes, excl, ano = ANO) {
  ctx.__v = vet; ctx.__n = nomes; ctx.__a = ano; ctx.__e = new Set(excl);
  return run("gerarRodizio(__v, __n, __a, __e)");
}

// ---------------------------------------------------------------------------------------------
// Auditoria independente: refaz quebras e consecutivos a partir das linhas e da distribuição inicial.
function auditar(res, vet, nomes) {
  const rel = res.relatorio;
  const dias = rel.viabilidade.dias;                          // ex.: ["DOM","QUA"]
  const k = dias.length;
  const pos = {};
  rel.distribuicao.forEach((g, i) => g.pessoas.forEach(n => pos[n] = i));
  let quebras = 0, consec = 0, anterior = null;
  const cont = {};
  res.linhas.forEach(([dia, data, nome], t) => {
    cont[nome] = (cont[nome] || 0) + 1;
    const j = dias.indexOf(dia);
    if (j < 0) throw new Error("dia fora da sequência " + dia);
    if (pos[nome] === undefined) throw new Error("organista desconhecida " + nome);
    if (pos[nome] !== j) quebras++;
    pos[nome] = (j + 1) % k;                                   // próximo dia a partir do dia efetivamente trabalhado
    const dc = run(`diasCorridos("${data}")`);
    if (anterior && anterior.nome === nome && dc - anterior.dc === 1) consec++;
    anterior = { nome, dc };
  });
  return { quebras, consec, cont };
}

// ---------------------------------------------------------------------------------------------
// Força bruta: menor (quebras, consecutivos) entre TODAS as posições iniciais e TODAS as escolhas.
function forcaBruta(dias, datas, N) {
  const k = dias.length, D = datas.length;
  let melhor = [Infinity, Infinity];
  const menor = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const pos = Array(N).fill(0);
  function dfs(t, ultimo, q, c) {
    if (q > melhor[0] || (q === melhor[0] && c >= melhor[1])) return;   // poda
    if (t === D) { if (menor([q, c], melhor)) melhor = [q, c]; return; }
    const d = datas[t];
    for (let p = 0; p < N; p++) {
      const guardada = pos[p];
      const nq = q + (pos[p] !== d.j ? 1 : 0), nc = c + (d.adj && ultimo === p ? 1 : 0);
      pos[p] = (d.j + 1) % k;
      dfs(t + 1, p, nq, nc);
      pos[p] = guardada;
    }
  }
  const totalIni = Math.pow(k, N);
  for (let n = 0; n < totalIni; n++) {
    let x = n;
    for (let p = 0; p < N; p++) { pos[p] = x % k; x = Math.floor(x / k); }
    dfs(0, -1, 0, 0);
  }
  return melhor;
}

// caso pequeno: janela de datas do ano + exclusões aleatórias dentro dela
function casoPequeno() {
  const k = 1 + sorteio(4);
  const todos = [0, 1, 2, 3, 4, 5, 6].sort(() => rnd() - 0.5).slice(0, k).sort((a, b) => a - b);
  const N = 1 + sorteio(3);
  const ini = 1 + sorteio(300), tam = 6 + sorteio(8);
  ctx.__vet = todos; ctx.__ini = ini; ctx.__tam = tam;
  const janela = run(`(() => { const o = []; for (let d = __ini; d < __ini + __tam; d++) if (__vet.includes(diaAtual(d, ${ANO}))) o.push(dataDoDia(d, ${ANO})); return o; })()`);
  if (janela.length < 2) return null;
  const mantidas = janela.filter(() => rnd() < 0.85);
  if (mantidas.length < 2 || mantidas.length > 9) return null;
  const todasDatas = run(`(() => { const o = []; for (let d = 1; d <= (bissexto(${ANO}) ? 366 : 365); d++) if (__vet.includes(diaAtual(d, ${ANO}))) o.push(dataDoDia(d, ${ANO})); return o; })()`);
  const excl = todasDatas.filter(d => !mantidas.includes(d));
  return { vet: todos, N, excl };
}

function testarForcaBruta(casos) {
  let feitos = 0, porNivel = { 1: 0, 2: 0, 3: 0 };
  while (feitos < casos) {
    const c = casoPequeno();
    if (!c) continue;
    const res = gerar(c.vet, nomesDe(c.N), c.excl);
    if (!res.relatorio) continue;
    const rel = res.relatorio;
    // datas na forma usada pela força bruta
    ctx.__r = res.linhas.map(l => l[1]);
    const dias = rel.viabilidade.dias.map(n => run(`NOMES.indexOf("${n}")`));
    const datas = res.linhas.map(([dia, data], t) => ({
      j: dias.indexOf(run(`NOMES.indexOf("${dia}")`)),
      adj: t > 0 && run(`diasCorridos("${data}") - diasCorridos("${res.linhas[t - 1][1]}")`) === 1
    }));
    const bruta = forcaBruta(dias, datas, c.N);
    const q = rel.violacoes[2].quantidade, cs = rel.violacoes[3].quantidade;
    const nivelBruta = bruta[0] > 0 ? 3 : bruta[1] > 0 ? 2 : 1;
    if (bruta[0] !== q || bruta[1] !== cs) falhar("custo difere da força bruta", { c, motor: [q, cs], bruta });
    if (nivelBruta !== rel.nivel) falhar("nível difere da força bruta", { c, motor: rel.nivel, bruta: nivelBruta });
    const aud = auditar(res, c.vet, nomesDe(c.N));
    if (aud.quebras !== q || aud.consec !== cs) falhar("auditoria difere do relatório", { c, aud, q, cs });
    if (!rel.comprovado) falhar("resultado não comprovado em caso pequeno", c);
    porNivel[rel.nivel]++;
    feitos++;
  }
  console.log("Força bruta:", casos, "casos pequenos conferidos | níveis obtidos:", JSON.stringify(porNivel));
}

// ---------------------------------------------------------------------------------------------
// Casos do ano inteiro: invariantes e auditoria
function subconj() { const o = []; for (let m = 1; m < 128; m++) { const v = []; for (let b = 0; b < 7; b++) if (m >> b & 1) v.push(b); o.push(v); } return o; }

function testarAno(comExcl, maxN = 8) {
  const niveis = { 1: 0, 2: 0, 3: 0 };
  let casos = 0, maxMs = 0, soma = 0;
  const todosDias = vet => run(`(() => { const o = []; for (let d = 1; d <= (bissexto(${ANO}) ? 366 : 365); d++) if (${JSON.stringify(vet)}.includes(diaAtual(d, ${ANO}))) o.push(dataDoDia(d, ${ANO})); return o; })()`);
  for (const vet of subconj()) {
    if (rnd() > 0.35) continue;
    for (let N = 1; N <= maxN; N++) {
      const datas = todosDias(vet), excl = [];
      if (comExcl) for (let i = 0, n = 1 + sorteio(9); i < n; i++) excl.push(datas[sorteio(datas.length)]);
      const nomes = nomesDe(N);
      const t0 = Date.now();
      const res = gerar(vet, nomes, excl);
      const ms = Date.now() - t0; maxMs = Math.max(maxMs, ms); soma += ms;
      const rel = res.relatorio;
      const esperadas = datas.filter(d => !excl.includes(d));
      if (res.linhas.length !== esperadas.length) { falhar("quantidade de datas", { vet, N, excl }); continue; }
      if (res.linhas.some((l, i) => l[1] !== esperadas[i])) falhar("datas fora de ordem/faltando", { vet, N });
      if (res.linhas.some(l => !nomes.includes(l[2]))) falhar("nome inválido", { vet, N });
      const aud = auditar(res, vet, nomes);
      if (aud.quebras !== rel.violacoes[2].quantidade || aud.consec !== rel.violacoes[3].quantidade)
        falhar("auditoria difere do relatório", { vet, N, excl, aud, rel: rel.violacoes.map(v => v.quantidade) });
      if (rel.nivel === 1 && (aud.quebras || aud.consec)) falhar("nível 1 com violações", { vet, N, excl });
      if (rel.nivel === 2 && (aud.quebras || !aud.consec)) falhar("nível 2 incoerente", { vet, N, excl });
      if (rel.nivel === 3 && !aud.quebras) falhar("nível 3 sem quebras", { vet, N, excl });
      if ((N >= rel.viabilidade.nMin) !== (rel.nivel < 3)) falhar("nível incoerente com N_min", { vet, N, excl });
      if (rel.organistas.reduce((s, o) => s + o.vezes, 0) !== res.linhas.length) falhar("soma de vezes", { vet, N });
      niveis[rel.nivel]++; casos++;
    }
  }
  console.log(comExcl ? "Ano c/ exclusões:" : "Ano s/ exclusões:", casos, "casos | níveis", JSON.stringify(niveis),
    "| tempo médio", (soma / casos).toFixed(0) + " ms, máx", maxMs + " ms");
}

testarForcaBruta(+process.argv[2] || 400);
testarAno(false);
testarAno(true);
console.log(falhas ? "\n" + falhas + " FALHA(S)" : "\nTudo certo: nenhuma divergência.");
process.exit(falhas ? 1 : 0);
