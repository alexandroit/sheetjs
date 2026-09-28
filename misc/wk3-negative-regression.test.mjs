import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const require = createRequire(import.meta.url);

function sourceRuntime() {
	const source = fs.readdirSync(new URL('bits/', root)).filter(name => name.endsWith('.js')).sort()
		.map(name => fs.readFileSync(new URL('bits/' + name, root), 'utf8')).join('\n');
	const exports = {};
	const context = { module: { exports }, exports, require: createRequire(new URL('xlsx.js', root)), Buffer, process, console };
	vm.runInNewContext(source, context, { timeout: 10000 });
	return context.module.exports;
}

const runtimes = [['source fragments', sourceRuntime()]];
if (!process.env.XLSX_TEST_SOURCE_ONLY) {
	runtimes.push(['CommonJS', require('../xlsx.js')], ['ES module', await import('../xlsx.mjs')]);
	// misc/mini.lst intentionally omits bits/41_lotus.js; mini has no WK3 reader.
	for (const kind of ['full', 'core']) {
		const context = {};
		vm.runInNewContext(fs.readFileSync(new URL(`dist/xlsx.${kind}.min.js`, root), 'utf8'), context, { timeout: 10000 });
		runtimes.push(['browser ' + kind, context.XLSX]);
	}
}

// Independent oracle: expand native binary64 bits into the WK3 explicit
// 64-bit significand and 15-bit exponent. No production logarithms or floats
// are used to construct the extended representation.
function extendedBytes(value) {
	const output = Buffer.alloc(10);
	if (value === 0) {
		// Preserve the existing Lotus zero marker; -0 intentionally normalizes.
		output.writeUInt16LE(0xffff, 8);
		return output;
	}
	assert.ok(Number.isFinite(value));
	const native = Buffer.alloc(8);
	native.writeDoubleLE(value);
	const bits = native.readBigUInt64LE();
	const sign = Number(bits >> 63n);
	const exponent = Number((bits >> 52n) & 0x7ffn);
	const fraction = bits & ((1n << 52n) - 1n);
	let significand;
	let unbiased;
	if (exponent === 0) {
		const leadingBit = fraction.toString(2).length - 1;
		significand = fraction << BigInt(63 - leadingBit);
		unbiased = leadingBit - 1074;
	} else {
		significand = ((1n << 52n) | fraction) << 11n;
		unbiased = exponent - 1023;
	}
	output.writeBigUInt64LE(significand);
	output.writeUInt16LE((sign << 15) | (unbiased + 16383), 8);
	return output;
}

function record(type, payload) {
	const header = Buffer.alloc(4);
	header.writeUInt16LE(type);
	header.writeUInt16LE(payload.length, 2);
	return Buffer.concat([header, payload]);
}

function fixture(values, type = 0x17) {
	// Standalone WK3 BOF and NUMBER17/FORMULA19 records, not XLSX.write output.
	const bof = Buffer.alloc(26);
	bof.writeUInt16LE(0x1000);
	bof.writeUInt16LE(4, 2);
	bof.writeUInt16LE(values.length - 1, 8);
	bof[10] = 1;
	bof[16] = 1;
	bof[17] = 2;
	const records = values.map((value, row) => {
		const cell = Buffer.alloc(14);
		cell.writeUInt16LE(row);
		(Buffer.isBuffer(value) ? value : extendedBytes(value)).copy(cell, 4);
		return record(type, cell);
	});
	return Buffer.concat([record(0, bof), ...records, record(1, Buffer.alloc(0))]);
}

const values = [0, -0, 1, -1, 7.5, -7.5, 0.1, -0.1, 0.75, -0.75, Math.PI, -Math.PI,
	Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 1e100, -1e100,
	Number.MAX_VALUE, -Number.MAX_VALUE, Number.MIN_VALUE, -Number.MIN_VALUE];
// Exercise both neighbors of powers of two, where log2 may round to the wrong
// integer, including subnormal/normal and maximum-exponent boundaries.
for (const exponent of [-1073, -1050, -1022, -1021, -100, -1, 0, 1, 31, 32, 52, 53, 100, 1023]) {
	const buffer = Buffer.alloc(8);
	buffer.writeDoubleLE(2 ** exponent);
	const bits = buffer.readBigUInt64LE();
	for (const delta of [-1n, 0n, 1n]) {
		buffer.writeBigUInt64LE(bits + delta);
		const value = buffer.readDoubleLE();
		values.push(value, -value);
	}
}
// Reproducible varied significands/exponents without Math.random or a mirrored
// arithmetic codec. Values are built from native IEEE-754 bit patterns.
let seed = 0x87654321;
function randomWord() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; }
for (let index = 0; index < 256; ++index) {
	const buffer = Buffer.alloc(8);
	buffer.writeUInt32LE(randomWord());
	const upper = randomWord();
	buffer.writeUInt32LE(((upper & 0x800fffff) | ((randomWord() % 2047) << 20)) >>> 0, 4);
	values.push(buffer.readDoubleLE());
}

function assertValue(actual, expected, message) {
	assert.ok(Object.is(actual, expected === 0 ? 0 : expected), `${message}: expected ${expected}, received ${actual}`);
}

for (const [name, api] of runtimes) {
	test(name + ': independent WK3 number and formula fixtures preserve the sign', () => {
		const positive = Buffer.from('00000000000000f00140', 'hex'); // +7.5
		const negative = Buffer.from('00000000000000f001c0', 'hex'); // -7.5
		for (const type of [0x17, 0x19]) {
			const book = api.read(fixture([positive, negative], type), { type: 'array' });
			const sheet = book.Sheets[book.SheetNames[0]];
			assert.equal(sheet.A1.v, 7.5);
			assert.equal(sheet.A2.v, -7.5);
		}
	});

	test(name + ': independent finite binary64 fixtures retain exact values', () => {
		const book = api.read(fixture(values), { type: 'array' });
		const sheet = book.Sheets[book.SheetNames[0]];
		values.forEach((value, row) => assertValue(sheet['A' + (row + 1)].v, value, 'fixture row ' + row));
	});

	test(name + ': WK3 writer matches independent IEEE bit expansion', () => {
		for (const dense of [false, true]) {
			const book = api.utils.book_new();
			api.utils.book_append_sheet(book, api.utils.aoa_to_sheet(values.map(value => [value]), { dense }), 'Numbers');
			const data = Buffer.from(api.write(book, { type: 'array', bookType: 'wk3' }));
			let count = 0;
			for (let offset = 0; offset < data.length;) {
				const type = data.readUInt16LE(offset), length = data.readUInt16LE(offset + 2);
				if (type === 0x17) {
					const row = data.readUInt16LE(offset + 4);
					assert.equal(length, 14);
					assert.deepEqual(data.subarray(offset + 8, offset + 18), extendedBytes(values[row]), 'numeric bytes for row ' + row);
					++count;
				}
				offset += 4 + length;
			}
			assert.equal(count, values.length);
			const parsed = api.read(data, { type: 'array', dense });
			const sheet = parsed.Sheets.Numbers;
			values.forEach((value, row) => assertValue(dense ? sheet['!data'][row][0].v : sheet['A' + (row + 1)].v,
				value, 'roundtrip row ' + row));
		}
	});

	test(name + ': WK3 legacy zero and error markers are unchanged', () => {
		const zero = Buffer.from('0000000000000000ffff', 'hex');
		const valueError = Buffer.from('00000000000000c0ffff', 'hex');
		const naError = Buffer.from('00000000000000d0ffff', 'hex');
		const parsed = api.read(fixture([zero, valueError, naError]), { type: 'array' });
		const sheet = parsed.Sheets[parsed.SheetNames[0]];
		assertValue(sheet.A1.v, 0, 'legacy zero');
		assert.equal(sheet.A2.t, 'e'); assert.equal(sheet.A2.v, 0x0f);
		assert.equal(sheet.A3.t, 'e'); assert.equal(sheet.A3.v, 0x2a);
	});
}
