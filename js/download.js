/* Download dos arquivos gerados (planilha e PDF) */

async function salvarArquivo(nome, dados, tipo) {
  try {
    const dl = window.claude && await window.claude.use("downloads");
    if (dl) { await dl.save({ filename: nome, data: dados }); return; }
  } catch (e) {
    if (e && e.code === "declined") return;
  }
  // alternativa quando a página é aberta como arquivo local
  const url = URL.createObjectURL(new Blob([dados], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function baixarPlanilha() {
  if (!linhasFinais.length) return;
  await salvarArquivo("rodizio-" + $("ano").value + ".xlsx", montarXlsx(linhasFinais),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function baixarPdf() {
  if (!linhasFinais.length) return;
  await salvarArquivo("rodizio-" + $("ano").value + ".pdf", montarPdf(linhasFinais, $("ano").value), "application/pdf");
}
