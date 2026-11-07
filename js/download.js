/* Download do arquivo gerado */

async function baixar() {
  if (!linhasFinais.length) return;
  const dados = montarXlsx(linhasFinais);
  const nome = "rodizio-" + $("ano").value + ".xlsx";
  try {
    const dl = window.claude && await window.claude.use("downloads");
    if (dl) { await dl.save({ filename: nome, data: dados }); return; }
  } catch (e) {
    if (e && e.code === "declined") return;
  }
  // alternativa quando a página é aberta como arquivo local
  const url = URL.createObjectURL(new Blob([dados], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url; a.download = nome;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
