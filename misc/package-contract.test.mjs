import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

import * as esm from '../xlsx.mjs';
import * as esmCodepage from '../dist/cpexcel.full.mjs';
import packageJson from '../package.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const commonjs = require('../xlsx.js');
const root = new URL('../', import.meta.url);
const browserBundles = [
	'dist/xlsx.full.min.js',
	'dist/xlsx.core.min.js',
	'dist/xlsx.mini.min.js',
	'dist/xlsx.extendscript.js'
];

function roundTrip(api) {
	assert.equal(api.version, packageJson.version);
	for (const name of ['read', 'write']) assert.equal(typeof api[name], 'function', name);
	for (const name of ['aoa_to_sheet', 'book_new', 'book_append_sheet', 'sheet_to_json']) {
		assert.equal(typeof api.utils[name], 'function', 'utils.' + name);
	}
	const rows = [['label', 'value'], ['caf\u00e9', 42], ['emoji', '\ud83d\ude00']];
	const workbook = api.utils.book_new();
	api.utils.book_append_sheet(workbook, api.utils.aoa_to_sheet(rows), 'Contract');
	const bytes = api.write(workbook, {type: 'array', bookType: 'xlsx', compression: true});
	const parsed = api.read(bytes, {type: 'array'});
	assert.equal(parsed.SheetNames[0], 'Contract');
	// Browser VM values belong to another realm, so compare their serialized data.
	assert.equal(JSON.stringify(api.utils.sheet_to_json(parsed.Sheets.Contract, {header: 1})), JSON.stringify(rows));
}

test('package, CommonJS and ESM versions stay aligned', () => {
	assert.equal(commonjs.version, packageJson.version);
	assert.equal(esm.version, packageJson.version);
});

test('every declared package export points to an existing file', () => {
	for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
		for (const [condition, target] of Object.entries(conditions)) {
			assert.equal(statSync(new URL(target, root)).isFile(), true, subpath + ' (' + condition + ')');
		}
	}
});

test('scoped CommonJS and ESM entry points preserve the spreadsheet API', async () => {
	assert.equal(require('@stackline/xlsx'), commonjs);
	roundTrip(commonjs);
	roundTrip(await import('@stackline/xlsx'));
});

for (const filename of browserBundles) {
	test(filename + ' exposes the current version and works without Node globals', () => {
		const context = {};
		vm.runInNewContext(readFileSync(new URL(filename, root), 'utf8'), context, {filename, timeout: 10_000});
		assert.equal(context.require, undefined);
		assert.equal(context.process, undefined);
		assert.equal(context.Buffer, undefined);
		roundTrip(context.XLSX);
	});
}

test('CommonJS and ESM codepage artifacts match the installed scoped dependency', () => {
	const installed = require('@stackline/codepage');
	const cjsCodepage = require('../dist/cpexcel.js');
	assert.equal(cjsCodepage.version, installed.version);
	assert.equal(esmCodepage.version, installed.version);
	const examples = [
		[1252, 'Caf\u00e9 \u20ac'],
		[932, '\u65e5\u672c\u8a9e'],
		[65001, 'A\ud83d\ude00\u00e9'],
		[1200, 'A\ud83d\ude00\u00e9']
	];
	for (const [codepage, value] of examples) {
		const expected = Array.from(installed.utils.encode(codepage, value));
		for (const artifact of [cjsCodepage, esmCodepage]) {
			const encoded = artifact.utils.encode(codepage, value);
			assert.deepEqual(Array.from(encoded), expected, 'codepage ' + codepage);
			assert.equal(artifact.utils.decode(codepage, encoded), value, 'codepage ' + codepage);
		}
	}
});

test('both codepage artifacts retain UTF-8 output across later encodes', () => {
	for (const artifact of [require('../dist/cpexcel.js'), esmCodepage]) {
		const first = artifact.utils.encode(65001, 'first caf\u00e9');
		const before = Array.from(first);
		artifact.utils.encode(65001, 'a different and longer \u03c0 result');
		assert.deepEqual(Array.from(first), before);
		assert.equal(artifact.utils.decode(65001, first), 'first caf\u00e9');
	}
});
