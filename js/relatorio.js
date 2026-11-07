/* Relatório do algoritmo na tela (seção 7 da especificação): classificação, regras, distribuição inicial,
   organistas e exceções. Só mostra o que o algoritmo calculou (js/rodizio.js).
   Aparece na seção recolhida "Relatório completo" no fim da página; todos os tópicos começam fechados. */

function nodo(tag, texto, classe) {
  const e = document.createElement(tag);
  if (texto !== undefined) e.textContent = texto;
  if (classe) e.className = classe;
  return e;
}

function tabelaSimples(cabecalho, linhas) {
  const wrap = nodo("div", undefined, "wrap livre");
  const t = nodo("table"), th = nodo("thead"), tb = nodo("tbody");
  const trh = nodo("tr");
  cabecalho.forEach(c => trh.append(nodo("th", c)));
  th.append(trh);
  linhas.forEach(l => {
    const tr = nodo("tr");
    l.forEach(c => tr.append(nodo("td", c)));
    tb.append(tr);
  });
  t.append(th, tb);
  wrap.append(t);
  return wrap;
}

function secao(titulo, conteudo, aberta) {
  const d = nodo("details");
  d.open = !!aberta;
  d.append(nodo("summary", titulo), conteudo);
  return d;
}

function renderizarRelatorio() {
  const box = $("rel");
  box.innerHTML = "";
  const r = relatorioAtual;
  if (!r) return;

  const plural = (n, s, p) => n + " " + (n === 1 ? s : p);
  const rotulo = { 1: "Rodízio perfeito", 2: "Rodízio imperfeito", 3: "Rodízio de contingência" }[r.nivel];
  const viol = r.violacoes;
  const qtd = id => viol.find(v => v.id === id).quantidade;
  const quebras = qtd("sequencia"), consec = qtd("consecutivos");
  const seguidos = consec ? plural(consec, "trabalho", "trabalhos") + " em cultos seguidos" : "nenhuma organista em cultos seguidos";

  let resumo = "Todas as " + r.totalDatas + " datas do ano foram preenchidas, ";
  if (r.nivel === 1) resumo += "com as sequências respeitadas e sem nenhuma organista em cultos seguidos.";
  else if (r.nivel === 2) resumo += "com as sequências respeitadas, mas com " + seguidos + " (inevitável).";
  else resumo += "com " + plural(quebras, "quebra de sequência", "quebras de sequência") + " e " + seguidos + ".";

  const topo = nodo("div", undefined, "prevbar");
  topo.append(nodo("h2", "Relatório do algoritmo", "tit"), nodo("span", rotulo, "selo n" + r.nivel));
  box.append(topo, nodo("p", resumo));
  if (r.menorIntervalo)
    box.append(nodo("p", "Menor intervalo entre dois trabalhos da mesma organista: " + plural(r.menorIntervalo.dias, "dia", "dias") +
      " (" + plural(r.menorIntervalo.cultos, "culto", "cultos") + " entre os dois).", "hint"));
  box.append(nodo("p", "Este relatório vale para o rodízio do ano inteiro, antes de trocas manuais. O período escolhido apenas filtra a prévia.", "hint"));

  if (r.justificativa.length) {
    const ul = nodo("ul");
    r.justificativa.forEach(j => ul.append(nodo("li", j)));
    box.append(secao(r.nivel === 3 ? "Por que há quebras de sequência" : "Por que não é perfeito", ul));
  }

  box.append(secao("Regras e violações",
    tabelaSimples(["Regra", "Prioridade", "Quantidade"], viol.map(v => [v.regra, v.prioridade, v.quantidade]))));

  const dist = r.distribuicao.map(g => [g.dia, g.pessoas.length, g.pessoas.join(", ") || "—"]);
  box.append(secao("Distribuição inicial utilizada (quem começa esperando cada dia)",
    tabelaSimples(["Dia", "Qtd.", "Organistas"], dist)));

  box.append(secao("Organistas: trabalhos e dias desde o último",
    tabelaSimples(["Organista", "Vezes", "Dias desde o último trabalho", "Quebras", "Cultos seguidos"],
      r.organistas.map(o => [o.nome, o.vezes, o.diasDesdeUltimo, o.quebras, o.consecutivos]))));

  const seq = nodo("div", undefined, "wrap livre seq");
  r.organistas.forEach(o => {
    const p = nodo("p");
    p.append(nodo("strong", o.nome + ": "), document.createTextNode(o.sequencia.join(" → ") || "não toca"));
    seq.append(p);
  });
  box.append(secao("Ordem real dos dias trabalhados por organista", seq));

  if (r.quebras.length || r.consecutivos.length) {
    const ex = nodo("div");
    if (r.quebras.length) {
      ex.append(nodo("p", "Quebras de sequência (a organista tocou um dia diferente do que era o seu próximo):", "hint"));
      ex.append(tabelaSimples(["Data", "Organista", "Esperado", "Tocou"], r.quebras.map(q => [q.data, q.organista, q.esperado, q.real])));
    }
    if (r.consecutivos.length) {
      ex.append(nodo("p", "Trabalhos em cultos seguidos:", "hint"));
      ex.append(tabelaSimples(["Organista", "Datas"], r.consecutivos.map(c => [c.organista, c.anterior + " e " + c.data])));
    }
    box.append(secao("Exceções registradas", ex));
  }
}
