import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { createInterface } from 'node:readline';
import { Readable, Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const expectedVersion = '1.0.8-verdaccio.1';
const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const table = [
  ['nome', 'valor', 'ativo'],
  ['Ação, "東京"\nsegunda linha', 42.25, true],
  ['Grace', 7, false]
];
const expectedRows = [
  { nome: 'Ação, "東京"\nsegunda linha', valor: 42.25, ativo: true },
  { nome: 'Grace', valor: 7, ativo: false }
].map(row => Object.assign(Object.create(null), row));
const expectedCsv = 'nome,valor,ativo\n"Ação, ""東京""\nsegunda linha",42.25,TRUE\nGrace,7,FALSE';

function verifyOwnPackage(specifier, entryFile) {
  const installedRoot = path.dirname(entryFile);
  const ownRoot = path.join(appDirectory, 'node_modules', specifier);
  assert.ok(fs.realpathSync(installedRoot) === fs.realpathSync(ownRoot),
    'A dependência deve ser carregada do node_modules deste aplicativo.');
  const metadata = JSON.parse(fs.readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(metadata.name, '@stackline/xlsx', 'Nome do pacote instalado incorreto.');
  assert.equal(metadata.version, expectedVersion, 'Versão do pacote instalado incorreta.');
}

function workbook(api) {
  const book = api.utils.book_new();
  api.utils.book_append_sheet(book, api.utils.aoa_to_sheet(table), 'Dados 東京');
  return book;
}

function verifyWorkbook(api, book) {
  assert.deepEqual(book.SheetNames, ['Dados 東京'], 'O nome Unicode da planilha deve ser preservado.');
  assert.deepEqual(api.utils.sheet_to_json(book.Sheets['Dados 東京'], { header: 1, raw: true }),
    table, 'Texto, números e booleanos devem ser preservados.');
}

async function inTemporaryDirectory(check) {
  const directory = await mkdtemp(path.join(tmpdir(), 'stackline-xlsx-playground-'));
  try {
    return await check(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function collect(stream, objectMode = false) {
  assert.ok(stream instanceof Readable, 'A API deve retornar um Readable do Node.');
  const timer = setTimeout(() => stream.destroy(new Error('O stream excedeu o limite de 5 segundos.')), 5000);
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of stream) {
      chunks.push(objectMode ? chunk : Buffer.from(chunk));
      size += objectMode ? 1 : Buffer.byteLength(chunk);
      if (size > (objectMode ? 1000 : 1024 * 1024)) {
        throw new Error('O stream excedeu o tamanho esperado para a amostra fixa.');
      }
    }
    return objectMode ? chunks : Buffer.concat(chunks).toString('utf8');
  } finally {
    clearTimeout(timer);
    if (!stream.readableEnded) stream.destroy();
  }
}

function failureDetail(error) {
  if (error && ['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ERR_PACKAGE_PATH_NOT_EXPORTED'].includes(error.code)) {
    return 'Dependência local indisponível. Instale as duas dependências exatas do aplicativo pelo Verdaccio.';
  }
  const message = error instanceof Error ? error.message : 'Falha inesperada durante a verificação.';
  return message.replaceAll(appDirectory, '[aplicativo]').replaceAll(tmpdir(), '[temporário]');
}

/** Runs fixed, local API checks. It accepts no request data or filesystem paths. */
export async function runNodeChecks() {
  const results = [];
  let direct;
  let alias;
  let esm;
  let dependenciesReady = false;

  async function check(id, label, action, requiresDependencies = true) {
    const start = performance.now();
    let status = 'passed';
    let detail;
    if (requiresDependencies && !dependenciesReady) {
      status = 'skipped';
      detail = 'A verificação de identidade das dependências precisa passar primeiro.';
    } else {
      try {
        detail = await action();
      } catch (error) {
        status = 'failed';
        detail = failureDetail(error);
      }
    }
    results.push({ id, group: 'node', label, status, detail,
      durationMs: Math.round((performance.now() - start) * 100) / 100 });
  }

  await check('node-identity', 'Identidade das dependências locais', async () => {
    const directEntry = require.resolve('@stackline/xlsx');
    const aliasEntry = require.resolve('xlsx');
    const esmEntry = fileURLToPath(import.meta.resolve('@stackline/xlsx'));
    verifyOwnPackage('@stackline/xlsx', directEntry);
    verifyOwnPackage('xlsx', aliasEntry);
    verifyOwnPackage('@stackline/xlsx', esmEntry);
    assert.equal(path.basename(directEntry), 'xlsx.js', 'CommonJS deve usar xlsx.js.');
    assert.equal(path.basename(esmEntry), 'xlsx.mjs', 'ESM deve usar xlsx.mjs.');
    direct = require('@stackline/xlsx');
    alias = require('xlsx');
    esm = await import('@stackline/xlsx');
    for (const api of [direct, alias, esm]) {
      assert.equal(api.version, expectedVersion, 'A versão exportada deve corresponder ao pacote instalado.');
    }
    esm.set_fs(fs);
    esm.stream.set_readable(Readable);
    dependenciesReady = true;
    return `CommonJS, ESM nativo e alias xlsx carregam @stackline/xlsx@${expectedVersion} do próprio aplicativo.`;
  }, false);

  await check('node-file-sync', 'Gravação e leitura de arquivo', () => inTemporaryDirectory(async directory => {
    const filename = path.join(directory, 'roundtrip.xlsx');
    direct.writeFile(workbook(direct), filename, { compression: true });
    assert.ok((await stat(filename)).size > 0, 'O arquivo XLSX deve conter bytes.');
    verifyWorkbook(direct, direct.readFile(filename));
    verifyWorkbook(direct, direct.readFileSync(filename));
    return 'writeFile, readFile e readFileSync preservam Unicode, números e booleanos em um arquivo temporário.';
  }));

  await check('node-file-xlsx', 'Atalhos de gravação XLSX', () => inTemporaryDirectory(async directory => {
    const specialized = path.join(directory, 'specialized.xlsx');
    const synchronous = path.join(directory, 'synchronous.xlsx');
    direct.writeFileXLSX(workbook(direct), specialized, { compression: true });
    direct.writeFileSync(workbook(direct), synchronous);
    verifyWorkbook(alias, alias.readFile(specialized));
    verifyWorkbook(direct, direct.readFile(synchronous));
    return 'writeFileXLSX e writeFileSync geram arquivos válidos; o alias também consegue ler o resultado.';
  }));

  await check('node-file-async', 'Gravação assíncrona e tratamento de erro', () => inTemporaryDirectory(async directory => {
    const filename = path.join(directory, 'async.xlsx');
    let successfulCallbacks = 0;
    await new Promise((resolve, reject) => {
      direct.writeFileAsync(filename, workbook(direct), { compression: true }, error => {
        successfulCallbacks += 1;
        if (error) reject(error); else resolve();
      });
    });
    verifyWorkbook(direct, direct.readFile(filename));
    let failedCallbacks = 0;
    const failure = await new Promise(resolve => {
      direct.writeFileAsync(path.join(directory, 'missing', 'error.xlsx'), workbook(direct), {}, error => {
        failedCallbacks += 1;
        resolve(error);
      });
    });
    assert.equal(failure?.code, 'ENOENT', 'O callback deve comunicar o diretório ausente.');
    assert.equal(successfulCallbacks, 1, 'O callback de sucesso deve ocorrer uma vez.');
    assert.equal(failedCallbacks, 1, 'O callback de erro deve ocorrer uma vez.');
    return 'writeFileAsync grava com callback e comunica ENOENT quando o diretório de destino não existe.';
  }));

  await check('node-esm-io', 'ESM com adaptadores do Node', () => inTemporaryDirectory(async directory => {
    const filename = path.join(directory, 'esm.xlsx');
    esm.writeFileXLSX(workbook(esm), filename);
    verifyWorkbook(esm, esm.readFile(filename));
    assert.equal(await collect(esm.stream.to_csv(esm.utils.aoa_to_sheet(table))), '\uFEFF' + expectedCsv);
    return 'O ESM nativo usa set_fs e stream.set_readable para arquivos e exportação CSV no Node.';
  }));

  await check('node-stream-csv', 'Stream de exportação CSV', async () => {
    const csv = await collect(direct.stream.to_csv(direct.utils.aoa_to_sheet(table)));
    assert.equal(csv, '\uFEFF' + expectedCsv,
      'CSV deve preservar UTF-8 e escapar vírgulas, aspas e quebras de linha.');
    return 'O Readable CSV preserva UTF-8, BOM, aspas, vírgulas e uma quebra de linha dentro da célula.';
  });

  await check('node-stream-json', 'Stream de exportação JSON', async () => {
    const rows = await collect(direct.stream.to_json(direct.utils.aoa_to_sheet(table)), true);
    assert.deepEqual(rows, expectedRows, 'O stream JSON deve preservar objetos e tipos de valores.');
    return 'O Readable em objectMode entrega duas linhas sem protótipo, com strings, números e booleanos corretos.';
  });

  await check('node-stream-html', 'Stream de exportação HTML', async () => {
    const sheet = direct.utils.aoa_to_sheet([['texto', 'valor'], ['Ação <b>& 東京', 42.25]]);
    const html = await collect(direct.stream.to_html(sheet));
    assert.ok(html.includes('Ação &lt;b&gt;&amp; 東京'), 'Caracteres especiais da célula devem ser escapados.');
    assert.equal((html.match(/<table(?:\s|>)/g) || []).length, 1, 'O stream deve abrir uma tabela.');
    assert.equal((html.match(/<\/table>/g) || []).length, 1, 'O stream deve fechar uma tabela.');
    assert.ok(html.includes('42.25'), 'O valor numérico deve estar presente no HTML.');
    return 'O HTML completo contém a tabela, o número e o texto de amostra com <, > e & escapados.';
  });

  await check('node-stream-xlml', 'Stream de exportação XML Spreadsheet', async () => {
    const xml = await collect(direct.stream.to_xlml(workbook(direct), { stride: 1 }));
    assert.ok(xml.includes('urn:schemas-microsoft-com:office:spreadsheet'), 'A saída deve ser XML Spreadsheet.');
    verifyWorkbook(direct, direct.read(xml, { type: 'string' }));
    return 'O stream XLML gera XML Spreadsheet válido, com dados preservados ao ler a exportação.';
  });

  await check('node-stream-filter', 'Filtro de objetos em pipeline', async () => {
    const filtered = [];
    const filter = new Transform({
      objectMode: true,
      highWaterMark: 1,
      transform(row, encoding, callback) {
        callback(null, row.valor >= 10 ? row : undefined);
      }
    });
    const sink = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(row, encoding, callback) {
        filtered.push(row);
        setImmediate(callback);
      }
    });
    await pipeline(direct.stream.to_json(direct.utils.aoa_to_sheet(table)), filter, sink,
      { signal: AbortSignal.timeout(5000) });
    assert.deepEqual(filtered, [expectedRows[0]], 'O filtro deve manter somente o valor maior ou igual a 10.');
    return 'Um pipeline Node com Transform, consumidor assíncrono e limite de buffer filtra objetos sem perder tipos.';
  });

  await check('node-stream-lines', 'Filtro de linhas de CSV simples', async () => {
    const sheet = direct.utils.aoa_to_sheet([['nome', 'valor'], ['Ana', 2], ['Grace', 9], ['Linus', 10]]);
    const input = direct.stream.to_csv(sheet);
    const lines = createInterface({ input, crlfDelay: Infinity });
    const timer = setTimeout(() => input.destroy(new Error('A leitura de linhas excedeu 5 segundos.')), 5000);
    const selected = [];
    try {
      for await (const line of lines) {
        if (/^(Grace|Linus),/.test(line)) selected.push(line);
      }
    } finally {
      clearTimeout(timer);
      lines.close();
      input.destroy();
    }
    assert.deepEqual(selected, ['Grace,9', 'Linus,10'], 'O filtro deve selecionar as duas linhas esperadas.');
    return 'readline filtra duas linhas da amostra CSV simples; esta amostra não contém células com quebras de linha.';
  });

  await check('node-alias-roundtrip', 'Interoperabilidade do alias xlsx', async () => {
    const bytes = alias.write(workbook(alias), { type: 'buffer', bookType: 'xlsx', compression: true });
    assert.ok(Buffer.isBuffer(bytes), 'A gravação Node deve retornar um Buffer.');
    verifyWorkbook(direct, direct.read(bytes, { type: 'buffer' }));
    verifyWorkbook(esm, esm.read(bytes, { type: 'buffer' }));
    return 'O alias grava um Buffer XLSX comprimido que as entradas CommonJS e ESM leem sem alterar os dados.';
  });

  const counts = { total: results.length, passed: 0, failed: 0, skipped: 0 };
  for (const result of results) counts[result.status] += 1;
  return { version: expectedVersion, results, counts };
}
