/* Inicialização e ligação dos eventos */

$("ano").value = new Date().getFullYear();
$("per").addEventListener("change", () => {
  $("meses").style.display = $("per").value === "custom" ? "grid" : "none";
});
montarMeses();
$("gerar").addEventListener("click", gerar);
$("baixar").addEventListener("click", baixar);
$("limpar").addEventListener("click", () => {
  Object.keys(trocas).forEach(k => delete trocas[k]);
  renderizar();
});
montarDias();
addOrganista(false);
$("addOrg").addEventListener("click", () => addOrganista(true));
