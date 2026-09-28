import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../xlsx.js', import.meta.url));

function loadContext(source, browser = false) {
	const exports = {};
	const context = vm.createContext(browser ? { console } : {
		module: { exports }, exports, require, console, Buffer, process
	});
	vm.runInContext(source, context, { timeout: 5000 });
	const api = browser ? context.XLSX : context.module.exports;
	context.api = api;
	return { api, context };
}

// Exercise the real source fragments before rebuilding, without editing artifacts.
const source = fs.readdirSync(path.join(root, 'bits')).filter(name => name.endsWith('.js'))
	.sort().map(name => fs.readFileSync(path.join(root, 'bits', name), 'utf8')).join('\n');
const runtimes = [['source fragments', loadContext(source)]];
if (!process.env.XLSX_TEST_SOURCE_ONLY) {
	runtimes.push(['CommonJS', loadContext(fs.readFileSync(path.join(root, 'xlsx.js'), 'utf8'))]);
	runtimes.push(['ES module', { api: await import('../xlsx.mjs') }]);
	for (const kind of ['full', 'core', 'mini']) {
		runtimes.push([`browser ${kind}`, loadContext(fs.readFileSync(path.join(root, `dist/xlsx.${kind}.min.js`), 'utf8'), true)]);
	}
}

function cyclicStream(CFB) {
	const file = CFB.utils.cfb_new();
	CFB.utils.cfb_add(file, 'large', Buffer.alloc(8192, 65));
	const data = Buffer.from(CFB.write(file, { type: 'buffer' }));
	const size = 1 << data.readUInt16LE(30);
	const directory = data.readInt32LE(48), fat = data.readInt32LE(76);
	let entry = -1;
	for (let offset = (directory + 1) * size; offset < (directory + 2) * size; offset += 128) {
		const length = data.readUInt16LE(offset + 64);
		if (length >= 2 && data.toString('utf16le', offset, offset + length - 2) === 'large') entry = offset;
	}
	assert.notEqual(entry, -1);
	const first = data.readInt32LE(entry + 116);
	const second = data.readInt32LE((fat + 1) * size + first * 4);
	data.writeInt32LE(second, entry + 116);
	data.writeInt32LE(second, (fat + 1) * size + second * 4);
	return data;
}

const corrupt = cyclicStream(runtimes[0][1].api.CFB);
for (const [name, runtime] of runtimes) {
	test(`${name}: a cyclic CFB stream terminates with a clear error`, () => {
		if (runtime.context) {
			runtime.context.input = corrupt;
			assert.throws(() => vm.runInContext('api.CFB.read(input, {type:"buffer"})', runtime.context, { timeout: 1000 }), /Cycle detected in FAT chain/);
		} else {
			// Bound a regression in the native ES module without relying on a timer
			// in the same event loop as the synchronous parser.
			const script = `import * as x from ${JSON.stringify(new URL('../xlsx.mjs', import.meta.url).href)};
import fs from 'node:fs';
try { x.CFB.read(fs.readFileSync(0), {type:'buffer'}); process.exitCode = 1; }
catch(error) { if (!/Cycle detected in FAT chain/.test(error.message)) throw error; }`;
			const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
				input: corrupt, encoding: 'utf8', timeout: 2000
			});
			assert.ifError(child.error);
			assert.equal(child.status, 0, child.stderr);
		}
	});

	test(`${name}: valid CFB and ZIP streams retain their bytes`, () => {
		const CFB = runtime.api.CFB;
		const contents = { 'nested/small': Buffer.from('café 東京'), large: Buffer.alloc(8192, 73) };
		for (const [fileType, compression] of [['cfb', false], ['zip', false], ['zip', true]]) {
			const file = CFB.utils.cfb_new({ root: 'Example' });
			for (const [entry, bytes] of Object.entries(contents)) CFB.utils.cfb_add(file, entry, bytes);
			const data = CFB.write(file, { type: 'buffer', fileType, compression });
			const parsed = CFB.read(data, { type: 'buffer' });
			for (const [entry, bytes] of Object.entries(contents)) assert.deepEqual(Buffer.from(CFB.find(parsed, '/' + entry).content), bytes);
		}
	});

	test(`${name}: dotted dates preserve decimals and fractional seconds`, () => {
		const SSF = runtime.api.SSF;
		assert.equal(SSF.format('dd.mm.yyyy', 43831.5), '01.01.2020');
		assert.equal(SSF.format('yyyy.mm.dd', 43831.5), '2020.01.01');
		assert.equal(SSF.format('hh.mm.ss', 43831.5), '12.00.00');
		assert.equal(SSF.format('yyyy.mm.dd.', 43831.5), '2020.01.01.');
		assert.equal(SSF.format('hh:mm:ss.000', 0.500001), '12:00:00.086');
		assert.equal(SSF.format('0.00', 1234.5), '1234.50');
		assert.equal(SSF.format('[s].000', 0.500001), '43200.086');
	});
}

test('embedded CRC32 string encoding matches standard UTF-8 replacement semantics', () => {
	const fragment = fs.readFileSync(path.join(root, 'bits/18_cfb.js'), 'utf8');
	const start = fragment.indexOf('var CRC32 =');
	const end = fragment.indexOf('/* [MS-CFB]', start);
	assert.ok(start >= 0 && end > start);
	const context = vm.createContext({});
	vm.runInContext(fragment.slice(start, end), context);
	const CRC32 = context.CRC32;
	for (const input of ['', 'SheetJS', 'café 東京', '😀', '\uD800', '\uDC00', '\uD800A', 'A\uDC00B', '\uD800\uD800', '\uDC00\uD800', '\uD800\uDC00']) {
		for (const seed of [undefined, 0, 1, -1, 0x12345678]) {
			const bytes = Buffer.from(input, 'utf8');
			assert.equal(CRC32.str(input, seed), CRC32.buf(bytes, seed), JSON.stringify({ input, seed }));
		}
	}
});
