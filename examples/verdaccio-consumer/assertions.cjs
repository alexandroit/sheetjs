'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const expectedVersion = require('./package.json').dependencies['@stackline/xlsx'];

function assertIdentity(XLSX, entryFile, specifier) {
  const installedRoot = path.dirname(entryFile);
  const expectedRoot = path.join(__dirname, 'node_modules', specifier);
  assert.equal(fs.realpathSync(installedRoot), fs.realpathSync(expectedRoot),
    'the consumer must load its own installed dependency');
  const metadata = JSON.parse(fs.readFileSync(path.join(installedRoot, 'package.json'), 'utf8'));
  assert.equal(metadata.name, '@stackline/xlsx');
  assert.equal(metadata.version, expectedVersion, 'installed package version');
  assert.equal(XLSX.version, expectedVersion, 'runtime export version');
}

function assertRoundTrip(XLSX) {
  const table = [
    ['name', 'amount', 'enabled', 'optional'],
    ['Ação 🧪 <&>', 42.25, true, null],
    ['Katherine', -7, false, 'kept']
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(table);
  worksheet.E1 = { t: 's', v: 'formula' };
  worksheet.E2 = { t: 'n', f: 'B2*2', v: 84.5 };
  worksheet['!ref'] = 'A1:E3';
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['second sheet'], [123]]), 'Resumo');

  const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  assert.ok(Buffer.isBuffer(output));
  assert.ok(output.length > 0);
  const parsed = XLSX.read(output, { type: 'buffer', cellFormula: true });
  assert.deepEqual(parsed.SheetNames, ['Dados', 'Resumo']);
  const rows = XLSX.utils.sheet_to_json(parsed.Sheets.Dados, {
    header: 1, raw: true, defval: null, range: 'A1:D3'
  });
  assert.deepEqual(rows, table, 'strings, numbers, booleans and blanks survive a roundtrip');
  assert.equal(parsed.Sheets.Dados.E2.f, 'B2*2');
  assert.equal(parsed.Sheets.Dados.E2.v, 84.5);
  assert.equal(parsed.Sheets.Dados.B2.t, 'n');
  assert.equal(parsed.Sheets.Dados.C2.t, 'b');
  assert.deepEqual(XLSX.utils.sheet_to_json(parsed.Sheets.Resumo, { header: 1 }),
    [['second sheet'], [123]]);

  const hostile = JSON.parse('{"name":"Ada","__proto__":{"stacklineConsumerPolluted":"yes"}}');
  const hostileSheet = XLSX.utils.json_to_sheet([hostile]);
  const hostileWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(hostileWorkbook, hostileSheet, 'People');
  const hostileOutput = XLSX.write(hostileWorkbook, { type: 'buffer', bookType: 'xlsx' });
  const hostileParsed = XLSX.read(hostileOutput, { type: 'buffer' });
  const hostileRows = XLSX.utils.sheet_to_json(hostileParsed.Sheets.People);
  assert.equal(hostileRows[0].name, 'Ada');
  assert.equal(hostileRows[0].stacklineConsumerPolluted, undefined);
  assert.equal(({}).stacklineConsumerPolluted, undefined);
}

module.exports = { assertIdentity, assertRoundTrip };
