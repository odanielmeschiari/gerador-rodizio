/* Lista dinâmica de organistas */

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
  const r = document.createElement("button");
  r.type = "button"; r.className = "sec peq rem"; r.textContent = "×";
  r.addEventListener("click", () => removerOrganista(lin));
  lin.append(c, r);
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

// renumera rótulos/placeholders e só mostra o "×" quando há mais de uma caixa
function atualizarOrganistas() {
  const linhas = [...$("orgs").children];
  linhas.forEach((lin, i) => {
    const c = lin.querySelector("input"), r = lin.querySelector("button");
    c.setAttribute("aria-label", "Organista " + (i + 1));
    c.placeholder = i === 0 ? "Nome da organista" : "Organista " + (i + 1);
    r.setAttribute("aria-label", "Remover organista " + (i + 1));
    r.title = "Remover organista " + (i + 1);
    r.hidden = linhas.length === 1;
  });
  $("orgLabel").htmlFor = linhas[0].querySelector("input").id;
}

// nomes na ordem das caixas; caixas vazias são ignoradas
function nomesDigitados() {
  return [...$("orgs").querySelectorAll("input")].map(c => c.value.trim()).filter(Boolean);
}
