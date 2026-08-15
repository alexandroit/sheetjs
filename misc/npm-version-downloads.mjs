#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PACKAGE_NAME = '@stackline/xlsx';
const ENCODED_PACKAGE = encodeURIComponent(PACKAGE_NAME);
const VERSIONS_URL = `https://api.npmjs.org/versions/${ENCODED_PACKAGE}/last-week`;
const DEFAULT_OUTPUT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../metrics/npm-version-downloads.json'
);

function requireObject(value, label) {
	if(!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new TypeError(`${label} must be an object`);
	}
	return value;
}

function requireDownloadCount(value, label) {
	if(!Number.isSafeInteger(value) || value < 0) {
		throw new TypeError(`${label} must be a non-negative safe integer`);
	}
	return value;
}

export function buildSnapshot(versionPayload, now = new Date()) {
	requireObject(versionPayload, 'version payload');
	if(versionPayload.package !== PACKAGE_NAME) {
		throw new TypeError(`download payload must describe ${PACKAGE_NAME}`);
	}

	const downloads = requireObject(versionPayload.downloads, 'version downloads');
	const versions = Object.entries(downloads).map(([version, count]) => {
		if(!version) throw new TypeError('version name must not be empty');
		return { version, downloads: requireDownloadCount(count, `downloads for ${version}`) };
	}).sort((left, right) => {
		return right.downloads - left.downloads ||
			right.version.localeCompare(left.version, 'en', { numeric: true });
	});

	const capturedAt = new Date(now).toISOString();
	const total = versions.reduce((sum, item) => sum + item.downloads, 0);

	return {
		captureDate: capturedAt.slice(0, 10),
		capturedAt,
		period: 'last-week',
		total,
		versions
	};
}

export function updateMetricsDocument(existingDocument, snapshot) {
	const existing = existingDocument == null ? {} : requireObject(existingDocument, 'metrics document');
	if(existing.package && existing.package !== PACKAGE_NAME) {
		throw new TypeError(`metrics document must describe ${PACKAGE_NAME}`);
	}
	const oldSnapshots = existing.snapshots == null ? [] : existing.snapshots;
	if(!Array.isArray(oldSnapshots)) throw new TypeError('metrics snapshots must be an array');

	const snapshots = oldSnapshots
		.filter(item => item && item.captureDate !== snapshot.captureDate)
		.concat(snapshot)
		.sort((left, right) => left.captureDate.localeCompare(right.captureDate));

	return {
		schemaVersion: 1,
		package: PACKAGE_NAME,
		sources: {
			versions: VERSIONS_URL
		},
		snapshots
	};
}

async function fetchJson(fetchImpl, url) {
	const response = await fetchImpl(url, {
		headers: { accept: 'application/json' }
	});
	if(!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
	return response.json();
}

async function readExistingDocument(outputFile) {
	try {
		return JSON.parse(await readFile(outputFile, 'utf8'));
	} catch(error) {
		if(error && error.code === 'ENOENT') return null;
		throw error;
	}
}

export async function collectDownloads(options = {}) {
	const fetchImpl = options.fetchImpl || globalThis.fetch;
	if(typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
	const outputFile = options.outputFile || DEFAULT_OUTPUT;
	const versionPayload = await fetchJson(fetchImpl, VERSIONS_URL);
	const snapshot = buildSnapshot(versionPayload, options.now || new Date());
	const existing = await readExistingDocument(outputFile);
	const document = updateMetricsDocument(existing, snapshot);
	await mkdir(path.dirname(outputFile), { recursive: true });
	await writeFile(outputFile, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
	return { outputFile, snapshot };
}

const invokedDirectly = process.argv[1] &&
	import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if(invokedDirectly) {
	collectDownloads().then(({ outputFile, snapshot }) => {
		console.log(`recorded ${snapshot.total} downloads from the npm ${snapshot.period} view`);
		console.log(outputFile);
	}).catch(error => {
		console.error(error);
		process.exitCode = 1;
	});
}
