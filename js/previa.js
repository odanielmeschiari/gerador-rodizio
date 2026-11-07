/* Prévia editável do rodízio (tabela e trocas manuais) */

function atualizarLinhasFinais() {
  linhasFinais = linhasAtuais.map(r => [r[0], r[1], trocas[r[1]] !== undefined ? trocas[r[1]] : r[2]]);
  const n = Object.keys(trocas).filter(k => linhasAtuais.some(r => r[1] === k)).length;
  $("limpar").style.display = n ? "" : "none";
  $("limpar").textContent = "Limpar trocas (" + n + ")";
}

function renderizar() {
  const tb = $("tb");
  tb.innerHTML = "";
  linhasAtuais.forEach(l => {
    const tr = document.createElement("tr");
    const [dia, data, base] = l;
    [dia, data].forEach(c => { const td = document.createElement("td"); td.textContent = c; tr.append(td); });
    const td = document.createElement("td");
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", "Organista de " + dia + " " + data);
    nomesAtuais.forEach(n => sel.add(new Option(n, n)));
    sel.value = trocas[data] !== undefined ? trocas[data] : base;
    tr.classList.toggle("troc", sel.value !== base);
    sel.addEventListener("change", () => {
      if (sel.value === base) delete trocas[data]; else trocas[data] = sel.value;
      tr.classList.toggle("troc", sel.value !== base);
      atualizarLinhasFinais();
    });
    td.append(sel);
    tr.append(td);
    tb.append(tr);
  });
  atualizarLinhasFinais();
  $("prev").style.display = "block";
  $("baixar").disabled = false;
}
