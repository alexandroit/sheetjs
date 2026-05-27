# @stackline/xlsx

> A maintained SheetJS-compatible spreadsheet parser and writer with Stackline
> security hardening for applications that need a practical replacement path for
> `xlsx`.

[![npm version](https://img.shields.io/npm/v/@stackline/xlsx.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/xlsx)
[![license](https://img.shields.io/npm/l/@stackline/xlsx.svg?style=flat-square)](https://github.com/alexandroit/sheetjs/blob/github/LICENSE)
[![GitHub repository](https://img.shields.io/badge/GitHub-alexandroit%2Fsheetjs-181717?style=flat-square&logo=github)](https://github.com/alexandroit/sheetjs)
[![Docs](https://img.shields.io/badge/docs-alexandro.net-0f766e?style=flat-square)](https://alexandro.net/docs/vanilla/xlsx/)

**[Documentation](https://alexandro.net/docs/vanilla/xlsx/)** |
**[npm](https://www.npmjs.com/package/@stackline/xlsx)** |
**[Issues](https://github.com/alexandroit/sheetjs/issues)** |
**[Repository](https://github.com/alexandroit/sheetjs)**

**Public release line:** `1.0.2`

---

## Why this package?

`@stackline/xlsx` is an independent maintained fork of SheetJS Community
Edition `0.20.2`. It keeps the familiar workbook API while adding regression
coverage and hardening for known prototype pollution and ReDoS advisories.

The primary goal is compatibility with existing spreadsheet workflows,
including Angular applications that currently depend on `xlsx`.

## Compatibility

| Item | Value |
| :--- | :--- |
| Package | `@stackline/xlsx@1.0.2` |
| API target | `xlsx@0.20.2` |
| Runtime dependencies | none |
| Supported Node.js | `>=20` |
| Types | `types/index.d.ts` |
| Module entry | `xlsx.mjs` |
| CommonJS entry | `xlsx.js` |
| CLI | not published in the Stackline package line |

## Installation

Use the scoped package for new integrations:

```bash
npm install @stackline/xlsx
```

Applications that must preserve existing imports can use npm alias migration:

```bash
npm install xlsx@npm:@stackline/xlsx
```

That keeps application code like this working:

```ts
import * as XLSX from 'xlsx';
```

## Usage

### Read a workbook

```ts
import * as XLSX from '@stackline/xlsx';

export function parseWorkbook(file: ArrayBuffer) {
  const workbook = XLSX.read(file, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null
  });
}
```

### Create a workbook

```ts
import * as XLSX from '@stackline/xlsx';

const worksheet = XLSX.utils.json_to_sheet([
  { name: 'Ada', role: 'Engineer' },
  { name: 'Grace', role: 'Reviewer' }
]);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'People');

const output = XLSX.write(workbook, {
  type: 'array',
  bookType: 'xlsx'
});
```

### CommonJS

```js
const XLSX = require('@stackline/xlsx');

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet([
  ['Name', 'Role'],
  ['Katherine', 'Analyst']
]);

XLSX.utils.book_append_sheet(workbook, worksheet, 'People');
```

## Supported Formats

The fork keeps the upstream SheetJS Community Edition `0.20.2` format surface.

| Format family | Read | Write | Notes |
| :--- | :---: | :---: | :--- |
| XLSX / XLSM / XLSB | Yes | Yes | Modern Excel workbook formats |
| XLS | Yes | Yes | Legacy Excel workbook format |
| ODS / FODS | Yes | Yes | OpenDocument spreadsheet formats |
| CSV / TSV / TXT | Yes | Yes | Plaintext tabular data |
| HTML tables | Yes | Yes | Table import and export helpers |
| DBF / SYLK / DIF | Yes | Yes | Legacy interchange formats |

## Security Hardening

This release blocks or ignores dangerous object keys in parser and conversion
paths:

- `__proto__`
- `prototype`
- `constructor`

The hardening covers worksheet names, XML attributes, relationships, custom
properties, workbook parsing paths and JSON conversion helpers.

Regression tests cover:

- GHSA-4r6h-8v6p-xvw6 / CVE-2023-30533 prototype pollution
- GHSA-5pgg-2g8v-p4x9 / CVE-2024-22363 ReDoS
- malicious XLSX, ODS, XLS and XLML workbook structures
- dangerous relationship IDs
- dangerous custom property names
- JSON headers that try to pollute `Object.prototype`
- malformed HTML input that should not stall regex parsing

## API Surface

The public utility names are preserved for existing consumers.

| Utility | Purpose |
| :--- | :--- |
| `XLSX.read` | Parse workbook data from buffers, strings and binary inputs |
| `XLSX.write` | Serialize workbooks to supported output formats |
| `XLSX.writeFile` | Write workbook files in Node.js environments |
| `XLSX.utils.sheet_to_json` | Convert a worksheet to row objects |
| `XLSX.utils.json_to_sheet` | Convert row objects to a worksheet |
| `XLSX.utils.aoa_to_sheet` | Convert arrays of arrays to a worksheet |
| `XLSX.utils.book_new` | Create an empty workbook |
| `XLSX.utils.book_append_sheet` | Append worksheets to a workbook |

## Local Development

```bash
git clone https://github.com/alexandroit/sheetjs.git
cd sheetjs
npm ci
```

Run the security regression tests:

```bash
npx mocha -R spec -t 10000 test.js -g "security regressions"
```

Run the full suite:

```bash
npm test
```

Build and verify the package:

```bash
npm run build
PATH="$PWD/node_modules/.bin:$PATH" make dist
npm pack --dry-run
```

## Consumer Smoke Test

The repository includes a Verdaccio consumer fixture:

```bash
cd examples/verdaccio-consumer
npm install
npm test
```

It validates direct scoped imports, `xlsx` alias migration and ESM usage.

## Release Checklist

- Confirm `npm ci` succeeds.
- Confirm `npm test` passes.
- Confirm `npm run build` passes.
- Confirm `make dist` passes.
- Confirm `npm pack --dry-run` includes the expected package files.
- Install the package in a temporary consumer project.
- Test direct `@stackline/xlsx` usage.
- Test `xlsx@npm:@stackline/xlsx` alias usage.
- Run `npm audit --omit=dev` in the consumer project.

## License

[Apache-2.0](https://github.com/alexandroit/sheetjs/blob/github/LICENSE).
This project is a maintained fork of SheetJS Community Edition. The original
SheetJS copyright and license notices are preserved in the source tree and
distribution files.
