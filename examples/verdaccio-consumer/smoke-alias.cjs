'use strict';

const assert = require('assert');
const XLSX = require('xlsx');

const worksheet = XLSX.utils.json_to_sheet([
  JSON.parse('{"name":"Ada","role":"Engineer","__proto__":{"polluted":"yes"}}')
]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'People');

const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
const parsed = XLSX.read(output, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(parsed.Sheets.People, { raw: true });

assert.strictEqual(parsed.SheetNames[0], 'People');
assert.strictEqual(rows[0].name, 'Ada');
assert.strictEqual(rows[0].polluted, undefined);
assert.strictEqual(({}).polluted, undefined);

console.log('alias xlsx smoke ok:', XLSX.version);
