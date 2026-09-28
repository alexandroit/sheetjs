import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);
const source = readdirSync(new URL('bits/', root)).filter(name => name.endsWith('.js')).sort()
  .map(name => readFileSync(new URL('bits/' + name, root), 'utf8')).join('\n');
function browser(source) {
  const context = {console};
  vm.runInNewContext(source, context, {timeout: 10000});
  return context.XLSX;
}
const runtimes = [['source', browser(source)]];
if (!process.env.XLSX_TEST_SOURCE_ONLY) {
  runtimes.push(['CommonJS', require('../xlsx.js')], ['ESM', await import('../xlsx.mjs')]);
  for (const kind of ['full', 'core', 'mini']) {
    runtimes.push(['browser ' + kind, browser(readFileSync(new URL('dist/xlsx.' + kind + '.min.js', root), 'utf8'))]);
  }
}
for (const [name, api] of runtimes) {
  for (const bookType of (name === 'browser mini' ? ['xlsx'] : ['xlsx', 'xlsb'])) {
    test(`${name} ${bookType}: ArrayBuffer reads retain array-valued sheet filters`, () => {
      const workbook = api.utils.book_new();
      for (const title of ['Dados', 'Extra', 'Final']) {
        api.utils.book_append_sheet(workbook, api.utils.aoa_to_sheet([[title], [42], [99]]), title);
      }
      const bytes = api.write(workbook, {bookType, type:'array'});
      const cases = [
        [['Dados'], ['Dados']], [[1], ['Extra']], [['dAdOs', 2], ['Dados', 'Final']],
        [[], []], [['missing', 9], []], ['dados', ['Dados']], [0, ['Dados']]
      ];
      for (const [filter, expected] of cases) {
        const options = {type:'array', sheets:filter, dense:true, sheetRows:2};
        const previousFilter = JSON.stringify(filter);
        const parsed = api.read(bytes, options);
        assert.deepEqual(Object.keys(parsed.Sheets), expected, JSON.stringify(filter));
        assert.deepEqual(Array.from(parsed.SheetNames), Array.from(workbook.SheetNames), 'SheetNames still describes the workbook');
        assert.equal(JSON.stringify(filter), previousFilter, 'caller filter is unchanged');
        for (const sheet of Object.values(parsed.Sheets)) {
          assert.equal(sheet['!ref'], 'A1:A2');
          assert.equal(sheet['!fullref'], 'A1:A3');
        }
      }
    });
  }
}
