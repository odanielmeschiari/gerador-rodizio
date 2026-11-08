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
  // alça de arrastar: segure e arraste para a posição desejada (setas ↑ ↓ também movem)
  const p = document.createElement("button");
  p.type = "button"; p.className = "sec peq alca"; p.textContent = "☰";
  p.addEventListener("pointerdown", e => iniciarArraste(lin, e));
  p.addEventListener("keydown", e => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    moverOrganista(lin, [...$("orgs").children].indexOf(lin) + (e.key === "ArrowUp" ? -1 : 1));
  });
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
  lin.querySelector(".alca").focus();
}

// arrastar e soltar: enquanto o ponteiro se move, a linha troca de lugar com a que está sob ele
// (pointer events: funciona com mouse e com toque)
function iniciarArraste(lin, e) {
  if (e.button !== undefined && e.button !== 0) return;
  const box = $("orgs");
  if (box.children.length < 2) return;
  e.preventDefault();
  box.setPointerCapture(e.pointerId);   // no contêiner, que não sai do DOM quando a linha muda de lugar
  lin.classList.add("arrastando");
  const mover = ev => {
    const outras = [...box.children].filter(l => l !== lin);
    const alvo = outras.find(l => { const b = l.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
    if (alvo) { if (lin.nextElementSibling !== alvo) alvo.before(lin); }
    else if (box.lastElementChild !== lin) box.append(lin);
  };
  const fim = () => {
    box.removeEventListener("pointermove", mover);
    box.removeEventListener("pointerup", fim);
    box.removeEventListener("pointercancel", fim);
    lin.classList.remove("arrastando");
    atualizarOrganistas();
  };
  box.addEventListener("pointermove", mover);
  box.addEventListener("pointerup", fim);
  box.addEventListener("pointercancel", fim);
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

// renumera rótulos/placeholders; só mostra "×" e a alça quando há mais de uma caixa
function atualizarOrganistas() {
  const linhas = [...$("orgs").children];
  linhas.forEach((lin, i) => {
    const c = lin.querySelector("input"), p = lin.querySelector(".alca"), r = lin.querySelector(".rem");
    c.setAttribute("aria-label", "Organista " + (i + 1));
    c.placeholder = i === 0 ? "Nome da organista" : "Organista " + (i + 1);
    p.setAttribute("aria-label", "Mudar a posição da organista " + (i + 1) + " (arraste ou use as setas)");
    p.title = "Arraste para mudar a posição";
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
