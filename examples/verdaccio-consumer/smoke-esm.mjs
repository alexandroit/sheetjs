import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as XLSX from '@stackline/xlsx';
import assertions from './assertions.cjs';

const entryFile = fileURLToPath(import.meta.resolve('@stackline/xlsx'));
assert.ok(entryFile.endsWith('/xlsx.mjs'), 'the import condition must resolve the ESM entry');
assertions.assertIdentity(XLSX, entryFile, '@stackline/xlsx');
assertions.assertRoundTrip(XLSX);
console.log('esm scoped smoke ok:', XLSX.version);
