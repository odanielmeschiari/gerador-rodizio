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

  // Prioridades: (fundamental) nenhum culto seguido da mesma organista; 1) nenhuma quebra de sequência;
  // 2) maior tempo possível entre dois trabalhos da mesma organista; 3) trabalhos igualmente divididos.
  let montagem = null, busca = null, cont = null;
  if (ctx.N >= an.nMin) {
    // 5. Buscar rodízio perfeito (nível 1): sequências respeitadas e nenhum culto seguido (busca exaustiva)
    busca = buscarSequencia(ctx, an);
    if (busca.minConsec === 0) montagem = melhorMontagem(ctx, busca.candidatas, null);
  }
  if (!montagem) {
    // 7/9. Sem rodízio perfeito: a regra fundamental vale mais que as sequências, então busca-se o
    // mínimo de cultos seguidos e, dentro dele, o mínimo de quebras de sequência (níveis 2 e 3)
    cont = resolverContingencia(ctx, an, busca);
    montagem = cont.montagem;
  }
  // classificação pelo resultado: 1 perfeito; 2 sequências respeitadas, mas com cultos seguidos
  // inevitáveis; 3 com quebras de sequência (por falta de organistas ou para evitar cultos seguidos)
  const nivel = montagem.quebras > 0 ? 3 : montagem.consec > 0 ? 2 : 1;

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

  // Em ordem de prioridade. `id` identifica a regra (a tela e os testes não dependem da posição).
  const violacoes = [
    { id: "cobertura", regra: "Toda data válida com exatamente uma organista", prioridade: "Obrigatória", quantidade: 0 },
    { id: "mesma-data", regra: "Organista não toca duas vezes na mesma data", prioridade: "Obrigatória", quantidade: 0 },
    { id: "consecutivos", regra: "Organista não toca em dois cultos seguidos (datas vizinhas da escala, não importa quantos dias as separem)", prioridade: "Fundamental", quantidade: m.consec },
    { id: "sequencia", regra: "Respeitar a sequência individual de dias (sem quebras de ordem)", prioridade: "Prioridade 1", quantidade: m.quebras },
    { id: "espera", regra: "Priorizar quem está há mais tempo sem trabalhar (datas em que outra foi escolhida)", prioridade: "Prioridade 2", quantidade: m.desvios },
    { id: "equilibrio", regra: "Distribuir trabalhos de maneira equilibrada (diferença entre quem mais e quem menos tocou)", prioridade: "Prioridade 3", quantidade: m.desig },
    { id: "alfabetica", regra: "Desempatar alfabeticamente", prioridade: "Obrigatória", quantidade: 0 }
  ];

  // menor intervalo entre dois trabalhos da mesma organista (dias corridos e cultos que ficaram no meio)
  let menorIntervalo = null;
  const ultimoT = new Array(N).fill(-1);
  datas.forEach((d, t) => {
    const p = m.trab[t];
    if (ultimoT[p] >= 0) {
      const dias = d.dia - datas[ultimoT[p]].dia, cultos = t - ultimoT[p] - 1;
      if (!menorIntervalo || dias < menorIntervalo.dias) menorIntervalo = { dias, cultos };
    }
    ultimoT[p] = t;
  });

  const porDia = v => dias.map((d, i) => NOMES[d] + " " + v[i]).join(", ");
  const plural = (n, s, p) => n + " " + (n === 1 ? s : p);
  const justificativa = [];
  let comprovado = true;

  if (nivel >= 2) {
    const exaustiva = busca ? (busca.exaustiva ? " (todas as combinações possíveis)" : " (busca limitada às mais equilibradas, por haver combinações demais)") : "";
    if (N < an.nMin) {
      justificativa.push(
        "Há " + plural(N, "organista", "organistas") + ", mas preencher todas as datas respeitando as sequências exige pelo menos " +
        an.nMin + " (mínimos por dia de início: " + porDia(an.L) + "). Com menos que isso é matematicamente impossível, então foi preciso quebrar sequências."
      );
    } else {
      justificativa.push(
        "Há " + plural(N, "organista", "organistas") + " e o mínimo para preencher todas as datas respeitando as sequências é " +
        an.nMin + " (" + porDia(an.L) + "): matematicamente as sequências caberiam."
      );
      if (busca && busca.minConsec > 0)
        justificativa.push(
          "Porém, foram examinadas " + plural(busca.examinadas, "distribuição inicial", "distribuições iniciais") + exaustiva +
          " e em todas, respeitando as sequências, pelo menos " + plural(busca.minConsec, "trabalho acontece", "trabalhos acontecem") +
          " em cultos seguidos (a única organista na vez do dia é a que acabou de tocar no culto anterior)."
        );
    }
    justificativa.push(
      "Cultos seguidos da mesma organista são proibidos e valem mais que as sequências; por isso as sequências só são quebradas quando não há outro jeito."
    );
    comprovado = cont.comprovado;
    justificativa.push(
      cont.comprovado
        ? "O mínimo de " + plural(m.consec, "trabalho", "trabalhos") + " em cultos seguidos e, dentre as soluções com esse mínimo, " +
          plural(m.quebras, "quebra de sequência", "quebras de sequência") + ", foi comprovado por programação dinâmica sobre os " +
          cont.estados + " estados possíveis (busca exaustiva)."
        : "Não foi comprovado que cultos seguidos e quebras de sequência estão no mínimo: o caso é grande demais para a busca exaustiva e foi usada uma solução aproximada."
    );
  }

  return {
    nivel, classificacao: CLASSIFICACAO[nivel], comprovado,
    totalDatas: datas.length,
    viabilidade: {
      dias: dias.map(d => NOMES[d]), ocorrencias: an.C, minimos: an.L, nMin: an.nMin, N,
      sequenciaViavel: N >= an.nMin
    },
    distribuicao, violacoes, menorIntervalo, quebras, consecutivos, organistas, justificativa
  };
}

// Mantém só as linhas dos meses selecionados (1 a 12).
// O rodízio é calculado para o ano todo e depois filtrado,
// assim a sequência das organistas continua igual em qualquer período.
function filtrarPorMeses(linhas, meses) {
  return linhas.filter(l => meses.includes(parseInt(l[1].slice(3, 5), 10)));
}
