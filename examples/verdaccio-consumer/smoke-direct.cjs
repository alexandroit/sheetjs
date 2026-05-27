'use strict';

const assert = require('assert');
const XLSX = require('@stackline/xlsx');

const worksheet = XLSX.utils.aoa_to_sheet([
  ['name', 'role'],
  ['Grace', 'Reviewer']
]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'People');

const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
const parsed = XLSX.read(output, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(parsed.Sheets.People);

assert.strictEqual(parsed.SheetNames[0], 'People');
assert.strictEqual(rows[0].name, 'Grace');
assert.strictEqual(({}).polluted, undefined);

console.log('direct scoped smoke ok:', XLSX.version);
