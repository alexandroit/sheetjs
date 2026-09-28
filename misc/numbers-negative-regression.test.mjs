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
const payload = require('./dist/xlsx.zahl.js');
const numbersSource = fs.readFileSync(path.join(root, 'bits/83_numbers.js'), 'utf8');
const helperStart = numbersSource.indexOf('function readDecimal128LE(');
const helperEnd = numbersSource.indexOf('function parse_varint49(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart);
const helpers = vm.createContext({});
vm.runInContext(numbersSource.slice(helperStart, helperEnd), helpers);

// Build independent fixtures from the decimal coefficient, exponent and sign.
// No production encoder or decoder is used to produce the expected bytes.
function decimal128(coefficient, exponent, negative = false) {
	let bits = coefficient | (BigInt(exponent + 6176) << 113n) | (negative ? 1n << 127n : 0n);
	const bytes = Buffer.alloc(16);
	for (let i = 0; i < bytes.length; ++i, bits >>= 8n) bytes[i] = Number(bits & 255n);
	return bytes;
}

test('NUMBERS decimal writer stores an unsigned coefficient and a separate sign', () => {
	for (const [value, coefficient, exponent] of [
		[0, 0n, -16], [1, 10000000000000000n, -16],
		[1.25, 12500000000000000n, -16], [7.5, 75000000000000000n, -16]
	]) {
		for (const sign of [1, -1]) {
			const data = Buffer.alloc(24, 0xA5);
			data.fill(0, 4, 20);
			helpers.writeDecimal128LE(data, 4, value * sign);
			assert.deepEqual(data.subarray(4, 20), decimal128(coefficient, exponent, value * sign < 0));
			assert.deepEqual(data.subarray(0, 4), Buffer.alloc(4, 0xA5));
			assert.deepEqual(data.subarray(20), Buffer.alloc(4, 0xA5));
		}
	}
});

test('NUMBERS decimal reader accepts signed independent fixtures including finite extremes', () => {
	for (const [coefficient, exponent, expected] of [
		[75000000000000000n, -16, 7.5], [12500000000000000n, -16, 1.25],
		[1n, -300, 1e-300], [1n, -308, 1e-308],
		[49406564584124654n, -340, Number.MIN_VALUE],
		[17976931348623157n, 292, Number.MAX_VALUE]
	]) {
		for (const negative of [false, true]) {
			const data = Buffer.concat([Buffer.alloc(4, 0xA5), decimal128(coefficient, exponent, negative)]);
			assert.equal(helpers.readDecimal128LE(data, 4), negative ? -expected : expected);
		}
	}
});

function roundTrip(api, numbers, values) {
	const book = api.utils.book_new();
	api.utils.book_append_sheet(book, api.utils.aoa_to_sheet([
		['Value', 'Label'], ...values.map((value, index) => [value, `row ${index}`])
	]), 'Values');
	const bytes = api.write(book, { bookType: 'numbers', type: 'array', numbers });
	const sheet = api.read(bytes, { type: 'array' }).Sheets.Values;
	assert.ok(sheet, 'NUMBERS must preserve the sheet name');
	for (let index = 0; index < values.length; ++index) {
		const cell = sheet[`A${index + 2}`];
		assert.equal(cell.t, 'n');
		// A spreadsheet zero need not preserve JavaScript negative zero.
		assert.equal(cell.v, values[index] === 0 ? 0 : values[index], `NUMBERS value ${values[index]}`);
		assert.equal(sheet[`B${index + 2}`].v, `row ${index}`);
	}
}

const groups = [
	['negative integers and fractions with positive and zero controls',
		[-7.5, -1, -0.1, -1.25, -1234.5, 0, -0, 7.5, 1, 0.1, 1.25, 1234.5]],
	['small and large finite numbers without a synchronous hang',
		[1e-300, -1e-300, 1e-308, -1e-308, Number.MIN_VALUE, -Number.MIN_VALUE,
			1e300, -1e300, Number.MAX_VALUE, -Number.MAX_VALUE, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER]]
];

function loadContext(source, browser = false) {
	const exports = {};
	const context = vm.createContext(browser ? { console } : {
		module: { exports }, exports, require, console, Buffer, process
	});
	vm.runInContext(source, context, { timeout: 5000 });
	context.api = browser ? context.XLSX : context.module.exports;
	context.assert = assert;
	context.payload = payload;
	vm.runInContext(`var roundTrip = ${roundTrip.toString()};`, context);
	return context;
}

// Evaluate the real fragments without editing the generated distribution files.
const source = fs.readdirSync(path.join(root, 'bits')).filter(name => name.endsWith('.js'))
	.sort().map(name => fs.readFileSync(path.join(root, 'bits', name), 'utf8')).join('\n');
const runtimes = [['source fragments', loadContext(source)]];
if (!process.env.XLSX_TEST_SOURCE_ONLY) {
	runtimes.push(['CommonJS', loadContext(fs.readFileSync(path.join(root, 'xlsx.js'), 'utf8'))]);
	runtimes.push(['browser full', loadContext(fs.readFileSync(path.join(root, 'dist/xlsx.full.min.js'), 'utf8'), true)]);
	runtimes.push(['ES module', null]);
}

for (const [name, context] of runtimes) {
	for (const [description, values] of groups) {
		test(`${name}: NUMBERS round-trip preserves ${description}`, () => {
			if (context) {
				context.values = values;
				// An event-loop timer cannot interrupt the old Infinity division loop.
				vm.runInContext('roundTrip(api, payload, values)', context, { timeout: 10000 });
			} else {
				const script = `import assert from 'node:assert/strict';
import * as api from ${JSON.stringify(new URL('../xlsx.mjs', import.meta.url).href)};
import payload from ${JSON.stringify(new URL('../dist/xlsx.zahl.mjs', import.meta.url).href)};
const roundTrip = ${roundTrip.toString()};
roundTrip(api, payload, ${JSON.stringify(values)});`;
				const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
					encoding: 'utf8', timeout: 15000
				});
				assert.ifError(child.error);
				assert.equal(child.status, 0, child.stderr);
			}
		});
	}
}
