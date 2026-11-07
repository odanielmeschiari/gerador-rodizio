/* Seleção dos dias de culto */

function montarDias() {
  const box = $("dias");
  NOMES.forEach((d, k) => {
    const l = document.createElement("label");
    const c = document.createElement("input");
    c.type = "checkbox"; c.value = k;
    l.append(c, document.createTextNode(d));
    box.append(l);
  });
}

// dias marcados, sempre em ordem crescente da semana (DOM=0 ... SAB=6),
// independentemente da ordem em que o usuário marcou
function diasEscolhidos() {
  return [...$("dias").querySelectorAll("input:checked")]
    .map(c => parseInt(c.value))
    .sort((x, y) => x - y);
}
