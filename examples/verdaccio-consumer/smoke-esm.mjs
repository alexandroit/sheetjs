import assert from 'assert';
import * as XLSX from '@stackline/xlsx';

const worksheet = XLSX.utils.json_to_sheet([
  { name: 'Katherine', role: 'Analyst' }
]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'People');

const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
const parsed = XLSX.read(output, { type: 'buffer' });
const rows = XLSX.utils.sheet_to_json(parsed.Sheets.People);

assert.strictEqual(parsed.SheetNames[0], 'People');
assert.strictEqual(rows[0].role, 'Analyst');
assert.strictEqual(({}).polluted, undefined);

console.log('esm scoped smoke ok:', XLSX.version);
