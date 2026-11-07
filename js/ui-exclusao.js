/* Escolha dos dias a excluir (mini-calendário dos meses do período) */

// datas excluídas do ano que ainda caem em um dia de culto marcado
function exclusoesValidas(ano, vet) {
  return [...excluidos].filter(data => {
    const [d, m, a] = data.split("/").map(Number);
    return a === ano && vet.includes(diaAtual(diaDoAno(d, m, ano), ano));
  });
}

function atualizarInfoExclusao() {
  const ano = parseInt($("ano").value), vet = diasEscolhidos();
  const lista = exclusoesValidas(ano, vet);
  const meses = mesesEscolhidos();
  const fora = lista.filter(d => !meses.includes(parseInt(d.slice(3, 5), 10))).length;
  let t = lista.length
    ? lista.length + (lista.length === 1 ? " dia excluído" : " dias excluídos")
    : "Nenhum dia excluído.";
  if (fora) t += " (" + fora + " fora do período; continuam valendo para manter a sequência)";
  $("exclInfo").textContent = t;
  $("limparExcl").style.display = lista.length ? "" : "none";
}

function montarExclusao() {
  const cal = $("cal");
  const ano = parseInt($("ano").value), vet = diasEscolhidos();
  const meses = [...mesesEscolhidos()].sort((a, b) => a - b);
  cal.innerHTML = "";

  if (!vet.length || !ano || ano < 1 || !meses.length) {
    $("exclHint").textContent = "Marque os dias de culto, o ano e o período para escolher os dias a excluir.";
    atualizarInfoExclusao();
    return;
  }
  $("exclHint").textContent = "Clique nos dias de culto que não terão rodízio (feriados, eventos...). Valem na próxima geração.";

  meses.forEach(m => {
    const box = document.createElement("div");
    box.className = "mes";
    const h = document.createElement("h4");
    h.textContent = MESES[m - 1];
    const grade = document.createElement("div");
    grade.className = "grade";
    NOMES.forEach(n => {
      const s = document.createElement("span");
      s.className = "sem"; s.textContent = n[0];
      grade.append(s);
    });
    const inicio = diaAtual(diaDoAno(1, m, ano), ano);
    for (let i = 0; i < inicio; i++) grade.append(document.createElement("span"));

    for (let d = 1; d <= diasDoMes(m, ano); d++) {
      const tipo = diaAtual(diaDoAno(d, m, ano), ano);
      if (!vet.includes(tipo)) {
        const s = document.createElement("span");
        s.className = "dc off"; s.textContent = d;
        grade.append(s);
        continue;
      }
      const data = formatarData(d, m, ano);
      const b = document.createElement("button");
      b.type = "button"; b.className = "dc"; b.textContent = d;
      b.setAttribute("aria-label", NOMES[tipo] + " " + data);
      const marcar = () => {
        const on = excluidos.has(data);
        b.classList.toggle("excl", on);
        b.setAttribute("aria-pressed", on);
        b.title = on ? "Excluído. Clique para incluir de novo" : "Clique para excluir";
      };
      marcar();
      b.addEventListener("click", () => {
        if (excluidos.has(data)) excluidos.delete(data); else excluidos.add(data);
        marcar();
        atualizarInfoExclusao();
      });
      grade.append(b);
    }
    box.append(h, grade);
    cal.append(box);
  });
  atualizarInfoExclusao();
}
