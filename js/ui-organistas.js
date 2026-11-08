/* Lista dinâmica de organistas (adicionar, remover e reordenar) */

let seqOrg = 0;   // contador de ids únicos (as caixas podem ser removidas)

function addOrganista(focar) {
  const box = $("orgs");
  const lin = document.createElement("div");
  lin.className = "lin";
  const c = document.createElement("input");
  c.type = "text"; c.id = "org" + (++seqOrg);
  c.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); addOrganista(true); }
  });
  // seletor de posição: escolher um número move a organista para aquele lugar da lista
  const p = document.createElement("select");
  p.className = "pos";
  p.addEventListener("change", () => moverOrganista(lin, parseInt(p.value) - 1));
  const r = document.createElement("button");
  r.type = "button"; r.className = "sec peq rem"; r.textContent = "×";
  r.addEventListener("click", () => removerOrganista(lin));
  lin.append(c, p, r);
  box.append(lin);
  atualizarOrganistas();
  if (focar) c.focus();
}

function removerOrganista(lin) {
  const box = $("orgs");
  if (box.children.length <= 1) return;   // nunca remove a única caixa
  const irmaos = [...box.children];
  const i = irmaos.indexOf(lin);
  const vizinho = irmaos[i + 1] || irmaos[i - 1];
  lin.remove();
  atualizarOrganistas();
  vizinho.querySelector("input").focus();
}

// move a organista para a posição `destino` (começa em 0)
function moverOrganista(lin, destino) {
  const irmaos = [...$("orgs").children];
  const alvo = irmaos[destino];
  if (!alvo || alvo === lin) return;
  if (destino > irmaos.indexOf(lin)) alvo.after(lin); else alvo.before(lin);
  atualizarOrganistas();
  lin.querySelector("select").focus();
}

// reordena as caixas pela lista de linhas já na nova ordem
function aplicarOrdemOrganistas(linhas) {
  linhas.forEach(l => $("orgs").append(l));
  atualizarOrganistas();
}

function embaralharOrganistas() {
  const linhas = [...$("orgs").children];
  for (let i = linhas.length - 1; i > 0; i--) {   // Fisher-Yates
    const j = Math.floor(Math.random() * (i + 1));
    [linhas[i], linhas[j]] = [linhas[j], linhas[i]];
  }
  aplicarOrdemOrganistas(linhas);
}

// ordem alfabética (pt-BR); caixas vazias ficam no fim; nomes iguais mantêm a ordem atual
function ordenarOrganistasAlfabetica() {
  const col = typeof Intl !== "undefined" ? new Intl.Collator("pt-BR", { sensitivity: "base" }) : null;
  const cmp = col ? (a, b) => col.compare(a, b) : (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const nome = l => l.querySelector("input").value.trim();
  const linhas = [...$("orgs").children].map((l, i) => [l, i]);
  linhas.sort((x, y) => {
    const a = nome(x[0]), b = nome(y[0]);
    if (!a !== !b) return a ? -1 : 1;
    return cmp(a, b) || x[1] - y[1];
  });
  aplicarOrdemOrganistas(linhas.map(x => x[0]));
}

// renumera rótulos/placeholders/posições; só mostra "×" e o seletor quando há mais de uma caixa
function atualizarOrganistas() {
  const linhas = [...$("orgs").children];
  linhas.forEach((lin, i) => {
    const c = lin.querySelector("input"), p = lin.querySelector("select"), r = lin.querySelector("button");
    c.setAttribute("aria-label", "Organista " + (i + 1));
    c.placeholder = i === 0 ? "Nome da organista" : "Organista " + (i + 1);
    p.innerHTML = "";
    linhas.forEach((_, k) => p.add(new Option(k + 1, k + 1)));
    p.value = i + 1;
    p.setAttribute("aria-label", "Posição da organista " + (i + 1) + " na lista");
    p.title = "Mudar a posição na lista";
    p.hidden = linhas.length === 1;
    r.setAttribute("aria-label", "Remover organista " + (i + 1));
    r.title = "Remover organista " + (i + 1);
    r.hidden = linhas.length === 1;
  });
  $("embaralhar").disabled = $("ordemAlfa").disabled = linhas.length < 2;
  $("orgLabel").htmlFor = linhas[0].querySelector("input").id;
}

// nomes na ordem das caixas; caixas vazias são ignoradas
function nomesDigitados() {
  return [...$("orgs").querySelectorAll("input")].map(c => c.value.trim()).filter(Boolean);
}
