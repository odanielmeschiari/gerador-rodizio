/* Montagem do .pdf (tabela do rodízio, sem bibliotecas). Texto em Helvetica, codificação WinAnsi. */

// texto -> string de bytes (1 caractere = 1 byte) já escapada para dentro de um literal PDF
function textoPdf(t) {
  let s = "";
  for (const ch of String(t)) {
    const c = ch.charCodeAt(0);
    const b = c < 256 ? ch : "?";   // fora do Latin-1 (ex.: emojis) vira "?"
    s += (b === "(" || b === ")" || b === "\\") ? "\\" + b : b;
  }
  return s;
}

function montarPdf(linhas, ano) {
  const L = 595, A = 842, mx = 50, topo = 60, base = 55;   // A4 em pontos
  const hLin = 20, hCab = 26;
  const porPag = Math.floor((A - topo - base - 30 - hCab) / hLin);   // 30 = título
  const colX = [mx, mx + 70, mx + 180];                              // Dia | Data | Organista
  const num = n => (Math.round(n * 100) / 100).toString();
  const cor = (r, g, b) => num(r / 255) + " " + num(g / 255) + " " + num(b / 255);
  const texto = (x, y, t, fonte, tam, c) =>
    cor(...c) + " rg BT /" + fonte + " " + tam + " Tf " + num(x) + " " + num(y) + " Td (" + textoPdf(t) + ") Tj ET\n";
  const caixa = (x, y, w, h, c) => cor(...c) + " rg " + num(x) + " " + num(y) + " " + num(w) + " " + num(h) + " re f\n";

  const paginas = [];
  for (let i = 0; i < linhas.length; i += porPag) paginas.push(linhas.slice(i, i + porPag));
  if (!paginas.length) paginas.push([]);

  const conteudos = paginas.map((pag, p) => {
    let c = texto(mx, A - topo, "Rodízio de organistas - " + ano, "F2", 16, [31, 29, 26]);
    let y = A - topo - 30;
    c += caixa(mx, y - hCab, L - 2 * mx, hCab, [63, 111, 92]);
    ["Dia", "Data", "Organista"].forEach((t, i) => { c += texto(colX[i] + 8, y - 17, t, "F2", 11, [255, 255, 255]); });
    y -= hCab;
    pag.forEach((l, k) => {
      if (k % 2 === 1) c += caixa(mx, y - hLin, L - 2 * mx, hLin, [237, 237, 237]);
      const c3 = l[3] ? [255, 0, 0] : [31, 29, 26];   // dia excluído: letras vermelhas
      l.slice(0, 3).forEach((t, i) => { c += texto(colX[i] + 8, y - 14, t, "F1", 11, c3); });
      y -= hLin;
    });
    c += texto(L / 2 - 30, 30, "Página " + (p + 1) + " de " + paginas.length, "F1", 9, [107, 103, 95]);
    return c;
  });

  // objetos: 1 catálogo | 2 páginas | 3 e 4 fontes | depois, para cada página: objeto da página e do conteúdo
  const objs = [];
  const kids = paginas.map((_, p) => (5 + 2 * p) + " 0 R").join(" ");
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [" + kids + "] /Count " + paginas.length + " >>";
  objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  conteudos.forEach((c, p) => {
    objs[5 + 2 * p] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + L + " " + A + "] " +
      "/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (6 + 2 * p) + " 0 R >>";
    objs[6 + 2 * p] = "<< /Length " + c.length + " >>\nstream\n" + c + "endstream";
  });

  let pdf = "%PDF-1.4\n";
  const pos = [];
  for (let i = 1; i < objs.length; i++) {
    pos[i] = pdf.length;
    pdf += i + " 0 obj\n" + objs[i] + "\nendobj\n";
  }
  const xref = pdf.length;
  pdf += "xref\n0 " + objs.length + "\n0000000000 65535 f \n";
  for (let i = 1; i < objs.length; i++) pdf += String(pos[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size " + objs.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i);
  return bytes;
}
