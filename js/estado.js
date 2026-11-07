/* Estado da aplicação (compartilhado entre os módulos) */

let linhasFinais = [];   // linhas com as trocas aplicadas (o que vai para a planilha)
let linhasAtuais = [];   // linhas geradas pelo rodízio (sem trocas)
let nomesAtuais = [];
const trocas = {};       // data -> organista escolhida manualmente
