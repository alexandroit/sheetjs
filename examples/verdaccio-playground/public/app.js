import * as XLSX from '/vendor/xlsx.mjs';
import * as codepage from '/vendor/cpexcel.full.mjs';
import numbersPayload from '/vendor/xlsx.zahl.mjs';
import { FORMAT_OPTIONS, FEATURE_GROUPS, sampleWorkbook, runBrowserChecks } from '/features.js';
XLSX.set_cptable(codepage);
const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = value => JSON.stringify(value, null, 2);
const state = { workbook: sampleWorkbook(XLSX), active: 0, address: 'A1', page: 0, column: 0, origin: 'Demonstração', results: [], identity: null, container: null, entry: null, busy: false, conversion: '' };
let noticeTimer;
function notice(message, error = false) { clearTimeout(noticeTimer); $('notice').textContent = message; $('notice').className = `notice${error ? ' error' : ''}`; $('notice').hidden = false; noticeTimer = setTimeout(() => $('notice').hidden = true, error ? 15000 : 6000); }
function bind(id, event, callback) { $(id).addEventListener(event, async (event) => { try {
    await callback(event);
}
catch (error) {
    notice(error.message, true);
} }); }
function action(id, callback) { bind(id, 'click', callback); }
function currentSheet() { return state.workbook.Sheets[state.workbook.SheetNames[state.active]]; }
function activeName() { return state.workbook.SheetNames[state.active]; }
function denseData(sheet) { return sheet['!data'] || (Array.isArray(sheet) ? sheet : null); }
function cellAt(sheet, address) { const dense = denseData(sheet); const { r, c } = XLSX.utils.decode_cell(address); return dense?.[r]?.[c] ?? sheet[address]; }
function setCell(sheet, address, cell) { const dense = denseData(sheet); const { r, c } = XLSX.utils.decode_cell(address); if (dense) {
    dense[r] ??= [];
    if (cell)
        dense[r][c] = cell;
    else
        delete dense[r][c];
}
else {
    if (cell)
        sheet[address] = cell;
    else
        delete sheet[address];
} }
function validCell(value) { const address = value.toUpperCase().trim(); if (!/^[A-Z]{1,3}[1-9][0-9]{0,6}$/.test(address))
    throw new Error('Use um endereço como A1 ou XFD1048576.'); const cell = XLSX.utils.decode_cell(address); if (cell.r > 1048575 || cell.c > 16383)
    throw new Error('Endereço fora dos limites do Excel.'); return address; }
function validRange(value) { const parts = value.split(':'); if (parts.length > 2)
    throw new Error('Intervalo inválido.'); parts.forEach(validCell); const range = XLSX.utils.decode_range(value.toUpperCase()); if (range.s.r > range.e.r || range.s.c > range.e.c)
    throw new Error('O início deve vir antes do fim do intervalo.'); return range; }
function rangeOf(sheet) { return sheet['!ref'] ? validRange(sheet['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }; }
function extendRange(sheet, address) { const p = XLSX.utils.decode_cell(address); const range = sheet['!ref'] ? rangeOf(sheet) : { s: { ...p }, e: { ...p } }; range.s.r = Math.min(range.s.r, p.r); range.s.c = Math.min(range.s.c, p.c); range.e.r = Math.max(range.e.r, p.r); range.e.c = Math.max(range.e.c, p.c); sheet['!ref'] = XLSX.utils.encode_range(range); }
function cellText(cell) { if (!cell)
    return ''; try {
    return XLSX.utils.format_cell(cell);
}
catch {
    return String(cell.v ?? '');
} }
function navigation() { const id = location.hash.slice(1) || 'workbook'; const target = $(id)?.classList.contains('view') ? id : 'workbook'; document.querySelectorAll('.view').forEach(view => view.hidden = view.id !== target); document.querySelectorAll('nav a').forEach(a => { a.classList.toggle('active', a.hash === `#${target}`); if (a.hash === `#${target}`)
    a.setAttribute('aria-current', 'page');
else
    a.removeAttribute('aria-current'); }); }
window.addEventListener('hashchange', navigation);
function renderWorkbook() {
    const wb = state.workbook, sheet = currentSheet();
    $('sheet-count').textContent = wb.SheetNames.length;
    $('sheet-range').textContent = sheet['!ref'] || 'Vazia';
    $('data-origin').textContent = state.origin;
    $('sheet-tabs').innerHTML = wb.SheetNames.map((name, i) => `<button role="tab" aria-selected="${i === state.active}" class="${i === state.active ? 'active' : ''}" data-sheet="${i}">${escape(name)}</button>`).join('');
    $('sheet-tabs').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.active = +button.dataset.sheet; state.page = 0; state.column = 0; state.address = 'A1'; renderWorkbook(); }));
    $('sheet-name').value = activeName();
    $('sheet-visibility').value = wb.Workbook?.Sheets?.[state.active]?.Hidden || 0;
    $('prop-title').value = wb.Props?.Title || '';
    $('prop-author').value = wb.Props?.Author || '';
    $('workbook-json').textContent = json({ sheet: activeName(), range: sheet['!ref'], fullRange: sheet['!fullref'], merges: sheet['!merges'], columns: sheet['!cols'], rows: sheet['!rows'], autofilter: sheet['!autofilter'], protect: sheet['!protect'], Props: wb.Props, Custprops: wb.Custprops, Workbook: wb.Workbook, vbaBytes: wb.vbaraw?.length || 0 });
    renderGrid();
    renderCell();
}
function renderGrid() {
    const sheet = currentSheet(), range = rangeOf(sheet), totalRows = range.e.r + 1, totalCols = range.e.c + 1;
    const pages = Math.max(1, Math.ceil(totalRows / 40));
    state.page = Math.min(state.page, pages - 1);
    state.column = Math.min(state.column, Math.max(0, totalCols - 1));
    const start = state.page * 40, end = Math.min(totalRows, start + 40), lastCol = Math.min(totalCols, state.column + 16);
    let html = '<table aria-label="Dados da planilha"><colgroup><col style="width:40px">';
    for (let c = state.column; c < lastCol; c++)
        html += `<col style="width:${Math.max(95, Math.min(280, (sheet['!cols']?.[c]?.wch || 16) * 7 + 16))}px">`;
    html += '</colgroup><thead><tr><th>#</th>';
    for (let c = state.column; c < lastCol; c++)
        html += `<th scope="col">${XLSX.utils.encode_col(c)}</th>`;
    html += '</tr></thead><tbody>';
    for (let r = start; r < end; r++) {
        html += `<tr class="${sheet['!rows']?.[r]?.hidden ? 'hidden-row' : ''}"><th scope="row" title="${sheet['!rows']?.[r]?.hidden ? 'Linha marcada como oculta' : ''}">${r + 1}</th>`;
        for (let c = state.column; c < lastCol; c++) {
            const address = XLSX.utils.encode_cell({ r, c }), cell = cellAt(sheet, address);
            html += `<td class="${address === state.address ? 'selected ' : ''}${cell?.f ? 'has-formula ' : ''}${r === 0 ? 'heading-cell' : ''}"><button data-address="${address}" title="${escape(`${address} · ${cellText(cell)}`)}" aria-label="${escape(`${address}: ${cellText(cell)}`)}">${escape(cellText(cell)) || '&nbsp;'}</button></td>`;
        }
        html += '</tr>';
    }
    $('grid').innerHTML = html + '</tbody></table>';
    $('grid').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.address = button.dataset.address; renderGrid(); renderCell(); }));
    $('grid-description').textContent = `Linhas ${start + 1}–${end} de ${totalRows} · ${lastCol - state.column} de ${totalCols} colunas · mesclas e linhas ocultas aparecem para inspeção`;
    $('page-label').textContent = `${state.page + 1} / ${pages}`;
    $('prev-page').disabled = state.page === 0;
    $('next-page').disabled = state.page >= pages - 1;
    $('start-column').value = XLSX.utils.encode_col(state.column);
}
function renderCell() { const cell = cellAt(currentSheet(), state.address) || { t: 's', v: '' }; $('selected-badge').textContent = state.address; $('cell-address').value = state.address; $('cell-type').value = cell.t || 's'; $('cell-value').value = cell.v instanceof Date ? cell.v.toISOString() : cell.v ?? ''; $('cell-formula').value = cell.f || ''; $('cell-format').value = cell.z || ''; $('cell-link').value = cell.l?.Target || ''; $('cell-comment').value = cell.c?.map(c => c.t).join('\n') || ''; $('cell-json').textContent = json(cell); }
function loadWorkbook(wb, origin) { if (!wb.SheetNames?.length)
    throw new Error('O arquivo não contém planilhas de dados.'); if ($('import-mode').value === 'append')
    for (const name of wb.SheetNames)
        XLSX.utils.book_append_sheet(state.workbook, wb.Sheets[name], name, true);
else
    state.workbook = wb; state.active = 0; state.page = 0; state.column = 0; state.address = 'A1'; state.origin = origin; renderWorkbook(); }
function download(data, name, type = 'application/octet-stream') { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = name.replace(/[\x00-\x1f/\\]/g, '_'); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
async function parseFile(file, kind = 'workbook') {
    if (!file)
        throw new Error('Selecione um arquivo.');
    if (file.size > 32 * 1024 * 1024)
        throw new Error('O limite desta demonstração é 32 MB.');
    const bytes = await file.arrayBuffer();
    const options = { cellDates: $('import-dates').checked, dense: $('import-dense').checked, raw: $('import-raw').checked, PRN: $('import-prn').checked, sheetRows: Math.max(0, Number($('import-rows').value) || 0), codepage: Number($('import-codepage').value), cellNF: true, cellStyles: true, cellFormula: true, bookVBA: true, password: $('import-password').value || undefined };
    return new Promise((resolve, reject) => { const worker = new Worker('/read-worker.mjs', { type: 'module' }); const timer = setTimeout(() => { worker.terminate(); reject(new Error('Leitura interrompida após 20 segundos. Tente um arquivo menor.')); }, 20000); const finish = () => { clearTimeout(timer); worker.terminate(); }; worker.onmessage = ({ data }) => { finish(); if (data.error)
        reject(new Error(data.error));
    else
        resolve(data); }; worker.onerror = () => { finish(); reject(new Error('Não foi possível ler o arquivo no worker.')); }; worker.postMessage({ kind, bytes, options }, [bytes]); });
}
async function importFile(file) { $('import-status').textContent = `Lendo ${file?.name || 'arquivo'}…`; try {
    const { workbook } = await parseFile(file);
    loadWorkbook(workbook, file.name);
    const truncated = workbook.SheetNames.some(name => workbook.Sheets[name]['!fullref']);
    $('import-status').textContent = `${file.name}: ${workbook.SheetNames.length} planilha(s) carregada(s).${truncated ? ' Leitura limitada: há linhas fora do limite escolhido.' : ''}`;
    notice('Arquivo carregado. Abra “Planilha” para editar.');
}
catch (error) {
    $('import-status').textContent = `Falha: ${error.message}`;
    throw error;
} }
action('sample', () => { state.workbook = sampleWorkbook(XLSX); state.active = 0; state.page = 0; state.column = 0; state.address = 'A1'; state.origin = 'Demonstração'; renderWorkbook(); notice('Exemplo restaurado.'); });
action('prev-page', () => { state.page--; renderGrid(); });
action('next-page', () => { state.page++; renderGrid(); });
bind('start-column', 'change', () => { const address = validCell(`${$('start-column').value}1`); state.column = XLSX.utils.decode_cell(address).c; renderGrid(); });
bind('cell-address', 'change', () => { state.address = validCell($('cell-address').value); renderCell(); renderGrid(); });
action('apply-cell', () => {
    const address = validCell($('cell-address').value), type = $('cell-type').value, raw = $('cell-value').value;
    let value = raw;
    if (type === 'n' || type === 'e') {
        value = Number(raw);
        if (raw.trim() === '' || !Number.isFinite(value))
            throw new Error('Informe um número válido.');
    }
    else if (type === 'b') {
        if (!['true', 'false', '1', '0', 'sim', 'não', 'nao'].includes(raw.toLowerCase()))
            throw new Error('Booleanos: true / false, sim / não ou 1 / 0.');
        value = ['true', '1', 'sim'].includes(raw.toLowerCase());
    }
    else if (type === 'd') {
        value = new Date(raw);
        if (Number.isNaN(+value))
            throw new Error('Use uma data ISO válida, por exemplo 2026-09-27.');
    }
    const cell = { t: type };
    if (type !== 'z')
        cell.v = value;
    if ($('cell-formula').value.trim())
        cell.f = $('cell-formula').value.trim().replace(/^=/, '');
    if ($('cell-format').value)
        XLSX.utils.cell_set_number_format(cell, $('cell-format').value);
    if ($('cell-link').value)
        XLSX.utils.cell_set_hyperlink(cell, $('cell-link').value);
    if ($('cell-comment').value)
        XLSX.utils.cell_add_comment(cell, $('cell-comment').value, 'Playground');
    setCell(currentSheet(), address, cell);
    extendRange(currentSheet(), address);
    state.address = address;
    renderWorkbook();
    notice(`${address} atualizada. Fórmulas mantêm o valor em cache informado.`);
});
action('clear-cell', () => { const address = validCell($('cell-address').value); setCell(currentSheet(), address, null); renderWorkbook(); });
action('append-row', () => { const sheet = currentSheet(), r = rangeOf(sheet).e.r + 1; if (r > 1048575)
    throw new Error('Limite de linhas atingido.'); XLSX.utils.sheet_add_aoa(sheet, [['Nova linha']], { origin: -1 }); state.address = `A${r + 1}`; state.page = Math.floor(r / 40); renderWorkbook(); });
action('add-sheet', () => { XLSX.utils.book_append_sheet(state.workbook, XLSX.utils.aoa_to_sheet([['Nova planilha']]), 'Planilha', true); state.active = state.workbook.SheetNames.length - 1; state.page = 0; state.address = 'A1'; renderWorkbook(); });
action('duplicate-sheet', () => { XLSX.utils.book_append_sheet(state.workbook, structuredClone(currentSheet()), activeName().slice(0, 24) + ' cópia', true); state.active = state.workbook.SheetNames.length - 1; renderWorkbook(); });
action('rename-sheet', () => { const name = $('sheet-name').value.trim(); if (!name || name.length > 31 || /[\[\]:*?/\\]/.test(name) || ['__proto__', 'constructor', 'prototype'].includes(name))
    throw new Error('Nome de planilha inválido.'); if (state.workbook.SheetNames.includes(name) && name !== activeName())
    throw new Error('Já existe uma planilha com esse nome.'); const old = activeName(); if (name === old)
    return; Object.defineProperty(state.workbook.Sheets, name, { value: currentSheet(), writable: true, enumerable: true, configurable: true }); delete state.workbook.Sheets[old]; state.workbook.SheetNames[state.active] = name; if (state.workbook.Workbook?.Sheets?.[state.active])
    state.workbook.Workbook.Sheets[state.active].name = name; renderWorkbook(); notice('Nome alterado. Referências em fórmulas não são reescritas automaticamente.'); });
action('delete-sheet', () => { if (state.workbook.SheetNames.length === 1)
    throw new Error('Mantenha pelo menos uma planilha.'); delete state.workbook.Sheets[activeName()]; state.workbook.SheetNames.splice(state.active, 1); state.workbook.Workbook?.Sheets?.splice(state.active, 1); state.active = 0; state.page = 0; renderWorkbook(); notice('Planilha removida da demonstração em memória.'); });
bind('sheet-visibility', 'change', () => { XLSX.utils.book_set_sheet_visibility(state.workbook, state.active, Number($('sheet-visibility').value)); renderWorkbook(); });
action('apply-properties', () => { state.workbook.Props = { ...state.workbook.Props, Title: $('prop-title').value, Author: $('prop-author').value }; renderWorkbook(); notice('Propriedades atualizadas.'); });
action('add-merge', () => { const range = validRange($('merge-range').value); const merges = currentSheet()['!merges'] || []; if (merges.some(m => m.s.r <= range.e.r && m.e.r >= range.s.r && m.s.c <= range.e.c && m.e.c >= range.s.c))
    throw new Error('Há uma mescla sobreposta.'); currentSheet()['!merges'] = [...merges, range]; extendRange(currentSheet(), XLSX.utils.encode_cell(range.e)); renderWorkbook(); notice('Mescla adicionada. O editor mostra células separadas para inspeção.'); });
action('clear-merges', () => { delete currentSheet()['!merges']; renderWorkbook(); });
action('apply-dimensions', () => { const col = XLSX.utils.decode_cell(validCell(`${$('dimension-col').value}1`)).c; const row = Number($('dimension-row').value) - 1, width = Number($('dimension-width').value); if (!Number.isInteger(row) || row < 0 || row > 1048575 || !Number.isFinite(width) || width < 1 || width > 100)
    throw new Error('Linha ou largura inválida.'); const sheet = currentSheet(); sheet['!cols'] ??= []; sheet['!rows'] ??= []; sheet['!cols'][col] = { ...sheet['!cols'][col], wch: width }; sheet['!rows'][row] = { ...sheet['!rows'][row], hidden: $('dimension-hidden').checked }; renderWorkbook(); notice('Dimensões aplicadas. Linhas ocultas permanecem visíveis para inspeção.'); });
bind('file-input', 'change', event => importFile(event.target.files[0]));
$('drop-zone').addEventListener('dragover', event => { event.preventDefault(); $('drop-zone').classList.add('over'); });
$('drop-zone').addEventListener('dragleave', () => $('drop-zone').classList.remove('over'));
bind('drop-zone', 'drop', async (event) => { event.preventDefault(); $('drop-zone').classList.remove('over'); await importFile(event.dataTransfer.files[0]); });
$('export-format').innerHTML = FORMAT_OPTIONS.map(f => `<option value="${f.value}">${escape(f.label)} (.${f.extension})</option>`).join('');
const selectedFormat = () => FORMAT_OPTIONS.find(f => f.value === $('export-format').value);
function formatDescription() { $('format-description').textContent = selectedFormat().description; }
bind('export-format', 'change', formatDescription);
const MAX_OPERATION_CELLS = 250000;
function assertOperationSize(sheets) { let area = 0; for (const sheet of sheets) {
    const range = rangeOf(sheet);
    area += (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
    if (area > MAX_OPERATION_CELLS)
        throw new Error('Esta demonstração limita conversões e exportações a 250.000 posições de células. Escolha um intervalo menor ou importe com limite de linhas.');
} }
function exportWorkbook() { const f = selectedFormat(); assertOperationSize(f.multiSheet ? state.workbook.SheetNames.map(name => state.workbook.Sheets[name]) : [currentSheet()]); const options = { type: 'array', bookType: f.value, sheet: activeName(), compression: $('export-compression').checked, bookSST: $('export-sst').checked, codepage: Number($('export-codepage').value), cellStyles: true }; if (f.value === 'numbers')
    options.numbers = numbersPayload; return XLSX.write(state.workbook, options); }
action('download-workbook', () => { const f = selectedFormat(), bytes = exportWorkbook(); download(bytes, `${$('export-name').value.trim() || 'stackline-teste'}.${f.extension}`); notice(`${f.label}: ${bytes.byteLength.toLocaleString('pt-BR')} bytes preparados para download.`); });
function compareWorkbooks(before, after, format) { const changes = []; let inspected = 0; const names = format.multiSheet ? before.SheetNames : [activeName()]; for (let i = 0; i < names.length; i++) {
    const a = before.Sheets[names[i]], b = after.Sheets[after.SheetNames[i]];
    if (!b) {
        changes.push({ sheet: names[i], change: 'Planilha ausente' });
        continue;
    }
    const range = rangeOf(a);
    for (let r = range.s.r; r <= range.e.r && inspected < 2000; r++)
        for (let c = range.s.c; c <= range.e.c && inspected < 2000; c++) {
            inspected++;
            const address = XLSX.utils.encode_cell({ r, c }), left = cellAt(a, address), right = cellAt(b, address);
            const reduced = cell => cell ? { t: cell.t, v: cell.v instanceof Date ? cell.v.toISOString() : cell.v, f: cell.f, z: cell.z, link: cell.l?.Target, comments: cell.c?.map(c => c.t) } : null;
            if (json(reduced(left)) !== json(reduced(right)) && changes.length < 100)
                changes.push({ sheet: names[i], cell: address, before: reduced(left), after: reduced(right) });
        }
} return { planilhasOriginais: names, planilhasRelidas: after.SheetNames, celulasInspecionadas: inspected, limiteDeInspecao: 2000, alteracoesExibidas: changes.length, limiteDeAlteracoesExibidas: 100, aviso: 'Diferenças incluem normalização de tipos e perda de recursos. Esta comparação não cobre todos os metadados.', alteracoes: changes }; }
action('roundtrip', () => { const f = selectedFormat(), bytes = exportWorkbook(), parsed = XLSX.read(bytes, { type: 'array', cellDates: true, cellNF: true, cellStyles: true, codepage: Number($('export-codepage').value), ...f.readOptions }); $('roundtrip-result').textContent = json({ formato: f.value, bytes: bytes.byteLength, ...compareWorkbooks(state.workbook, parsed, f) }); notice('Exportação e releitura concluídas. Confira as diferenças.'); });
function conversion() { const kind = $('convert-kind').value, range = $('convert-range').value.trim(); let sheet = currentSheet(); if (range) {
    validRange(range);
    sheet = Object.assign(Array.isArray(sheet) ? [] : {}, sheet, { '!ref': range.toUpperCase() });
} assertOperationSize([sheet]); const options = { raw: $('convert-raw').checked, skipHidden: $('convert-hidden').checked, defval: $('convert-defval').value || null, FS: $('convert-fs').value || ',', forceQuotes: $('convert-quotes').checked, sanitizeLinks: $('convert-links').checked }; let text; if (kind === 'json' || kind === 'aoa')
    text = json(XLSX.utils.sheet_to_json(sheet, { ...options, ...(kind === 'aoa' ? { header: 1 } : {}) }));
else if (kind === 'csv')
    text = XLSX.utils.sheet_to_csv(sheet, options);
else if (kind === 'txt')
    text = XLSX.utils.sheet_to_csv(sheet, { ...options, FS: '\t' });
else if (kind === 'html')
    text = XLSX.utils.sheet_to_html(sheet, options);
else
    text = XLSX.utils.sheet_to_formulae(sheet).join('\n'); state.conversion = text; $('convert-output').value = text; $('html-preview').hidden = kind !== 'html'; if (kind === 'html')
    $('html-preview').srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:12px system-ui;padding:12px}td{border:1px solid #ccc;padding:6px}table{border-collapse:collapse}a{pointer-events:none}</style>${text}`; }
action('convert-run', conversion);
action('convert-download', () => { conversion(); const kind = $('convert-kind').value; download(state.conversion, `conversao.${['json', 'aoa'].includes(kind) ? 'json' : kind === 'formulae' ? 'txt' : kind}`, 'text/plain;charset=utf-8'); });
action('paste-run', () => { const kind = $('paste-kind').value, text = $('paste-input').value; if (text.length > 2 * 1024 * 1024)
    throw new Error('Entrada de texto limitada a 2 MB.'); let sheet; if (kind === 'json') {
    const data = JSON.parse(text);
    if (!Array.isArray(data) || !data.length)
        throw new Error('Informe uma matriz ou uma lista de objetos não vazia.');
    sheet = Array.isArray(data[0]) ? XLSX.utils.aoa_to_sheet(data) : XLSX.utils.json_to_sheet(data);
}
else if (kind === 'csv') {
    const wb = XLSX.read(text, { type: 'string', raw: $('import-raw').checked, cellDates: true });
    sheet = wb.Sheets[wb.SheetNames[0]];
}
else {
    if (!/<table(?:\s|>)/i.test(text))
        throw new Error('A entrada deve conter uma tabela HTML.');
    // Parse HTML as workbook data without creating browser DOM resources.
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    sheet = workbook.Sheets[workbook.SheetNames[0]];
} XLSX.utils.book_append_sheet(state.workbook, sheet, 'Conversão', true); state.active = state.workbook.SheetNames.length - 1; state.page = 0; state.address = 'A1'; state.origin = 'Texto convertido'; renderWorkbook(); notice('Nova aba criada. Abra “Planilha” para inspecionar.'); });
function addressUtilities() { const value = $('address-input').value.trim().toUpperCase(), range = validRange(value), start = XLSX.utils.encode_cell(range.s); $('address-output').textContent = json({ entrada: value, indicesBaseZero: range, celulaInicial: XLSX.utils.decode_cell(start), split: XLSX.utils.split_cell(start), coluna: XLSX.utils.encode_col(range.s.c), linha: XLSX.utils.encode_row(range.s.r), intervalo: XLSX.utils.encode_range(range) }); }
action('address-run', addressUtilities);
function formatValue() { const f = $('ssf-format').value, n = Number($('ssf-value').value), date1904 = $('ssf-1904').checked; if (!Number.isFinite(n))
    throw new Error('Valor numérico inválido.'); $('ssf-result').textContent = XLSX.SSF.format(f, n, { date1904 }); $('ssf-detail').textContent = json({ formato: f, valor: n, is_date: XLSX.SSF.is_date(f), parse_date_code: XLSX.SSF.parse_date_code(n, { date1904 }), date1904 }); }
action('ssf-run', formatValue);
bind('ssf-preset', 'change', () => { $('ssf-format').value = $('ssf-preset').value; formatValue(); });
$('ssf-table').innerHTML = '<table><thead><tr><th>ID</th><th>Formato</th></tr></thead><tbody>' + Object.entries(XLSX.SSF.get_table()).map(([id, f]) => `<tr><td>${id}</td><td>${escape(f)}</td></tr>`).join('') + '</tbody></table>';
action('encode-run', () => { const cp = Number($('encoding-codepage').value), text = $('encoding-text').value; if (text.length > 100000)
    throw new Error('Limite: 100 mil caracteres.'); const bytes = codepage.utils.encode(cp, text), original = Array.from(bytes), decoded = codepage.utils.decode(cp, bytes); codepage.utils.encode(cp, 'outra chamada para testar independência'); $('encoding-result').textContent = json({ codepage: cp, bytes: bytes.length, hex: original.map(b => b.toString(16).padStart(2, '0')).join(' '), textoDecodificado: decoded, semPerda: decoded === text, bufferPreservado: json(original) === json(Array.from(bytes)) }); $('encoding-hex').value = original.map(b => b.toString(16).padStart(2, '0')).join(' '); });
action('decode-run', () => { const raw = $('encoding-hex').value.replace(/\s+/g, ''); if (!/^(?:[0-9a-fA-F]{2})*$/.test(raw) || raw.length > 200000)
    throw new Error('Informe pares hexadecimais válidos (até 100 mil bytes).'); const bytes = Uint8Array.from(raw.match(/../g) || [], h => parseInt(h, 16)); $('decoding-result').textContent = codepage.utils.decode(Number($('encoding-codepage').value), bytes); });
function cfbSample() { const c = XLSX.CFB.utils.cfb_new(); XLSX.CFB.utils.cfb_add(c, 'notas.txt', new TextEncoder().encode('Olá, Stackline!\nArquivo de demonstração.')); XLSX.CFB.utils.cfb_add(c, 'dados/amostra.csv', new TextEncoder().encode('Produto,Quantidade\nCafé,3\n')); state.container = c; state.entry = null; renderContainer(); }
function renderContainer() { const c = state.container; if (!c)
    return; $('cfb-entries').innerHTML = '<table><thead><tr><th>Entrada</th><th>Bytes</th></tr></thead><tbody>' + c.FullPaths.map((path, i) => `<tr><td><button data-entry="${i}">${escape(path)}</button></td><td>${c.FileIndex[i].size || 0}</td></tr>`).join('') + '</tbody></table>'; $('cfb-entries').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { state.entry = +button.dataset.entry; const entry = c.FileIndex[state.entry]; $('cfb-selected').textContent = c.FullPaths[state.entry]; const bytes = new Uint8Array(entry.content || []); $('cfb-preview').textContent = json({ nome: entry.name, tipo: entry.type, tamanho: entry.size, previewLimit: 4096, texto: new TextDecoder().decode(bytes.subarray(0, 4096)), hex: Array.from(bytes.subarray(0, 256), b => b.toString(16).padStart(2, '0')).join(' ') }); $('cfb-entry-name').value = c.FullPaths[state.entry].replace(/^[^/]+\//, ''); })); if (state.entry === null) {
    $('cfb-selected').textContent = 'Selecione uma entrada';
    $('cfb-preview').textContent = '';
} }
action('cfb-sample', cfbSample);
bind('cfb-file', 'change', async (event) => { const { container } = await parseFile(event.target.files[0], 'cfb'); state.container = container; state.entry = null; renderContainer(); notice('Contêiner carregado em memória.'); });
function requireContainer() { if (!state.container)
    throw new Error('Carregue um contêiner primeiro.'); return state.container; }
for (const type of ['zip', 'cfb'])
    action(`cfb-download-${type}`, () => { download(XLSX.CFB.write(requireContainer(), { type: 'array', fileType: type, compression: true }), `stackline-container.${type}`); });
action('cfb-add', () => { const c = requireContainer(), name = $('cfb-entry-name').value.trim(); if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').some(p => p === '..' || p === '.') || /[\x00-\x1f]/.test(name))
    throw new Error('Use um nome relativo como dados/notas.txt.'); XLSX.CFB.utils.cfb_add(c, name, new TextEncoder().encode($('cfb-entry-text').value)); XLSX.CFB.utils.cfb_gc(c); state.entry = null; renderContainer(); });
action('cfb-delete', () => { const c = requireContainer(), entry = c.FileIndex[state.entry]; if (!entry || entry.type !== 2 || entry.name === '\u0001Sh33tJ5')
    throw new Error('Selecione um arquivo de conteúdo para excluir.'); XLSX.CFB.utils.cfb_del(c, c.FullPaths[state.entry]); XLSX.CFB.utils.cfb_gc(c); state.entry = null; renderContainer(); });
action('cfb-download-entry', () => { const c = requireContainer(), entry = c.FileIndex[state.entry]; if (!entry || entry.type !== 2)
    throw new Error('Selecione uma entrada de arquivo.'); download(new Uint8Array(entry.content || []), entry.name); });
function renderResults() { const results = state.results; for (const status of ['passed', 'failed', 'skipped'])
    $(`test-${status}`).textContent = results.filter(r => r.status === status).length; const groups = [...FEATURE_GROUPS, { id: 'node', label: 'Node.js · arquivos, streams e módulos' }]; $('test-results').innerHTML = groups.map(group => { const matches = results.filter(r => r.group === group.id); if (!matches.length)
    return ''; return `<div class="test-group"><h3>${escape(group.label)}</h3>${matches.map(r => `<div class="test-row ${r.status}" data-test-id="${escape(r.id)}"><span class="status">${{ passed: 'PASSOU', failed: 'FALHOU', skipped: 'LIMITE' }[r.status] || escape(r.status)}</span><div>${escape(r.label)}<small>${escape(r.detail)}</small></div><time>${Number(r.durationMs).toFixed(0)} ms</time></div>`).join('')}</div>`; }).join(''); }
async function runTests(which) { if (state.busy)
    return; state.busy = true; const started = performance.now(); for (const id of ['tests-all', 'tests-browser', 'tests-node'])
    $(id).disabled = true; state.results = which === 'all' ? [] : state.results.filter(r => which === 'node' ? r.group !== 'node' : r.group === 'node'); renderResults(); try {
    if (which !== 'node') {
        $('test-status').textContent = 'Executando testes no navegador…';
        await runBrowserChecks(XLSX, codepage, result => { state.results.push(result); renderResults(); }, { numbersPayload, runtimeModuleUrl: '/vendor/xlsx.mjs', expectedVersion: state.identity?.version });
    }
    if (which !== 'browser') {
        $('test-status').textContent = 'Executando testes Node.js…';
        const response = await fetch('/api/node-checks', { method: 'POST' });
        const report = await response.json();
        if (!response.ok)
            throw new Error(report.error);
        state.results.push(...report.results);
        renderResults();
    }
    const failed = state.results.filter(r => r.status === 'failed').length;
    $('test-status').textContent = `Concluído em ${((performance.now() - started) / 1000).toFixed(1)} s · ${failed} falha(s).`;
    notice(failed ? `Validação concluída com ${failed} falha(s). Confira os casos em vermelho.` : 'Validação concluída.', Boolean(failed));
}
finally {
    state.busy = false;
    for (const id of ['tests-all', 'tests-browser', 'tests-node'])
        $(id).disabled = false;
} }
action('tests-all', () => runTests('all'));
action('tests-browser', () => runTests('browser'));
action('tests-node', () => runTests('node'));
action('tests-download', () => { download(json({ generatedAt: new Date().toISOString(), identity: state.identity, userAgent: navigator.userAgent, counts: Object.fromEntries(['passed', 'failed', 'skipped'].map(status => [status, state.results.filter(r => r.status === status).length])), results: state.results }), 'stackline-xlsx-test-report.json', 'application/json'); });
$('coverage-groups').innerHTML = FEATURE_GROUPS.map(g => `<div><h3>${escape(g.label)}</h3><p>${escape(g.description)}</p></div>`).join('') + '<div><h3>Integração Node.js</h3><p>CJS, ESM, alias, arquivos síncronos, callbacks e streams CSV, JSON, HTML e XML.</p></div>';
$('api-inventory').textContent = json({ module: Object.keys(XLSX).filter(k => k !== 'default'), utils: Object.keys(XLSX.utils), SSF: Object.keys(XLSX.SSF), CFB: Object.keys(XLSX.CFB), CFBUtils: Object.keys(XLSX.CFB.utils), stream: Object.keys(XLSX.stream), codepage: Object.keys(codepage.utils) });
$('version').textContent = `${XLSX.version} · Verdaccio`;
try {
    const response = await fetch('/api/identity');
    state.identity = await response.json();
    if (!response.ok || state.identity.version !== XLSX.version)
        throw new Error('A identidade do módulo não corresponde ao pacote instalado.');
    $('identity').textContent = json(state.identity);
}
catch (error) {
    notice(error.message, true);
}
renderWorkbook();
formatDescription();
addressUtilities();
formatValue();
cfbSample();
navigation();
