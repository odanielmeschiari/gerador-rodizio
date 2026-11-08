/* Link de compartilhamento: congela o rodízio (configuração, resultado e trocas) dentro do próprio
   endereço, depois do "#". Nada vai para servidor: quem abre o link recebe uma cópia e as alterações dela
   ficam só no navegador dessa pessoa, então o link continua sempre igual. */

const PREFIXO_LINK = "#rodizio=";

// ---- empacotamento: JSON -> (deflate) -> base64 seguro para URL ----
function bytesParaBase64Url(bytes) {
  let s = "";
  bytes.forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlParaBytes(t) {
  t = t.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const s = atob(t);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

async function processarFluxo(bytes, fluxo) {
  const r = new Response(new Blob([bytes]).stream().pipeThrough(fluxo));
  return new Uint8Array(await r.arrayBuffer());
}

// primeira letra: "c" = comprimido, "p" = texto puro (navegadores sem CompressionStream)
async function empacotarLink(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === "undefined") return "p" + bytesParaBase64Url(bytes);
  return "c" + bytesParaBase64Url(await processarFluxo(bytes, new CompressionStream("deflate-raw")));
}

async function desempacotarLink(texto) {
  let bytes = base64UrlParaBytes(texto.slice(1));
  if (texto[0] === "c") bytes = await processarFluxo(bytes, new DecompressionStream("deflate-raw"));
  else if (texto[0] !== "p") throw new Error("formato desconhecido");
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ---- estado <-> instantâneo ----
// O link guarda só o essencial (versão 2): configuração, quem toca em cada data e as trocas. As datas saem do
// calendário e o relatório é recalculado ao abrir (e só aparece se der o mesmo rodízio guardado no link).

// todas as datas de culto do ano nos meses indicados, em ordem (inclui as excluídas)
function datasCultos(ano, dias, meses) {
  const datas = [];
  const total = bissexto(ano) ? 366 : 365;
  for (let n = 1; n <= total; n++) {
    if (!dias.includes(diaAtual(n, ano))) continue;
    const data = dataDoDia(n, ano);
    if (meses.includes(parseInt(data.slice(3, 5), 10))) datas.push(data);
  }
  return datas;
}

function mesesDoPeriodo(per, custom) {
  if (per === "ano") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (per === "s1") return [1, 2, 3, 4, 5, 6];
  if (per === "s2") return [7, 8, 9, 10, 11, 12];
  return custom;
}

function instantaneoAtual() {
  const { ano, per, meses, excl } = configAtual;
  const datas = datasCultos(ano, diasAtuais, meses);
  const cod = {};   // data -> índice da organista do rodízio gerado (0 = dia excluído)
  linhasAtuais.forEach(r => { cod[r[1]] = r[3] ? 0 : nomesAtuais.indexOf(r[2]) + 1; });
  const d = {
    v: 2, a: ano, p: per, d: diasAtuais, n: nomesAtuais,
    x: excl.filter(e => parseInt(e.slice(6), 10) === ano).map(e => {   // exclusões como nº do dia no ano
      const [dd, mm] = e.split("/").map(Number);
      return diaDoAno(dd, mm, ano);
    }),
    c: datas.map(dt => cod[dt] || 0),
    t: []   // trocas manuais: [posição da data, índice da organista]
  };
  if (per === "custom") d.m = meses;
  Object.keys(trocas).forEach(dt => {
    const i = datas.indexOf(dt), o = nomesAtuais.indexOf(trocas[dt]);
    if (i >= 0 && o >= 0) d.t.push([i, o]);
  });
  return d;
}

// versão 2 -> forma completa usada por validarInstantaneo/aplicarInstantaneo
function expandirV2(d) {
  const ok = c => { if (!c) throw new Error("link inválido"); };
  const inteiro = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
  ok(d && inteiro(d.a, 1, 9999) && ["ano", "s1", "s2", "custom"].includes(d.p));
  ok(Array.isArray(d.d) && d.d.length && d.d.every(x => inteiro(x, 0, 6)));
  ok(Array.isArray(d.n) && d.n.length && d.n.every(n => typeof n === "string"));
  ok(Array.isArray(d.x) && d.x.every(x => inteiro(x, 1, 366)));
  ok(Array.isArray(d.c) && Array.isArray(d.t));
  ok(d.p !== "custom" || (Array.isArray(d.m) && d.m.every(x => inteiro(x, 1, 12))));
  const meses = mesesDoPeriodo(d.p, d.m);
  const excl = d.x.map(x => dataDoDia(x, d.a));
  const datas = datasCultos(d.a, d.d, meses);
  ok(datas.length === d.c.length && d.c.every(x => inteiro(x, 0, d.n.length)));
  const linhas = datas.map((dt, i) => [dt, d.c[i] - 1]);
  const trocas = {};
  d.t.forEach(t => { ok(Array.isArray(t) && inteiro(t[0], 0, datas.length - 1) && inteiro(t[1], 0, d.n.length - 1)); trocas[datas[t[0]]] = d.n[t[1]]; });

  // relatório: recalculado; só vale se o algoritmo atual der exatamente o rodízio guardado
  let relatorio = null;
  try {
    const res = gerarRodizio(d.d, d.n, d.a, new Set(excl));
    const gerado = filtrarPorMeses(res.linhas, meses);
    const porData = {};
    gerado.forEach(l => { porData[l[1]] = l[2]; });
    const guardadas = linhas.filter(l => l[1] >= 0);
    if (guardadas.length === gerado.length && guardadas.every(l => porData[l[0]] === d.n[l[1]])) relatorio = res.relatorio;
  } catch (e) { relatorio = null; }
  return { v: 1, ano: d.a, per: d.p, meses, excl, dias: d.d, nomes: d.n, linhas, trocas, relatorio };
}

function validarInstantaneo(d) {
  const ok = c => { if (!c) throw new Error("link inválido"); };
  const inteiro = (x, a, b) => Number.isInteger(x) && x >= a && x <= b;
  const dataOk = s => {
    if (typeof s !== "string" || !/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false;
    const [dd, mm, aa] = s.split("/").map(Number);
    return inteiro(mm, 1, 12) && inteiro(dd, 1, diasDoMes(mm, aa));
  };
  ok(d && d.v === 1);
  ok(inteiro(d.ano, 1, 9999));
  ok(["ano", "s1", "s2", "custom"].includes(d.per));
  ok(Array.isArray(d.dias) && d.dias.length && d.dias.every(x => inteiro(x, 0, 6)));
  ok(Array.isArray(d.meses) && d.meses.every(x => inteiro(x, 1, 12)));
  ok(Array.isArray(d.nomes) && d.nomes.length && d.nomes.every(n => typeof n === "string"));
  ok(Array.isArray(d.excl) && d.excl.every(dataOk));
  ok(Array.isArray(d.linhas) && d.linhas.length &&
     d.linhas.every(l => Array.isArray(l) && dataOk(l[0]) && inteiro(l[1], -1, d.nomes.length - 1)));
  ok(d.trocas && typeof d.trocas === "object");
}

function aplicarInstantaneo(d) {
  // formulário
  $("ano").value = d.ano;
  $("dias").querySelectorAll("input").forEach(c => { c.checked = d.dias.includes(parseInt(c.value)); });
  $("per").value = d.per;
  $("meses").style.display = d.per === "custom" ? "grid" : "none";
  $("meses").querySelectorAll("input").forEach(c => { c.checked = d.meses.includes(parseInt(c.value)); });
  excluidos.clear();
  d.excl.forEach(x => excluidos.add(x));
  const box = $("orgs");
  while (box.children.length < d.nomes.length) addOrganista(false);
  while (box.children.length > d.nomes.length) box.lastElementChild.remove();
  [...box.children].forEach((lin, i) => { lin.querySelector("input").value = d.nomes[i]; });
  atualizarOrganistas();
  montarExclusao();

  // resultado congelado
  Object.keys(trocas).forEach(k => delete trocas[k]);
  Object.keys(d.trocas).forEach(k => { if (d.nomes.includes(d.trocas[k])) trocas[k] = d.trocas[k]; });
  configAtual = { ano: d.ano, per: d.per, meses: d.meses, excl: d.excl };
  diasAtuais = d.dias;
  nomesAtuais = d.nomes;
  relatorioAtual = d.relatorio || null;
  linhasAtuais = d.linhas.map(([data, c]) => {
    const [dd, mm, aa] = data.split("/").map(Number);
    const dia = NOMES[diaAtual(diaDoAno(dd, mm, aa), aa)];
    return c < 0 ? [dia, data, ROTULO_EXCLUIDO, true] : [dia, data, d.nomes[c]];
  });
  $("linkBox").hidden = true;
  renderizar();
  try { renderizarRelatorio(); $("relCompleto").style.display = "block"; }
  catch (e) { $("relCompleto").style.display = "none"; }   // relatório do link incompleto: o rodízio continua valendo
  $("avisoLink").hidden = false;
}

// ---- botões ----
async function gerarLink() {
  if (!linhasAtuais.length || !configAtual) return;
  const link = location.href.split("#")[0] + PREFIXO_LINK + await empacotarLink(instantaneoAtual());
  $("linkUrl").value = link;
  $("linkBox").hidden = false;
  let t = "Este link guarda o rodízio como está agora, com as trocas já feitas. Quem abrir pode alterar à vontade, " +
    "e o link continua igual.";
  if (location.protocol === "file:")
    t += " Atenção: esta página está aberta como arquivo local, então o link só funciona neste computador. " +
      "Para outras pessoas abrirem, coloque a página em um endereço da internet (por exemplo, GitHub Pages).";
  $("linkInfo").textContent = t;
  $("linkUrl").select();
}

async function copiarLink() {
  const u = $("linkUrl");
  u.select();
  try { await navigator.clipboard.writeText(u.value); $("copiarLink").textContent = "Copiado!"; }
  catch (e) { $("copiarLink").textContent = "Selecionado: use Ctrl+C"; }
  setTimeout(() => { $("copiarLink").textContent = "Copiar"; }, 2000);
}

// ao abrir a página (ou colar outro link na mesma aba): restaura o rodízio congelado
async function restaurarDoLink() {
  if (!location.hash.startsWith(PREFIXO_LINK)) return;
  try {
    let d = await desempacotarLink(location.hash.slice(PREFIXO_LINK.length));
    if (d && d.v === 2) d = expandirV2(d);
    validarInstantaneo(d);
    aplicarInstantaneo(d);
  } catch (e) {
    erro("Não foi possível abrir o rodízio deste link: ele está incompleto ou corrompido.");
  }
}
