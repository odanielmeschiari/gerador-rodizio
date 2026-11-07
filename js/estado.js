/* Estado da aplicação (compartilhado entre os módulos) */

let linhasFinais = [];   // linhas com as trocas aplicadas (o que vai para a planilha)
let linhasAtuais = [];   // linhas geradas pelo rodízio (sem trocas)
let nomesAtuais = [];
const trocas = {};       // data -> organista escolhida manualmente
const excluidos = new Set();   // datas "dd/mm/aaaa" que ficam fora do rodízio
let diasAtuais = [];           // dias da semana (0 = DOM ...) usados na última geração
