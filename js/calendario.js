/* Cálculos de calendário (sem depender de Date) */

const bissexto = a => (a % 400 === 0) || (a % 4 === 0 && a % 100 !== 0);

// dia da semana de 1º de janeiro (0 = DOM)
const anoInicio = a => (a + Math.floor((a-1)/4) - Math.floor((a-1)/100) + Math.floor((a-1)/400)) % 7;
// dia da semana do dia N do ano (N começa em 1)
const diaAtual = (dia, ano) => (anoInicio(ano) + dia - 1) % 7;

function dataDoDia(dia, ano) {
  const feb = bissexto(ano) ? 29 : 28;
  const meses = [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let mes = 0;
  while (mes < 11 && dia > meses[mes]) { dia -= meses[mes]; mes++; }
  return String(dia).padStart(2,"0") + "/" + String(mes+1).padStart(2,"0") + "/" + ano;
}

const diasDoMes = (mes, ano) => [31, bissexto(ano) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];

// número do dia dentro do ano (1 = 1º de janeiro)
function diaDoAno(dia, mes, ano) {
  let n = dia;
  for (let m = 1; m < mes; m++) n += diasDoMes(m, ano);
  return n;
}

const formatarData = (dia, mes, ano) =>
  String(dia).padStart(2, "0") + "/" + String(mes).padStart(2, "0") + "/" + ano;

// "dd/mm/aaaa" -> nº de dias corridos (serve para medir intervalos entre datas)
function diasCorridos(data) {
  const [d, m, a] = data.split("/").map(Number);
  return Date.UTC(a, m - 1, d) / 86400000;
}
