import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSnapshot, updateMetricsDocument } from './npm-version-downloads.mjs';

function samplePayloads() {
	return {
		package: '@stackline/xlsx',
		downloads: {
			'1.0.5': 20,
			'1.0.4': 10,
			'2.1.0': 20
		}
	};
}

test('buildSnapshot validates and sorts version data', () => {
	const payload = samplePayloads();
	const snapshot = buildSnapshot(payload, '2026-08-15T12:00:00Z');
	assert.equal(snapshot.captureDate, '2026-08-15');
	assert.equal(snapshot.period, 'last-week');
	assert.equal(snapshot.total, 50);
	assert.deepEqual(snapshot.versions.map(item => item.version), ['2.1.0', '1.0.5', '1.0.4']);
});

test('updateMetricsDocument replaces a rerun from the same UTC day', () => {
	const payload = samplePayloads();
	const first = buildSnapshot(payload, '2026-08-15T08:00:00Z');
	const updatedPayload = samplePayloads();
	updatedPayload.downloads['1.0.5'] = 25;
	const second = buildSnapshot(updatedPayload, '2026-08-15T16:00:00Z');
	const once = updateMetricsDocument(null, first);
	const twice = updateMetricsDocument(once, second);
	assert.equal(twice.snapshots.length, 1);
	assert.equal(twice.snapshots[0].capturedAt, '2026-08-15T16:00:00.000Z');
	assert.equal(twice.snapshots[0].total, 55);
});

test('buildSnapshot rejects malformed download counts', () => {
	const payload = samplePayloads();
	payload.downloads['1.0.5'] = -1;
	assert.throws(() => buildSnapshot(payload), /non-negative safe integer/);
});
