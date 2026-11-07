/* Algoritmo de rodízio (Especificação 1.0), parte 3: fluxo geral (seção 8) e relatório final (seção 7).
   Lógica pura: não lê nem altera a tela. Veja rodizio-analise.js e rodizio-busca.js. */

const CLASSIFICACAO = { 1: "perfeita", 2: "imperfeita", 3: "contingência" };

// Organistas em ordem alfabética (desempate da seção 4); nomes iguais mantêm a ordem informada.
function ordenarNomes(nomes) {
  const col = typeof Intl !== "undefined" ? new Intl.Collator("pt-BR", { sensitivity: "base" }) : null;
  const cmp = col ? (a, b) => col.compare(a, b) : (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return nomes.map((n, i) => [n, i]).sort((x, y) => cmp(x[0], y[0]) || x[1] - y[1]).map(x => x[0]);
}

// Gera o rodízio do ano inteiro, data por data.
//   vet       = dias da semana escolhidos (0 = DOM ... 6 = SAB)
//   nomes     = organistas
//   excluidos = Set de datas "dd/mm/aaaa" sem culto (não entram no rodízio)
// Devolve { linhas: [[dia, data, organista], ...], relatorio }.
function gerarRodizio(vet, nomes, ano, excluidos = new Set()) {
  // 1. Receber funcionários, dias e período / 2. Listar datas válidas
  const { dias, datas } = prepararDatas([...vet].sort((a, b) => a - b), ano, excluidos);
  if (!datas.length || !nomes.length) return { linhas: [], relatorio: null };
  const ordem = ordenarNomes(nomes);
  const ctx = { ano, dias, k: dias.length, datas, N: ordem.length };

  // 3. Calcular distribuição inicial / 4. Verificar viabilidade matemática
  const an = analisarViabilidade(datas, ctx.k);

  let nivel, montagem, busca = null, cont = null;
  if (ctx.N >= an.nMin) {
    // 5. Buscar rodízio perfeito (nível 1) / 7. permitindo consecutivos (nível 2): mesma busca exaustiva
    busca = buscarSequencia(ctx, an);
    nivel = busca.minConsec === 0 ? 1 : 2;
    montagem = melhorMontagem(ctx, busca.candidatas, null);
  } else {
    // 9. Buscar solução permitindo quebras de sequência (nível 3: contingência)
    nivel = 3;
    cont = resolverContingencia(ctx, an);
    montagem = cont.montagem;
  }

  const linhas = datas.map((d, t) => [NOMES[d.sem], d.data, ordem[montagem.trab[t]]]);
  return { linhas, relatorio: montarRelatorio(ctx, an, nivel, montagem, ordem, busca, cont) };
}

// Compatibilidade: só as linhas do rodízio.
function calcularRodizio(vet, nomes, ano, excluidos = new Set()) {
  return gerarRodizio(vet, nomes, ano, excluidos).linhas;
}

// Seção 7: relatório final
function montarRelatorio(ctx, an, nivel, m, ordem, busca, cont) {
  const { dias, datas, N } = ctx;
  const dataDe = t => datas[t].data;

  const distribuicao = dias.map((d, i) => ({
    dia: NOMES[d], pessoas: ordem.filter((_, p) => m.pos0[p] === i)
  }));

  const organistas = ordem.map((nome, p) => {
    const sequencia = [];
    datas.forEach((d, t) => { if (m.trab[t] === p) sequencia.push(NOMES[d.sem]); });
    return {
      nome, vezes: m.vezes[p], sequencia,
      diasDesdeUltimo: datas[datas.length - 1].dia - m.ult[p],
      quebras: m.ocorr.quebras.filter(x => x.p === p).length,
      consecutivos: m.ocorr.consecutivos.filter(x => x.p === p).length
    };
  });

  const quebras = m.ocorr.quebras.map(x => ({
    data: dataDe(x.t), organista: ordem[x.p], esperado: NOMES[x.esperado], real: NOMES[x.real]
  }));
  const consecutivos = m.ocorr.consecutivos.map(x => ({
    data: dataDe(x.t), anterior: dataDe(x.t - 1), organista: ordem[x.p]
  }));

  const violacoes = [
    { regra: "Toda data válida com exatamente uma organista", prioridade: "Obrigatória", quantidade: 0 },
    { regra: "Organista não toca duas vezes na mesma data", prioridade: "Obrigatória", quantidade: 0 },
    { regra: "Respeitar a sequência individual de dias", prioridade: "Obrigatória, se possível", quantidade: m.quebras },
    { regra: "Evitar trabalho em datas consecutivas", prioridade: "Obrigatória, se possível", quantidade: m.consec },
    { regra: "Distribuir trabalhos de maneira equilibrada (diferença entre quem mais e quem menos tocou)", prioridade: "Otimização", quantidade: m.desig },
    { regra: "Priorizar quem está há mais tempo sem trabalhar (datas em que outra foi escolhida)", prioridade: "Otimização", quantidade: m.desvios },
    { regra: "Desempatar alfabeticamente", prioridade: "Obrigatória", quantidade: 0 }
  ];

  const porDia = v => dias.map((d, i) => NOMES[d] + " " + v[i]).join(", ");
  const plural = (n, s, p) => n + " " + (n === 1 ? s : p);
  const justificativa = [];
  let comprovado = true;

  if (nivel >= 2) {
    justificativa.push(
      N >= an.nMin
        ? "Há " + plural(N, "organista", "organistas") + " e o mínimo para preencher todas as datas respeitando as sequências é " +
          an.nMin + " (" + porDia(an.L) + "): as sequências puderam ser respeitadas."
        : "Há " + plural(N, "organista", "organistas") + ", mas preencher todas as datas respeitando as sequências exige pelo menos " +
          an.nMin + " (mínimos por dia de início: " + porDia(an.L) + "). Com menos que isso é matematicamente impossível, então foi preciso quebrar sequências."
    );
  }
  if (nivel === 2) {
    comprovado = busca.exaustiva;
    justificativa.push(
      "Para evitar trabalhos em dias seguidos foram examinadas " + busca.examinadas + " distribuições iniciais" +
      (busca.exaustiva ? " (todas as combinações possíveis)" : " (busca limitada às mais equilibradas, por haver combinações demais)") +
      ". Em todas, o calendário só se completa com pelo menos " + plural(busca.minConsec, "trabalho", "trabalhos") +
      " em dias seguidos; esse é o menor número possível. Ele é inevitável quando, em duas datas seguidas, a única organista na vez do segundo dia é a que acabou de tocar."
    );
  }
  if (nivel === 3) {
    comprovado = cont.comprovado;
    justificativa.push(
      cont.comprovado
        ? "O mínimo de " + plural(m.quebras, "quebra de sequência", "quebras de sequência") + " e, dentre as soluções com esse mínimo, " +
          plural(m.consec, "trabalho", "trabalhos") + " em dias seguidos, foi comprovado por programação dinâmica sobre os " +
          cont.estados + " estados possíveis (busca exaustiva)."
        : "O número de quebras não foi comprovado como mínimo: o caso é grande demais para a busca exaustiva e foi usada uma solução aproximada."
    );
  }

  return {
    nivel, classificacao: CLASSIFICACAO[nivel], comprovado,
    totalDatas: datas.length,
    viabilidade: {
      dias: dias.map(d => NOMES[d]), ocorrencias: an.C, minimos: an.L, nMin: an.nMin, N,
      sequenciaViavel: N >= an.nMin
    },
    distribuicao, violacoes, quebras, consecutivos, organistas, justificativa
  };
}

// Mantém só as linhas dos meses selecionados (1 a 12).
// O rodízio é calculado para o ano todo e depois filtrado,
// assim a sequência das organistas continua igual em qualquer período.
function filtrarPorMeses(linhas, meses) {
  return linhas.filter(l => meses.includes(parseInt(l[1].slice(3, 5), 10)));
}
