# Verdaccio Consumer Smoke Test

This private fixture validates `@stackline/xlsx@1.0.8-verdaccio.1` as an
application consumes it from the local Verdaccio registry. Both the direct
dependency and the migration alias are pinned to that exact test version.

## Install

Run from this directory after the candidate is available in Verdaccio:

```bash
npm install --registry=http://127.0.0.1:4873 --ignore-scripts
```

The local `.npmrc` points to `http://127.0.0.1:4873` and disables the lockfile.
No authentication value belongs in this fixture. The configured user-level
loopback credential is sufficient for authenticated registry operations.

For a fresh install, first remove only this fixture's `node_modules` directory.
An exact version prevents the `latest` tag from silently selecting another
release. Verdaccio has an npm uplink, so the producer separately verifies that
the downloaded tarball matches the packed local candidate before this
consumer runs.

## Run

```bash
npm test
```

The smoke tests cover:

- direct scoped usage: `require('@stackline/xlsx')`;
- migration alias usage: `require('xlsx')`;
- ESM usage: `import * as XLSX from '@stackline/xlsx'`;
- package name, exact installed version and runtime version, loading this
  fixture's own dependencies;
- Unicode strings, numbers, booleans, blank cells, a cached formula and two
  sheets after an XLSX write/read roundtrip;
- prototype-pollution regression behavior through JSON conversion and a
  write/read roundtrip.

These commands install and test the candidate. They do not publish it.
