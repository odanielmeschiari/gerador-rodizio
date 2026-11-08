/* Link de compartilhamento: congela o rodízio (configuração, resultado, trocas e relatório) dentro do próprio
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
function instantaneoAtual() {
  return {
    v: 1,
    ano: configAtual.ano, per: configAtual.per, meses: configAtual.meses, excl: configAtual.excl,
    dias: diasAtuais, nomes: nomesAtuais,
    // por data: índice da organista do rodízio gerado (-1 = dia excluído); as trocas vão à parte
    linhas: linhasAtuais.map(r => [r[1], r[3] ? -1 : nomesAtuais.indexOf(r[2])]),
    trocas: Object.assign({}, trocas),
    relatorio: relatorioAtual
  };
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
    const d = await desempacotarLink(location.hash.slice(PREFIXO_LINK.length));
    validarInstantaneo(d);
    aplicarInstantaneo(d);
  } catch (e) {
    erro("Não foi possível abrir o rodízio deste link: ele está incompleto ou corrompido.");
  }
}
