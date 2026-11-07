/* Prévia editável do rodízio (tabela e trocas manuais) */

function atualizarLinhasFinais() {
  linhasFinais = linhasAtuais.map(r => [r[0], r[1], trocas[r[1]] !== undefined ? trocas[r[1]] : r[2]]);
  const n = Object.keys(trocas).filter(k => linhasAtuais.some(r => r[1] === k)).length;
  $("limpar").style.display = n ? "" : "none";
  $("limpar").textContent = "Limpar trocas (" + n + ")";
  renderizarResumo();
}

// quadro de justiça: quantas vezes cada uma toca, em quais dias, intervalos e quebras de ordem
function renderizarResumo() {
  const tb = $("rs");
  tb.innerHTML = "";
  const virgula = x => x.toFixed(1).replace(".", ",");
  nomesAtuais.forEach(nome => {
    const l = linhasFinais.filter(r => r[2] === nome);
    const dias = l.map(r => diasCorridos(r[1]));
    const gaps = dias.slice(1).map((x, i) => x - dias[i]);

    // quebra = passagem que foge do "próximo dia" habitual (o mais frequente) da organista
    const suc = {};
    l.forEach((r, i) => {
      if (!i) return;
      const a = l[i - 1][0];
      suc[a] = suc[a] || {};
      suc[a][r[0]] = (suc[a][r[0]] || 0) + 1;
    });
    let quebras = 0;
    Object.values(suc).forEach(m => {
      const v = Object.values(m);
      quebras += v.reduce((a, b) => a + b, 0) - Math.max(...v);
    });

    const celulas = [
      nome,
      l.length,
      diasAtuais.map(d => NOMES[d] + " " + l.filter(r => r[0] === NOMES[d]).length).join(" · "),
      gaps.length
        ? Math.min(...gaps) + " / " + virgula(gaps.reduce((a, b) => a + b, 0) / gaps.length) + " / " + Math.max(...gaps)
        : "—",
      quebras
    ];
    const tr = document.createElement("tr");
    tr.classList.toggle("alerta", quebras > 0);
    celulas.forEach(c => { const td = document.createElement("td"); td.textContent = c; tr.append(td); });
    tb.append(tr);
  });
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
