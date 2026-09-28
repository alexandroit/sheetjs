# XLSX Verdaccio test release

`@stackline/xlsx@1.0.8-verdaccio.1` is published only to the existing local
Verdaccio registry at `http://127.0.0.1:4873`, under the `verdaccio` tag.
At the time of candidate validation, public npm served `1.0.7`; this
prerelease was published only to Verdaccio. Stable `1.0.8` promotes the tested
maintenance work and adds the NUMBERS, WK3 and sheet-filter corrections
identified by the playground.

## Install and test

Run this in a test application on this Mac:

```sh
npm install @stackline/xlsx@1.0.8-verdaccio.1 --registry=http://127.0.0.1:4873
```

The checked-in consumer tests scoped CommonJS, the legacy `xlsx` npm alias,
and native ESM against the exact installed version:

```sh
cd examples/verdaccio-consumer
npm install
npm test
```

Use the exact version or `@verdaccio`; `latest` does not select this candidate.
The service listens only on loopback. No registry credentials are included in
source or in the package. The candidate intentionally targeted the local registry. Stable release
metadata targets npm and publication runs through GitHub Actions.

## Changes

- Replace ten development dependencies with the published Stackline forks,
  remove the unused `word` package, and upgrade Mocha to 12.0.2. Remove the old
  overrides now superseded by Mocha's supported dependency versions.
- Update build paths, the source CLI, coverage hooks and module imports to use
  scoped names directly. Rebuild with `@stackline/uglify-js`.
- Port only the missing embedded CFB cycle guard, CRC-32 malformed-surrogate
  handling and SSF literal-date-period fix. Preserve newer XLSX-specific code.
- Apply the codepage UTF-8 buffer ownership fix in both CommonJS and native ESM.
- Preserve all public declarations, exports and the same 28 packaged files.
  The published package still has no runtime dependencies.

## Validation

- Clean development install: 528 packages added, no install warnings or
  deprecated dependency entries, and zero known npm audit vulnerabilities.
- `npm test`: 74,691 passing, two existing pending tests; pretest also passes
  three metrics tests, nine package contracts and 19 maintenance regressions.
- ESLint: zero errors and 60 nonblocking warnings. The unmodified 1.0.7
  worktree has the same warning count; this update does not rewrite those areas.
- TypeScript 5.9 declaration check and packed consumers under 3.9.10 and 7.0.2
  pass. All three shipped declaration files are byte-identical to 1.0.7.
- Real Chromium 149: full, core, mini and ESM/codepage pass compressed Unicode
  XLSX roundtrips, date formats and codepage output retention, without external
  requests or unhandled browser errors.
- Source CLI CSV-to-XLSX-to-JSON conversion passes. This does not add a public
  CLI executable to the npm package.
- A forced rebuild preserves every packaged file byte-for-byte.
- Actual Verdaccio installation: two packages added, no warnings, zero known
  audit vulnerabilities. All 28 files in both scoped and alias installations
  match the producer tarball. CommonJS, alias and ESM tests pass.

These checks establish the tested behavior and known-advisory status; they do
not constitute a guarantee of absolute security.

## Artifact and working copy

- Tarball: `stackline-xlsx-1.0.8-verdaccio.1.tgz`, 2,423,873 bytes.
- SHA-256: `390fd6004d778b3ec4caf0973fbb44504257551d59b5ad9711e4dccc051b09c3`.
- SHA-512: `Dn7raHTrZ70XKhVmDSimKPX2dAvP4fjoE5dPFKX902dOgOEcGzkj1RnQ67jDbSu+VC+U9U/lkrMkpA1YYF3nTw==`.
- Local branch: `test/xlsx-scoped-devdeps-verdaccio`, based on published 1.0.7
  source `976faafa3e8a00fbdfe5591528d1c28c56832bc6`. At that validation point,
  changes were uncommitted and no candidate tag or Git push had been made.
  Stable release work continues on `release/xlsx-1.0.8`.
- The original main and 1.0.7 release worktrees remain clean and unchanged.

Machine-readable evidence and logs are under
`/Volumes/SSD/storage/data/github/stackline-thlorenz-cluster/research/xlsx-verdaccio-2026-09-27`.
The independent final review, publication identity, consumer report and forced
rebuild report are stored there. Real-browser evidence is in the adjacent
`xlsx-devdeps-2026-09-27/xlsx-1.0.8-verdaccio.1-browser` directory.
