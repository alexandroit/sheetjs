import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import * as esm from '../xlsx.mjs';
import packageJson from '../package.json' with { type: 'json' };

const require = createRequire(import.meta.url);
const commonjs = require('../xlsx.js');

test('package, CommonJS and ESM versions stay aligned', () => {
	assert.equal(commonjs.version, packageJson.version);
	assert.equal(esm.version, packageJson.version);
});
