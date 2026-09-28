// Every check receives the installed package namespace used by the application.
// A successful basic format round trip does not imply lossless Excel fidelity.
export const FEATURE_GROUPS = [
  {id: 'formats', label: 'Formatos', description: 'Gravação e leitura de dados básicos; cada formato tem limites próprios.'},
  {id: 'workbooks', label: 'Pastas e células', description: 'Tipos, fórmulas armazenadas, metadados e estrutura das planilhas.'},
  {id: 'utils', label: 'Conversões e utilitários', description: 'JSON, matrizes, CSV, HTML e endereços de células.'},
  {id: 'formatting', label: 'Datas e formatos numéricos', description: 'SSF, datas seriais, separadores e segundos fracionários.'},
  {id: 'codepages', label: 'Codificações', description: 'Conversores reais do pacote e independência dos dados retornados.'},
  {id: 'containers', label: 'Contêineres CFB e ZIP', description: 'Fluxos binários e rejeição de ciclo FAT em execução isolada.'},
  {id: 'limits', label: 'Limites explícitos', description: 'Recursos que esta biblioteca não implementa ou não garante.'}
];

const definitions = [
  ['xlsx', 'Excel XLSX', 'xlsx', true], ['xlsm', 'Excel XLSM', 'xlsm', true],
  ['xlam', 'Excel XLAM', 'xlam', true], ['xlsb', 'Excel XLSB', 'xlsb', true],
  ['xls', 'Excel XLS / BIFF8', 'xls', true], ['xla', 'Excel XLA', 'xla', true],
  ['biff8', 'BIFF8', 'xls', true], ['biff5', 'BIFF5', 'xls', true],
  ['biff4', 'BIFF4', 'xls', false], ['biff3', 'BIFF3', 'xls', false],
  ['biff2', 'BIFF2', 'xls', false], ['xlml', 'Excel XML 2003', 'xml', true],
  ['xml', 'Excel XML 2003 (alias)', 'xml', true], ['ods', 'OpenDocument ODS', 'ods', true],
  ['fods', 'OpenDocument XML FODS', 'fods', true], ['csv', 'CSV', 'csv', false],
  ['txt', 'Texto UTF-16 / TSV', 'txt', false], ['sylk', 'SYLK', 'slk', false],
  ['slk', 'SYLK (alias)', 'slk', false], ['html', 'Tabela HTML', 'html', false],
  ['htm', 'Tabela HTML (alias)', 'html', false], ['dif', 'DIF', 'dif', false],
  ['rtf', 'Tabela RTF', 'rtf', false], ['prn', 'Texto de largura fixa PRN', 'prn', false],
  ['eth', 'EtherCalc', 'eth', false], ['dbf', 'dBASE DBF', 'dbf', false],
  ['numbers', 'Apple Numbers', 'numbers', true], ['wk1', 'Lotus WK1', 'wk1', false],
  ['wk3', 'Lotus WK3', 'wk3', true]
];
const formulaFormats = new Set(['xlsx', 'xlsm', 'xlam', 'xml', 'xlml', 'ods', 'fods', 'slk', 'sylk', 'eth']);
const legacyUnicode = new Set(['biff2', 'biff3', 'biff4', 'biff5', 'wk1', 'wk3', 'dbf', 'rtf', 'slk', 'sylk', 'dif', 'prn']);
const textFormats = new Set(['xml', 'xlml', 'fods', 'csv', 'sylk', 'slk', 'html', 'htm', 'dif', 'rtf', 'prn', 'eth']);

export const FORMAT_OPTIONS = definitions.map(([value, label, extension, multiSheet]) => {
  const notes = [multiSheet ? 'Pode conter várias planilhas.' : 'Exporta uma planilha por arquivo.'];
  if (!formulaFormats.has(value)) notes.push('O teste de fórmula criada em JavaScript preserva o valor em cache; não garante a expressão.');
  if (legacyUnicode.has(value)) notes.push('Unicode e tipos podem sofrer perdas ou depender da codificação.');
  if (value === 'dbf') notes.push('Nomes de campos, comprimentos e tipos seguem os limites DBF.');
  if (value === 'wk1' || value === 'wk3') notes.push('Valores booleanos podem voltar como texto.');
  if (value === 'prn') notes.push('A leitura requer a opção PRN.');
  if (value === 'numbers') notes.push('Requer o payload xlsx.zahl do mesmo pacote.');
  if (value === 'numbers' || value === 'wk3') notes.push('A verificação inclui números negativos; consulte o resultado antes de confiar nestes valores.');
  if (['xlsm', 'xlam', 'xla'].includes(value)) notes.push('Escolher esta extensão não cria nem executa macros.');
  return {value, label, extension, multiSheet, binary: !textFormats.has(value),
    preservesFormula: formulaFormats.has(value), unicode: legacyUnicode.has(value) ? 'limited' : 'supported',
    requires: value === 'numbers' ? 'numbersPayload' : null,
    readOptions: value === 'prn' ? {PRN: true} : {}, description: notes.join(' ')};
});

export function sampleWorkbook(XLSX) {
  const utils = XLSX.utils;
  const workbook = utils.book_new();
  const data = utils.aoa_to_sheet([
    ['Produto', 'Quantidade', 'Preço', 'Total', 'Data', 'Ativo', 'Observação'],
    ['Café ☕', 3, 12.5, 37.5, new Date(Date.UTC(2026, 8, 27)), true, 'Ação, vírgulas e "aspas"'],
    ['日本 🧪', 2, 9.75, 19.5, new Date(Date.UTC(2026, 8, 28)), false, 'Texto com\nquebra de linha'],
    ['Crédito', 1, -7.25, -7.25, new Date(Date.UTC(2026, 8, 29)), true, null]
  ], {cellDates: true, dateNF: 'dd.mm.yyyy', UTC: true});
  for (let row = 2; row <= 4; row++) {
    data[`D${row}`].f = `B${row}*C${row}`;
    utils.cell_set_number_format(data[`C${row}`], '#,##0.00');
    utils.cell_set_number_format(data[`D${row}`], '#,##0.00');
    utils.cell_set_number_format(data[`E${row}`], 'dd.mm.yyyy');
  }
  data['!cols'] = [{wch: 20}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 14}, {wch: 10}, {wch: 35}];
  data['!rows'] = [{hpt: 24}, {}, {}, {hidden: true}];
  data['!autofilter'] = {ref: 'A1:G4'};
  utils.cell_add_comment(data.A2, 'Comentário de demonstração: texto e Unicode.', 'Stackline');
  utils.book_append_sheet(workbook, data, 'Dados');

  const summary = utils.aoa_to_sheet([
    ['Resumo da demonstração'], ['Indicador', 'Valor'], ['Total em cache', 49.75],
    ['Linhas de dados', 3], ['Aviso', 'Fórmulas são armazenadas; a biblioteca não calcula resultados.']
  ]);
  summary.B3.f = 'SUM(Dados!D2:D4)';
  summary['!merges'] = [utils.decode_range('A1:D1')];
  summary['!cols'] = [{wch: 24}, {wch: 48}];
  utils.cell_set_internal_link(summary.A3, 'Dados!A1', 'Abrir os dados');
  utils.book_append_sheet(workbook, summary, 'Resumo');

  const details = utils.aoa_to_sheet([
    ['Recurso', 'Exemplo'], ['Site', 'https://github.com/alexandroit/sheetjs'],
    ['Texto literal', '=1+1'], ['Booleano', true], ['Número', 42.25],
    ['Célula vazia', null], ['Versão carregada', XLSX.version]
  ]);
  utils.cell_set_hyperlink(details.B2, 'https://github.com/alexandroit/sheetjs', 'Código do projeto');
  utils.book_append_sheet(workbook, details, 'Detalhes');
  workbook.Props = {Title: 'Playground Stackline XLSX', Subject: 'Recursos e limites', Author: 'Stackline', Comments: 'Valores de fórmulas foram fornecidos pela demonstração.'};
  workbook.Custprops = {Origem: 'Playground local', Versao: XLSX.version};
  return workbook;
}

function expect(condition, message) { if (!condition) throw new Error(message); }
function equal(actual, expected, message) {
  expect(JSON.stringify(actual) === JSON.stringify(expected), `${message}: esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}`);
}
function skipped(detail) { return {skip: true, detail}; }
function bytes(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return Uint8Array.from(value);
}
function smallWorkbook(XLSX) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Name', 'Value'], ['Alice', 42], ['Bob', -7.5]]), 'Dados');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Second'], [123]]), 'Extra');
  return workbook;
}
function roundTrip(XLSX, workbook, writeOptions = {}, readOptions = {}) {
  const data = XLSX.write(workbook, {bookType: 'xlsx', type: 'array', ...writeOptions});
  return {data, workbook: XLSX.read(data, {type: 'array', ...readOptions})};
}

function cyclicCFB(XLSX) {
  const CFB = XLSX.CFB;
  const file = CFB.utils.cfb_new();
  CFB.utils.cfb_add(file, 'large', new Uint8Array(8192).fill(65));
  const data = bytes(CFB.write(file, {type: 'buffer'})).slice();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const size = 1 << view.getUint16(30, true), directory = view.getInt32(48, true), fat = view.getInt32(76, true);
  let entry = -1;
  for (let offset = (directory + 1) * size; offset < (directory + 2) * size; offset += 128) {
    const length = view.getUint16(offset + 64, true);
    let name = '';
    for (let i = 0; i < length - 2; i += 2) name += String.fromCharCode(view.getUint16(offset + i, true));
    if (name === 'large') entry = offset;
  }
  expect(entry >= 0, 'Fluxo da fixture CFB não encontrado');
  const first = view.getInt32(entry + 116, true), second = view.getInt32((fat + 1) * size + first * 4, true);
  view.setInt32(entry + 116, second, true);
  view.setInt32((fat + 1) * size + second * 4, second, true);
  return data;
}

async function checkCyclicCFB(XLSX, options) {
  if (typeof Worker === 'undefined' || !options.runtimeModuleUrl) return skipped('Requer Worker e a URL do módulo instalado para executar a entrada inválida com limite de tempo.');
  const moduleUrl = new URL(options.runtimeModuleUrl, location.href).href;
  const script = `import * as XLSX from ${JSON.stringify(moduleUrl)};
onmessage = ({data}) => { try { XLSX.CFB.read(new Uint8Array(data), {type:'buffer'}); postMessage({ok:false, detail:'O ciclo não foi rejeitado'}); }
catch(error) { postMessage({ok:/Cycle detected in FAT chain/.test(error.message), detail:error.message}); } };`;
  const url = URL.createObjectURL(new Blob([script], {type: 'text/javascript'}));
  const worker = new Worker(url, {type: 'module'});
  try {
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('O Worker excedeu 4 segundos; execução interrompida.')); }, 4000);
      worker.onmessage = ({data}) => { clearTimeout(timer); data.ok ? resolve('Ciclo FAT rejeitado em Worker isolado.') : reject(new Error(data.detail)); };
      worker.onerror = event => { clearTimeout(timer); reject(new Error(event.message || 'Falha ao executar o Worker')); };
      worker.postMessage(cyclicCFB(XLSX));
    });
  } finally { worker.terminate(); URL.revokeObjectURL(url); }
}

export async function runBrowserChecks(XLSX, codepage, onResult = () => {}, options = {}) {
  const results = [];
  const checks = [];
  const add = (id, group, label, run) => checks.push({id, group, label, run});
  const utils = XLSX.utils;
  if (codepage && XLSX.set_cptable) XLSX.set_cptable(codepage);

  add('identity', 'workbooks', 'Versão exata instalada', () => {
    equal(XLSX.version, options.expectedVersion || '1.0.8-verdaccio.1', 'Versão do runtime');
    return `@stackline/xlsx ${XLSX.version}; verificação funcional do namespace fornecido pelo aplicativo.`;
  });

  for (const format of FORMAT_OPTIONS) add(`format-${format.value}`, 'formats', `${format.label}: gravar e ler`, () => {
    if (format.requires && !options.numbersPayload) return skipped('Carregue xlsx.zahl.mjs para testar a exportação NUMBERS.');
    const writeOptions = {bookType: format.value, sheet: 'Dados', compression: true};
    if (format.value === 'numbers') writeOptions.numbers = options.numbersPayload;
    const {data, workbook} = roundTrip(XLSX, smallWorkbook(XLSX), writeOptions, format.readOptions);
    expect(bytes(data).length > 0, 'Arquivo vazio');
    const rows = utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, raw: true});
    equal(rows.slice(0, 3).map(row => row.slice(0, 2).map(String)), [['Name', 'Value'], ['Alice', '42'], ['Bob', '-7.5']], 'Dados básicos');
    if (format.multiSheet) equal(workbook.SheetNames.length, 2, 'Quantidade de planilhas');
    return `${bytes(data).length.toLocaleString('pt-BR')} bytes; texto ASCII e valores básicos conferidos. ${format.description}`;
  });

  add('typed-cells', 'workbooks', 'Unicode, números, booleanos e datas em XLSX', () => {
    const workbook = utils.book_new();
    const sheet = utils.aoa_to_sheet([['Texto', 'Número', 'Booleano', 'Data'], ['Ação 日本 🧪', 42.25, false, new Date(Date.UTC(2020, 0, 1))]], {cellDates: true, UTC: true});
    utils.book_append_sheet(workbook, sheet, 'Tipos');
    const parsed = roundTrip(XLSX, workbook, {}, {cellDates: true}).workbook.Sheets.Tipos;
    equal([parsed.A2.v, parsed.B2.v, parsed.C2.v], ['Ação 日本 🧪', 42.25, false], 'Valores');
    equal([parsed.A2.t, parsed.B2.t, parsed.C2.t, parsed.D2.t], ['s', 'n', 'b', 'd'], 'Tipos de células');
    equal(parsed.D2.v.toISOString().slice(0, 10), '2020-01-01', 'Data');
    return 'Unicode, tipos primitivos e data preservados no arquivo XLSX.';
  });

  add('formula-cache', 'workbooks', 'Fórmula e valor em cache, sem cálculo', () => {
    const workbook = smallWorkbook(XLSX);
    workbook.Sheets.Dados.C1 = {t: 's', v: 'Fórmula'};
    workbook.Sheets.Dados.C2 = {t: 'n', f: 'B2*2', v: 85};
    workbook.Sheets.Dados['!ref'] = 'A1:C3';
    const parsed = roundTrip(XLSX, workbook).workbook.Sheets.Dados.C2;
    equal([parsed.f, parsed.v], ['B2*2', 85], 'Fórmula e cache');
    return 'B2 vale 42, mas o cache fornecido foi 85 e permaneceu 85: a biblioteca não calculou 84.';
  });

  add('metadata', 'workbooks', 'Mesclas, links, comentários e propriedades', () => {
    const workbook = sampleWorkbook(XLSX);
    utils.book_set_sheet_visibility(workbook, 'Detalhes', 1);
    const parsed = roundTrip(XLSX, workbook, {cellStyles: true}, {cellStyles: true}).workbook;
    equal(parsed.SheetNames, ['Dados', 'Resumo', 'Detalhes'], 'Nomes');
    equal(utils.encode_range(parsed.Sheets.Resumo['!merges'][0]), 'A1:D1', 'Mescla');
    expect(parsed.Sheets.Dados.A2.c[0].t.includes('Unicode'), 'Comentário ausente');
    equal(parsed.Sheets.Detalhes.B2.l.Target, 'https://github.com/alexandroit/sheetjs', 'Hyperlink');
    equal(parsed.Props.Title, workbook.Props.Title, 'Título');
    equal(parsed.Custprops.Origem, 'Playground local', 'Propriedade personalizada');
    equal(parsed.Workbook.Sheets[2].Hidden, 1, 'Planilha oculta');
    expect(parsed.Sheets.Dados['!rows'][3].hidden, 'Linha oculta não preservada');
    expect(parsed.Sheets.Dados['!cols'][0].width > 0, 'Largura da coluna ausente');
    equal(parsed.Sheets.Dados['!autofilter'].ref, 'A1:G4', 'Autofiltro');
    return 'Estrutura e metadados conferidos; isto não verifica fidelidade visual completa do Excel.';
  });

  add('read-options', 'workbooks', 'Leitura densa, limite de linhas e seleção de planilhas', () => {
    const {data} = roundTrip(XLSX, smallWorkbook(XLSX));
    const dense = XLSX.read(data, {type: 'array', dense: true, sheetRows: 2, sheets: ['Dados']});
    expect(Array.isArray(dense.Sheets.Dados['!data']), 'Planilha densa ausente');
    equal(utils.sheet_to_json(dense.Sheets.Dados, {header: 1}).length, 2, 'Limite de linhas retornadas');
    expect(!dense.Sheets.Extra, 'A opção sheets:["Dados"] também materializou Extra neste runtime');
    return 'Dados densos e seleção conferidos. sheetRows limita o resultado; este teste não mede uso máximo de memória.';
  });

  add('book-validation', 'workbooks', 'Nomes duplicados e nomes inválidos de planilha', () => {
    const workbook = smallWorkbook(XLSX);
    let errors = 0;
    try { utils.book_append_sheet(workbook, utils.aoa_to_sheet([[1]]), 'Dados'); } catch { errors++; }
    try { utils.book_append_sheet(workbook, utils.aoa_to_sheet([[1]]), 'Nome/inválido'); } catch { errors++; }
    equal(errors, 2, 'Nomes rejeitados');
    return 'Erros previsíveis para duplicação e caracteres inválidos.';
  });

  add('addresses', 'utils', 'Endereços A1, colunas, linhas e intervalos', () => {
    equal(utils.encode_cell({r: 1048575, c: 16383}), 'XFD1048576', 'Endereço');
    equal(utils.decode_cell('$BC$42'), {c: 54, r: 41}, 'Decodificação');
    equal(utils.decode_col('XFD'), 16383, 'Coluna');
    equal(utils.encode_col(26), 'AA', 'Coluna');
    equal(utils.encode_row(41), '42', 'Linha');
    equal(utils.decode_row('42'), 41, 'Linha');
    equal(utils.encode_range(utils.decode_range('B2:D9')), 'B2:D9', 'Intervalo');
    return 'Endereços e intervalos conferidos, incluindo o limite de coluna XLSX.';
  });

  add('json-aoa', 'utils', 'Objetos JSON, matrizes e acréscimo de linhas', () => {
    const sheet = utils.json_to_sheet([{nome: 'Ada', pontos: 7}], {header: ['nome', 'pontos']});
    utils.sheet_add_json(sheet, [{nome: 'Lin', pontos: 9}], {skipHeader: true, origin: -1});
    utils.sheet_add_aoa(sheet, [['Mia', 11]], {origin: -1});
    equal(utils.sheet_to_json(sheet).map(row => [row.nome, row.pontos]), [['Ada', 7], ['Lin', 9], ['Mia', 11]], 'Linhas');
    const dense = utils.aoa_to_sheet([['a', 'b'], [1, null]], {dense: true});
    equal(utils.sheet_to_json(dense, {header: 1, defval: null}), [['a', 'b'], [1, null]], 'Matriz densa');
    return 'Conversões e append funcionam com matrizes densas e objetos.';
  });

  add('dangerous-json-keys', 'utils', 'Chaves perigosas não alteram protótipos', () => {
    const marker = 'stacklinePlaygroundPolluted';
    expect(!Object.hasOwn(Object.prototype, marker), 'O ambiente já contém o marcador de teste');
    const row = JSON.parse(`{"nome":"Ada","__proto__":{"${marker}":true},"constructor":"entrada","prototype":"entrada"}`);
    const sheet = utils.json_to_sheet([row]);
    const output = utils.sheet_to_json(sheet);
    equal(output[0].nome, 'Ada', 'Campo normal');
    expect(!Object.hasOwn(output[0], '__proto__'), 'Chave __proto__ não foi removida');
    expect(!Object.hasOwn(Object.prototype, marker), 'Protótipo global foi alterado');
    return 'Chaves reservadas foram filtradas; o protótipo global permaneceu intacto neste caso.';
  });

  add('csv-txt', 'utils', 'CSV com aspas, delimitadores e quebras de linha', () => {
    const table = [['nome', 'texto'], ['Ada', 'vírgula, "aspas"\ne linha']];
    const sheet = utils.aoa_to_sheet(table);
    const csv = utils.sheet_to_csv(sheet, {FS: ';'});
    const parsed = XLSX.read(csv, {type: 'string', FS: ';', raw: true});
    equal(utils.sheet_to_json(parsed.Sheets[parsed.SheetNames[0]], {header: 1}), table, 'CSV');
    expect(utils.sheet_to_txt(sheet).length > 0, 'Saída TXT vazia');
    return 'CSV delimitado por ponto e vírgula preserva aspas e conteúdo multilinha; TXT também é gerado.';
  });

  add('html-dom', 'utils', 'Tabela DOM para planilha e pasta de trabalho', () => {
    if (typeof document === 'undefined') return skipped('Este teste usa a API DOM do navegador.');
    const table = document.createElement('table');
    table.innerHTML = '<tr><th>Nome</th><th>Valor</th></tr><tr><td>Ada</td><td>42</td></tr>';
    const sheet = utils.table_to_sheet(table);
    equal(utils.sheet_to_json(sheet, {header: 1}), [['Nome', 'Valor'], ['Ada', 42]], 'Tabela DOM');
    const workbook = utils.table_to_book(table, {sheet: 'DOM'});
    equal(workbook.SheetNames, ['DOM'], 'Nome DOM');
    utils.sheet_add_dom(sheet, table, {origin: -1});
    equal(utils.sheet_to_json(sheet, {header: 1}).length, 4, 'Append DOM');
    return 'Conversão realizada em elemento desconectado da página.';
  });

  add('html-links', 'utils', 'HTML: opção de filtragem de esquemas de links', () => {
    const sheet = utils.aoa_to_sheet([['link'], ['exemplo']]);
    utils.cell_set_hyperlink(sheet.A2, 'javascript:alert(1)');
    const html = utils.sheet_to_html(sheet, {sanitizeLinks: true});
    expect(!/href\s*=\s*["']javascript:/i.test(html), 'Esquema javascript permaneceu no href');
    utils.cell_set_hyperlink(sheet.A2, 'https://example.com/');
    expect(utils.sheet_to_html(sheet, {sanitizeLinks: true}).includes('https://example.com/'), 'HTTPS removido indevidamente');
    return 'A opção filtra esquemas de links. Não é um sanitizador geral de HTML.';
  });

  add('array-formulas', 'utils', 'Fórmulas matriciais e lista de fórmulas', () => {
    const sheet = utils.aoa_to_sheet([[1, 2], [3, 4]]);
    utils.sheet_set_array_formula(sheet, 'C1:C2', 'A1:A2*B1:B2');
    equal(sheet.C1.f, 'A1:A2*B1:B2', 'Fórmula matricial');
    equal(sheet.C1.F, 'C1:C2', 'Intervalo matricial');
    expect(utils.sheet_to_formulae(sheet).some(line => line.includes('A1:A2*B1:B2')), 'Fórmula ausente na lista');
    return 'Expressão e intervalo armazenados; nenhum resultado foi calculado.';
  });

  add('ssf-dates', 'formatting', 'SSF: pontos literais e segundos fracionários', () => {
    equal(XLSX.SSF.format('dd.mm.yyyy', 43831.5), '01.01.2020', 'Data');
    equal(XLSX.SSF.format('hh.mm.ss', 43831.5), '12.00.00', 'Hora');
    equal(XLSX.SSF.format('hh:mm:ss.000', 0.500001), '12:00:00.086', 'Fração de segundo');
    equal(XLSX.SSF.format('[s].000', 0.500001), '43200.086', 'Tempo acumulado');
    return 'Datas com pontos e arredondamento de segundos conferidos.';
  });

  add('ssf-numbers', 'formatting', 'SSF: números, percentuais e códigos de data', () => {
    equal(XLSX.SSF.format('#,##0.00', 1234.5), '1,234.50', 'Número');
    equal(XLSX.SSF.format('0.00%', 0.125), '12.50%', 'Percentual');
    const date = XLSX.SSF.parse_date_code(43831);
    equal([date.y, date.m, date.d], [2020, 1, 1], 'Data serial');
    expect(XLSX.SSF.is_date('dd.mm.yyyy'), 'Formato de data não identificado');
    expect(!XLSX.SSF.is_date('0.00'), 'Formato numérico identificado como data');
    equal(utils.format_cell({t: 'n', v: 42.5, z: '0.00'}), '42.50', 'Formato de célula');
    return 'Conversão de serial e formatação SSF verificadas.';
  });

  add('codepage-roundtrip', 'codepages', 'UTF-8, Windows-1252 e Shift-JIS', () => {
    if (!codepage?.utils) return skipped('Módulo cpexcel não fornecido.');
    for (const [cp, value] of [[65001, 'café 日本 🧪'], [1252, 'ação €'], [932, '日本']]) {
      expect(codepage.utils.hascp(cp), `Codepage ${cp} indisponível`);
      equal(codepage.utils.decode(cp, codepage.utils.encode(cp, value)), value, `Codepage ${cp}`);
    }
    return 'Texto conferido em três codificações suportadas.';
  });

  add('codepage-ownership', 'codepages', 'Saídas de codificação são independentes', () => {
    if (!codepage?.utils) return skipped('Módulo cpexcel não fornecido.');
    const first = codepage.utils.encode(65001, 'café');
    const original = Array.from(first);
    codepage.utils.encode(65001, 'AAAAAAAAAAAAAAAA');
    codepage.utils.decode(65001, codepage.utils.encode(65001, 'BBBBBBBB'));
    equal(Array.from(first), original, 'Primeira saída após chamadas seguintes');
    return 'O primeiro resultado não foi sobrescrito pelas operações seguintes.';
  });

  add('cfb-zip', 'containers', 'CFB e ZIP preservam fluxos pequenos e grandes', () => {
    const CFB = XLSX.CFB;
    const entries = {'nested/small': new TextEncoder().encode('café 日本'), large: new Uint8Array(8192).fill(73)};
    for (const [fileType, compression] of [['cfb', false], ['zip', false], ['zip', true]]) {
      const file = CFB.utils.cfb_new({root: 'Example'});
      for (const [name, value] of Object.entries(entries)) CFB.utils.cfb_add(file, name, value);
      const data = CFB.write(file, {type: 'buffer', fileType, compression});
      const parsed = CFB.read(data, {type: 'buffer'});
      for (const [name, value] of Object.entries(entries)) equal(Array.from(CFB.find(parsed, '/' + name).content), Array.from(value), `Fluxo ${name}`);
    }
    return 'CFB, ZIP armazenado e ZIP comprimido retornaram os mesmos bytes.';
  });
  add('cfb-cycle', 'containers', 'Ciclo FAT é rejeitado sem bloquear a página', () => checkCyclicCFB(XLSX, options));

  add('no-formula-engine', 'limits', 'Cálculo de fórmulas', () => skipped('A biblioteca armazena fórmulas e caches; não é um mecanismo de cálculo.'));
  add('no-style-fidelity', 'limits', 'Fidelidade visual completa do Excel', () => skipped('Fontes, temas, gráficos, imagens, tabelas dinâmicas e layout completo não são garantidos por estes testes.'));
  add('no-encryption', 'limits', 'Exportação de Excel criptografado', () => skipped('Esta demonstração não oferece exportação criptografada nem afirma que uma opção de senha criptografa o arquivo.'));
  add('no-vba-execution', 'limits', 'Execução ou criação de macros VBA', () => skipped('Extensões XLSM/XLAM não criam nem executam macros. Preservar um projeto VBA existente exige uma fixture própria.'));

  for (const check of checks) {
    const start = performance.now();
    let result;
    try {
      const outcome = await check.run();
      result = {id: check.id, group: check.group, label: check.label,
        status: outcome?.skip ? 'skipped' : 'passed', detail: outcome?.skip ? outcome.detail : String(outcome || 'Conferido.')};
    } catch (error) {
      result = {id: check.id, group: check.group, label: check.label, status: 'failed', detail: error?.message || String(error)};
    }
    result.durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push(result);
    await onResult(result);
    // Let the browser paint progress between synchronous parser/writer calls.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return results;
}
