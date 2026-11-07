/* Simulação do rodízio: mede níveis, ordem, intervalos e justiça em muitas combinações.
   (A prova de que o algoritmo acerta os mínimos está em tests/verificacao.js.)
   Uso: node tests/simulacao.js            (resumo)
        node tests/simulacao.js N DIAS     (detalha um caso, ex.: node tests/simulacao.js 5 0,1,4) */
const fs = require("fs"), vm = require("vm"), path = require("path");
const ctx = vm.createContext({ console, Set, Date, Intl });
["config", "utils", "calendario", "rodizio-analise", "rodizio-busca", "rodizio"].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js", f + ".js"), "utf8") + "\n", ctx, { filename: f }));
const run = (code) => vm.runInContext(code, ctx);
ctx.__args = null;

function analisar(linhas, vet, nomes) {
  const porOrg = {};
  nomes.forEach(n => porOrg[n] = []);
  linhas.forEach(([d, data, o]) => porOrg[o].push({ pos: vet.indexOf(run(`NOMES.indexOf("${d}")`)), t: run(`diasCorridos("${data}")`) }));
  return nomes.map(n => {
    const l = porOrg[n], gaps = [], suc = {};
    for (let i = 1; i < l.length; i++) {
      gaps.push(l[i].t - l[i - 1].t);
      const a = l[i - 1].pos; (suc[a] = suc[a] || {})[l[i].pos] = ((suc[a] || {})[l[i].pos] || 0) + 1;
    }
    // quebra = passagem que foge do "próximo dia" habitual (o mais frequente) da organista
    let quebras = 0;
    Object.values(suc).forEach(m => { const v = Object.values(m); quebras += v.reduce((x, y) => x + y, 0) - Math.max(...v); });
    return { n: l.length, gaps, quebras };
  });
}

function caso(N, vet, excl, ano = 2026) {
  const nomes = Array.from({ length: N }, (_, i) => "O" + (i + 1));
  ctx.__v = vet; ctx.__n = nomes; ctx.__a = ano; ctx.__e = new Set(excl);
  const res = run("gerarRodizio(__v, __n, __a, __e)");
  return { linhas: res.linhas, nomes, nivel: res.relatorio.nivel, an: analisar(res.linhas, vet, nomes) };
}

if (process.argv[2]) {
  const N = +process.argv[2], vet = process.argv[3].split(",").map(Number);
  const excl = (process.argv[4] || "").split(",").filter(Boolean);
  const { linhas, nomes, an } = caso(N, vet, excl);
  linhas.slice(0, 40).forEach(l => console.log(l.join(" ")));
  an.forEach((a, i) => console.log(nomes[i], "vezes", a.n, "quebras", a.quebras, "gaps", a.gaps.slice(0, 14).join(",")));
  process.exit();
}

// todas as combinações de dias (127) x 1..10 organistas, sem e com exclusões
function subconj() { const o = []; for (let m = 1; m < 128; m++) { const v = []; for (let b = 0; b < 7; b++) if (m >> b & 1) v.push(b); o.push(v); } return o; }
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

function medir(comExcl) {
  const pior = { d: -1 }, piorEsp = { dif: -1 }, piorQ = { q: -1 }, piorMin = { min: 99 };
  let casos = 0, somaD = 0, somaQ = 0, semQuebra = 0;
  const niveis = { 1: 0, 2: 0, 3: 0 };
  for (const vet of subconj()) for (let N = 2; N <= 10; N++) {
    const baseLinhas = caso(N, vet, []);
    const excl = [];
    if (comExcl) {
      const nEx = 1 + Math.floor(rnd() * 6);
      for (let i = 0; i < nEx; i++) excl.push(baseLinhas.linhas[Math.floor(rnd() * baseLinhas.linhas.length)][1]);
    }
    const c = comExcl ? caso(N, vet, excl) : baseLinhas;
    const gmax = an => Math.max(...an.flatMap(a => a.gaps));
    const gmin = an => Math.min(...an.flatMap(a => a.gaps));
    const d = gmax(c.an) - gmax(baseLinhas.an);          // quanto o maior intervalo piorou
    const vezes = c.an.map(a => a.n), dif = Math.max(...vezes) - Math.min(...vezes);
    const q = c.an.reduce((s, a) => s + a.quebras, 0);
    casos++; somaD += d; somaQ += q; if (q === 0) semQuebra++; niveis[c.nivel]++;
    if (d > pior.d) Object.assign(pior, { d, N, vet: vet.join(), excl: excl.join(), max: gmax(c.an), base: gmax(baseLinhas.an) });
    if (dif > piorEsp.dif) Object.assign(piorEsp, { dif, N, vet: vet.join(), excl: excl.join() });
    if (q > piorQ.q) Object.assign(piorQ, { q, N, vet: vet.join(), excl: excl.join() });
    if (gmin(c.an) < piorMin.min) Object.assign(piorMin, { min: gmin(c.an), N, vet: vet.join(), excl: excl.join(), baseMin: gmin(baseLinhas.an) });
  }
  console.log(comExcl ? "== COM exclusões aleatórias ==" : "== SEM exclusões ==", casos, "casos (2 a 10 organistas)");
  console.log(" níveis (1 perfeito / 2 imperfeito / 3 contingência):", JSON.stringify(niveis));
  console.log(" piora média do maior intervalo (dias):", (somaD / casos).toFixed(2), "| piora máxima:", JSON.stringify(pior));
  console.log(" casos sem nenhuma quebra de ordem:", semQuebra + "/" + casos, "| média de quebras por caso:", (somaQ / casos).toFixed(2));
  console.log(" maior diferença de vezes (mais - menos):", JSON.stringify(piorEsp));
  console.log(" menor intervalo observado:", JSON.stringify(piorMin));
  console.log(" mais quebras:", JSON.stringify(piorQ));
}
medir(false); medir(true);
