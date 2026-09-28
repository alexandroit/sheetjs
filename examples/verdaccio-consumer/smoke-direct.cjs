'use strict';

const XLSX = require('@stackline/xlsx');
const { assertIdentity, assertRoundTrip } = require('./assertions.cjs');

assertIdentity(XLSX, require.resolve('@stackline/xlsx'), '@stackline/xlsx');
assertRoundTrip(XLSX);
console.log('direct scoped smoke ok:', XLSX.version);
