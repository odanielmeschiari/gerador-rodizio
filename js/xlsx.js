/* Montagem do arquivo .xlsx (planilha, estilos e pacote OOXML) */

// escapa texto para dentro de XML
const esc = t => String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

function montarXlsx(linhas) {
  const cab = ["Dia", "Data", "Organista"];
  // largura das colunas = maior texto de cada coluna + folga, para nada ficar cortado
  const larg = cab.map((c, i) => {
    const m = Math.max(c.length, ...linhas.map(l => String(l[i]).length));
    return Math.max(i === 2 ? 22 : 12, Math.ceil(m * 1.25) + 6);
  });
  // estilos: 1 = cabeçalho | 2/3 = linha branca (centro/esquerda) | 4/5 = linha cinza (centro/esquerda)
  const cel = (ref, txt, st) => '<c r="' + ref + '" t="inlineStr" s="' + st + '"><is><t>' + esc(txt) + '</t></is></c>';
  let rows = '<row r="1" ht="26" customHeight="1">' + cab.map((c, i) => cel("ABC"[i] + "1", c, 1)).join("") + '</row>';
  linhas.forEach((l, k) => {
    const r = k + 2, cinza = k % 2 === 1;
    rows += '<row r="' + r + '" ht="20" customHeight="1">' + l.map((v, i) =>
      cel("ABC"[i] + r, v, (cinza ? 4 : 2) + (i === 2 ? 1 : 0))).join("") + '</row>';
  });
  const ult = linhas.length + 1;
  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="20"/>' +
    '<cols>' + larg.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join("") + '</cols>' +
    '<sheetData>' + rows + '</sheetData>' +
    '<autoFilter ref="A1:C' + ult + '"/>' +
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="portrait" fitToHeight="0"/>' +
    '</worksheet>';

  const borda = '<border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border>';
  const xf = (fill, font, h) => '<xf numFmtId="0" fontId="' + font + '" fillId="' + fill + '" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="' + h + '" vertical="center"' + (h === "left" ? ' indent="1"' : "") + '/></xf>';
  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF3F6F5C"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEDEDED"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + borda + '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    xf(2, 1, "center") + xf(3, 0, "center") + xf(3, 0, "left") + xf(4, 0, "center") + xf(4, 0, "left") + '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    ["[Content_Types].xml", X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ["_rels/.rels", X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ["xl/workbook.xml", X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rodízio" sheetId="1" r:id="rId1"/></sheets></workbook>'],
    ["xl/_rels/workbook.xml.rels", X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ["xl/styles.xml", styles],
    ["xl/worksheets/sheet1.xml", sheet]
  ]);
}
