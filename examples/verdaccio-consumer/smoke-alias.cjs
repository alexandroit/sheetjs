'use strict';

const XLSX = require('xlsx');
const { assertIdentity, assertRoundTrip } = require('./assertions.cjs');

assertIdentity(XLSX, require.resolve('xlsx'), 'xlsx');
assertRoundTrip(XLSX);
console.log('alias xlsx smoke ok:', XLSX.version);
