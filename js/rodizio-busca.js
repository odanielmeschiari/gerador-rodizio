/* Algoritmo de rodízio (Especificação 1.0), parte 2: busca das soluções (níveis 1, 2 e 3)
   e escolha de quem trabalha em cada data. Lógica pura. */

// Limites que protegem o navegador em casos extremos (muitas organistas). Dentro deles a busca é exaustiva.
const LIMITE_BUSCA = 150000;      // distribuições iniciais examinadas nos níveis 1 e 2
const LIMITE_DP = 12e6;           // células da tabela da programação dinâmica do nível 3
const LIMITE_RANKING = 2000;      // candidatas montadas por inteiro e comparadas entre si
const PESO_CONSEC = 1 << 16;      // custo = consecutivos * PESO_CONSEC + quebras (cultos seguidos valem mais; 2^16 > nº de datas)

// ---------------------------------------------------------------------------------------------
// Nível 1 (seção 6): sequências respeitadas. Dada a distribuição inicial a, o caminho das
// contagens é determinado: a cada data, uma organista sai da posição j e vai para j+1. Um trabalho em
// cultos seguidos (datas vizinhas da lista) é inevitável quando, nesse momento, a única na posição j é
// a que tocou no culto anterior.
// Devolve o número de trabalhos consecutivos inevitáveis, ou -1 se faltar organista em alguma data.
function contarConsecutivos(a, ctx, tmp) {
  const { k, datas } = ctx;
  for (let i = 0; i < k; i++) tmp[i] = a[i];
  let forcados = 0;
  for (let t = 0; t < datas.length; t++) {
    const d = datas[t], j = d.j, c = tmp[j];
    if (c < 1) return -1;
    if (t > 0 && c === 1 && (datas[t - 1].j + 1) % k === j) forcados++;
    tmp[j]--; tmp[(j + 1) % k]++;
  }
  return forcados;
}

// Examina TODAS as distribuições iniciais viáveis (seção 9.2: busca exaustiva, não tentativa isolada).
// minConsec === 0  -> existe rodízio perfeito (nível 1); senão, respeitar todas as sequências obriga
// pelo menos minConsec cultos seguidos, e o rodízio passa a ser resolvido por resolverContingencia.
function buscarSequencia(ctx, an) {
  const { k, N } = ctx;
  const total = totalDistribuicoes(N - an.nMin, k);
  const exaustiva = total <= LIMITE_BUSCA;
  const tmp = new Int32Array(k);
  let minConsec = Infinity, candidatas = [], examinadas = 0;
  const avaliar = a => {
    examinadas++;
    const c = contarConsecutivos(a, ctx, tmp);
    if (c < 0 || c > minConsec) return;
    if (c < minConsec) { minConsec = c; candidatas = []; }
    candidatas.push(a.slice());
  };
  if (exaustiva) percorrerDistribuicoes(an.L, N, avaliar);
  else distribuicoesProximasDoEquilibrio(an.L, N).forEach(avaliar);
  return { minConsec, candidatas, examinadas, total, exaustiva };
}

// ---------------------------------------------------------------------------------------------
// Níveis 2 e 3 (seção 9.3): permite quebrar sequências. Cultos seguidos são a regra fundamental e
// vêm primeiro: minimiza-se os consecutivos e, só depois, as quebras de sequência. Programação dinâmica
// sobre as contagens por posição, de trás para frente:
// V[t][s] = menor custo para preencher as datas t..fim partindo do estado s. É exata e cobre todos
// os estados possíveis. Quebra = tocar em data cujo dia não é o "próximo dia" da organista.
function construirDP(ctx) {
  const { k, N, datas } = ctx, D = datas.length;
  const S = totalDistribuicoes(N, k);
  if ((D + 1) * S > LIMITE_DP) return null;

  // todos os estados: formas de repartir N organistas entre as k posições
  const est = new Uint8Array(S * k), atual = Array(k);
  let n = 0;
  (function rec(i, resto) {
    if (i === k - 1) { atual[i] = resto; for (let x = 0; x < k; x++) est[n * k + x] = atual[x]; n++; return; }
    for (let e = 0; e <= resto; e++) { atual[i] = e; rec(i + 1, resto - e); }
  })(0, N);

  const pot = []; let p = 1;
  for (let i = 0; i < k; i++) { pot.push(p); p *= N + 1; }
  const chave = s => { let c = 0; for (let i = 0; i < k; i++) c += est[s * k + i] * pot[i]; return c; };
  const mapa = new Map();
  for (let s = 0; s < S; s++) mapa.set(chave(s), s);

  // mv[(s*k + q)*k + r] = estado depois de mover uma organista da posição q para a posição r
  const mv = new Int32Array(S * k * k).fill(-1);
  for (let s = 0; s < S; s++) {
    const c = chave(s);
    for (let q = 0; q < k; q++) {
      if (!est[s * k + q]) continue;
      for (let r = 0; r < k; r++) mv[(s * k + q) * k + r] = q === r ? s : mapa.get(c - pot[q] + pot[r]);
    }
  }

  // custo de tirar uma organista da posição q na data t (c = quantas esperam q)
  const custo = (t, q, c) => {
    const fpos = t > 0 ? (datas[t - 1].j + 1) % k : -1;   // onde está quem tocou no culto anterior
    return (q !== datas[t].j ? 1 : 0) + (q === fpos && c === 1 ? PESO_CONSEC : 0);
  };

  const V = new Int32Array((D + 1) * S);
  for (let t = D - 1; t >= 0; t--) {
    const r = (datas[t].j + 1) % k, off = t * S, prox = (t + 1) * S;
    for (let s = 0; s < S; s++) {
      let melhor = 0x3fffffff;
      for (let q = 0; q < k; q++) {
        const c = est[s * k + q];
        if (!c) continue;
        const v = custo(t, q, c) + V[prox + mv[(s * k + q) * k + r]];
        if (v < melhor) melhor = v;
      }
      V[off + s] = melhor;
    }
  }

  return {
    S, est, V,
    indice: a => mapa.get(a.reduce((c, x, i) => c + x * pot[i], 0)),
    mover: (s, q, r) => mv[(s * k + q) * k + r],
    // posições de onde se pode tirar a organista da data t sem piorar o custo ótimo (verifica o futuro)
    opcoes(t, s) {
      const r = (datas[t].j + 1) % k, alvo = V[t * S + s], Q = [];
      for (let q = 0; q < k; q++) {
        const c = est[s * k + q];
        if (c && custo(t, q, c) + V[(t + 1) * S + mv[(s * k + q) * k + r]] === alvo) Q.push(q);
      }
      return Q;
    },
    minimo: V.subarray(0, S).reduce((m, x) => Math.min(m, x), 0x3fffffff),
    otimas() {
      const lista = [], min = this.minimo;
      for (let s = 0; s < S; s++) if (V[s] === min) lista.push(Array.from(est.subarray(s * k, s * k + k)));
      return lista;
    }
  };
}

// Plano de reserva para quando o espaço de estados é grande demais para a programação dinâmica:
// distribuição proporcional aos mínimos L[i] e, ao faltar organista no dia (ou quando só restaria a que
// tocou no culto anterior), quebra a sequência de quem está no maior grupo. Não é comprovadamente
// ótimo (o relatório informa isso).
function planoGuloso(ctx, an) {
  const { k, N } = ctx, soma = somar(an.L);
  const a = an.L.map(l => Math.floor(N * l / soma));
  const resto = an.L.map((l, i) => [N * l / soma - a[i], i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (let x = 0; x < N - somar(a); x++) a[resto[x][1]]++;
  return {
    a,
    plano: { opcoes(t, s, cont) {
      const j = ctx.datas[t].j, fpos = t > 0 ? (ctx.datas[t - 1].j + 1) % k : -1;
      const livres = q => cont[q] - (q === fpos ? 1 : 0);   // sem contar a que tocou no culto anterior
      if (livres(j) >= 1) return [j];
      let m = -1;
      for (let q = 0; q < k; q++) if (livres(q) >= 1 && (m < 0 || livres(q) > livres(m))) m = q;
      if (m >= 0) return [m];
      m = 0;                                                 // só resta a do culto anterior (ex.: 1 organista)
      for (let q = 1; q < k; q++) if (cont[q] > cont[m]) m = q;
      return [cont[j] >= 1 ? j : m];
    } }
  };
}

// ---------------------------------------------------------------------------------------------
// Seção 4: escolha de quem trabalha, data por data, a partir de uma distribuição inicial a0.
// Entre as que aguardam o dia da data: (1) a que está há mais tempo sem trabalhar, (2) desempate
// alfabético (as organistas são numeradas em ordem alfabética; o menor número vence).
// A organista que tocou no culto anterior só é escolhida quando é a única opção.
// `plano` (nível 3) diz de quais posições se pode tirar alguém sem comprometer as datas futuras;
// sem plano (níveis 1 e 2) só concorre quem espera o dia da data.
function montarRodizio(ctx, a0, plano, completo) {
  const { k, N, datas, dias } = ctx, D = datas.length;
  const vagas = historicoInicial(a0, ctx);
  const pos = new Int8Array(N), ult = new Int32Array(N), pos0 = new Int8Array(N);
  vagas.forEach((v, p) => { pos[p] = v.pos; pos0[p] = v.pos; ult[p] = v.ult; });   // a mais antiga é a 1ª em ordem alfabética
  const cont = a0.slice();
  let s = plano && plano.indice ? plano.indice(a0) : -1;

  const trab = new Int16Array(D), vezes = new Int32Array(N), ultReal = new Int32Array(N).fill(-1e9);
  const ocorr = completo ? { quebras: [], consecutivos: [] } : null;
  let quebras = 0, consec = 0, desvios = 0, minGap = Infinity, somaQuad = 0, f = -1;

  for (let t = 0; t < D; t++) {
    const d = datas[t], j = d.j, r = (j + 1) % k;
    const fAtivo = f;   // quem tocou no culto anterior (-1 na primeira data)
    const Q = plano ? plano.opcoes(t, s, cont) : [j];
    const alvo = Q.includes(j) ? [j] : Q;

    let esc = -1, topo = -1;
    for (let p = 0; p < N; p++) if (pos[p] === j && (topo < 0 || ult[p] < ult[topo])) topo = p;
    for (const q of alvo) {
      let melhor = -1, repetida = -1;
      for (let p = 0; p < N; p++) {
        if (pos[p] !== q) continue;
        if (p === fAtivo) { repetida = p; continue; }
        if (melhor < 0 || ult[p] < ult[melhor]) melhor = p;
      }
      if (melhor < 0) melhor = repetida;
      if (melhor >= 0 && (esc < 0 || ult[melhor] < ult[esc])) esc = melhor;
    }
    if (esc < 0) throw new Error("Data sem organista: " + d.data);   // não ocorre: o plano garante

    if (topo >= 0 && esc !== topo) desvios++;
    if (pos[esc] !== j) {
      quebras++;
      if (completo) ocorr.quebras.push({ t, p: esc, esperado: dias[pos[esc]], real: d.sem });
    }
    if (esc === fAtivo) {
      consec++;
      if (completo) ocorr.consecutivos.push({ t, p: esc });
    }

    if (s >= 0) s = plano.mover(s, pos[esc], r);
    cont[pos[esc]]--; cont[r]++;
    pos[esc] = r;
    if (ultReal[esc] > -1e8) {
      const g = d.dia - ultReal[esc];
      if (g < minGap) minGap = g;
      somaQuad += g * g;
    }
    ultReal[esc] = d.dia; ult[esc] = d.dia;
    vezes[esc]++; trab[t] = esc; f = esc;
  }

  return {
    a0, trab, vezes, quebras, consec, desvios, minGap, somaQuad, pos0, ult, ocorr,
    desig: Math.max(...vezes) - Math.min(...vezes)
  };
}

// Ordem de prioridade entre montagens (seção 5 e tabela 3 da seção 9):
//   fundamental: nenhum culto seguido da mesma organista;
//   1) nenhuma quebra de sequência;
//   2) o maior tempo possível entre dois trabalhos da mesma organista (maior intervalo mínimo);
//   3) trabalhos igualmente divididos (menor diferença entre quem mais e quem menos tocou);
// e, para desempatar, intervalos mais uniformes (menor soma dos quadrados) e menos desvios da
// regra de quem espera mais.
function compararMontagens(x, y) {
  return x.consec - y.consec || x.quebras - y.quebras ||
    (x.minGap === y.minGap ? 0 : y.minGap > x.minGap ? 1 : -1) ||
    x.desig - y.desig || x.somaQuad - y.somaQuad || x.desvios - y.desvios;
}

// Dentre as distribuições candidatas (todas com o mesmo custo ótimo), monta o rodízio de cada uma e
// fica com a melhor. Se há candidatas demais, só as de grupos mais equilibrados entram na comparação.
function melhorMontagem(ctx, candidatas, plano) {
  if (candidatas.length > LIMITE_RANKING)
    candidatas = candidatas.map((a, i) => [desequilibrio(a), i]).sort((x, y) => x[0] - y[0] || x[1] - y[1])
      .slice(0, LIMITE_RANKING).map(x => candidatas[x[1]]);
  let melhor = null;
  for (const a of candidatas) {
    const m = montarRodizio(ctx, a, plano, false);
    if (!melhor || compararMontagens(m, melhor) < 0) melhor = m;
  }
  return montarRodizio(ctx, melhor.a0, plano, true);
}

// Níveis 2 e 3 completos: devolve a melhor montagem e se o mínimo (consecutivos, depois quebras) foi
// comprovado. `busca` (opcional) traz as distribuições do nível 1 e entra como ponto de partida extra
// quando só dá para usar o plano de reserva.
function resolverContingencia(ctx, an, busca) {
  const dp = construirDP(ctx);
  if (dp) {
    const montagem = melhorMontagem(ctx, dp.otimas(), dp);
    const custo = montagem.consec * PESO_CONSEC + montagem.quebras;
    return { montagem, comprovado: custo === dp.minimo, estados: dp.S };
  }
  const g = planoGuloso(ctx, an);
  const partidas = [g.a].concat(busca ? busca.candidatas : []);
  return { montagem: melhorMontagem(ctx, partidas, g.plano), comprovado: false, estados: 0 };
}
