/* Seleção do período / meses */

function montarMeses() {
  const box = $("meses");
  MESES.forEach((m, i) => {
    const l = document.createElement("label");
    const c = document.createElement("input");
    c.type = "checkbox"; c.value = i + 1;
    l.append(c, document.createTextNode(m));
    box.append(l);
  });
}

function mesesEscolhidos() {
  const p = $("per").value;
  if (p === "ano") return [1,2,3,4,5,6,7,8,9,10,11,12];
  if (p === "s1") return [1,2,3,4,5,6];
  if (p === "s2") return [7,8,9,10,11,12];
  return [...$("meses").querySelectorAll("input:checked")].map(c => parseInt(c.value));
}
