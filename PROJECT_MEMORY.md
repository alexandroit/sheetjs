# Project Memory

This file records the working decisions for the Stackline `@stackline/xlsx`
fork. It is intentionally repo-facing and should not be treated as public npm
documentation.

## Current Direction

- Keep this project as a maintained fork of SheetJS Community Edition.
- Do not rewrite from zero while the goal is compatibility with existing `xlsx`
  consumers.
- Public package identity should be `@stackline/xlsx`.
- Public install command should be:

```bash
npm install @stackline/xlsx
```

- The npm alias should be documented only as a migration path for applications
  that want to preserve existing imports:

```bash
npm install xlsx@npm:@stackline/xlsx
```

- New code should prefer:

```ts
import * as XLSX from '@stackline/xlsx';
```

- Existing applications can keep:

```ts
import * as XLSX from 'xlsx';
```

## Current State

- Repository clone: `/storage/data/github/sheetjs-fork/sheetjs`
- GitHub origin: `https://github.com/alexandroit/sheetjs.git`
- Working branch: `github`
- Base: SheetJS Community Edition `v0.20.3`
- Current package version: `1.0.4`
- Verdaccio `latest`: `1.0.4`
- Official npm `latest`: `1.0.4`
- Package name: `@stackline/xlsx`
- Current security scope:
  - GHSA-4r6h-8v6p-xvw6 / CVE-2023-30533
  - GHSA-5pgg-2g8v-p4x9 / CVE-2024-22363

## Completed Work

- Added prototype pollution guards for `__proto__`, `prototype` and
  `constructor`.
- Covered worksheet names, XML attributes, relationships, custom properties,
  workbook parsing paths and JSON conversion helpers.
- Added security regression tests.
- Regenerated root bundles and dist bundles.
- Reworked README in the Stackline package documentation style.
- Added public `CONTRIBUTING.md` and `SECURITY.md`.
- Added public static docs in `docs/` for
  `https://alexandro.net/docs/vanilla/xlsx/`.
- Added `package-lock.json` for reproducible development installs.
- Published `@stackline/xlsx@0.20.2-stackline.1` to Verdaccio.
- Published `@stackline/xlsx@1.0.0` to Verdaccio.
- Published `@stackline/xlsx@1.0.1` to Verdaccio during internal polishing.
- Published `@stackline/xlsx@1.0.2` and `@stackline/xlsx@1.0.3` to Verdaccio
  and public npm before the upstream `0.20.3` merge.
- Published `@stackline/xlsx@1.0.4` to Verdaccio and public npm after
  merging SheetJS CE `v0.20.3` and passing local and GitHub validation.
- Replaced the internal Verdaccio `@stackline/xlsx@1.0.0` tarball with the
  public-ready `1.0.0` tarball after removing the old Verdaccio-only metadata.
- Confirmed Verdaccio `latest` points to `1.0.2`.
- Staged alexandro.net docs at:

```bash
/storage/data/build/alexandro.net-docs/vanilla/xlsx/
```

- Copied the staged static docs to the local Apache docs tree:

```bash
/var/www/html/alexandro.net_docs/vanilla/xlsx/
```

- Public `https://alexandro.net/docs/vanilla/xlsx/` still returned HTTP 404
  through Cloudflare on May 27, 2026, even though existing docs such as
  `/docs/vanilla/color/` returned 200. Treat that as an origin/deploy sync issue
  outside this repo, not a missing local docs file.
- Resolution: the public site serves docs from `codex-server`, not this local
  machine. Sync the docs with:

```bash
ssh codex-server 'sudo mkdir -p /var/www/html/alexandro.net_docs/vanilla/xlsx'
rsync -az --delete --rsync-path='sudo rsync' \
  /storage/data/build/alexandro.net-docs/vanilla/xlsx/ \
  codex-server:/var/www/html/alexandro.net_docs/vanilla/xlsx/
```

- After syncing to `codex-server`, `https://alexandro.net/docs/vanilla/xlsx/`
  returned HTTP 200.
- Confirmed current direct and alias install from Verdaccio with:

```bash
npm install @stackline/xlsx xlsx@npm:@stackline/xlsx --registry http://localhost:4873
```
- Pushed the principal branch `github` to GitHub:

```text
https://github.com/alexandroit/sheetjs/tree/github
```
- Modernized GitHub Actions after the first public CI failures:
  - CI uses the pinned `test_files.zip` fixtures from `make init` and no longer
    tries to refresh optional external fixture repos during push checks.
  - Bun uses the maintained `make test-bun_misc` target.
  - Deno tests no longer depend on an unpinned remote base64 helper.
  - Required Node CI targets supported Node.js releases: `20.x`, `22.x` and
    `24.x`.
  - Node `0.x` and `io.js` workflows are manual only because scoped public npm
    packages and current dev tooling are not compatible with those runtimes.

## Current Round

- Current focus: `@stackline/xlsx@1.0.4` public npm release is complete.
- `1.0.4` Verdaccio validation completed locally:
  - `npm run dtslint`: passed
  - `npm run build`: passed
  - `make dist`: passed
  - `npm audit --omit=dev`: `0 vulnerabilities`
  - `npm test`: `74687 passing`, `2 pending`
  - `npm pack --dry-run --json`: package tarball valid
  - Verdaccio publish: `@stackline/xlsx@1.0.4`
  - Live consumer app: `/storage/data/github/tests/xlsx-verdaccio-live`
  - Live consumer install from Verdaccio: `0 vulnerabilities`
  - Live consumer smoke/build: passed
- `1.0.4` public npm release validation:
  - local `npm test`: `74687 passing`, `2 pending`
  - local Bun targeted regression: `FMTS=misc npx -y bun test test.test.mjs`
    passed after fixing multiformat flag capture
  - local `npm run dtslint`: passed
  - local `npm pack --dry-run --json`: package tarball valid
  - GitHub Actions on `github` at commit `c4a2016` passed:
    - `Tests: pretest/posttest`
    - `Tests: Bun`
    - `Tests: deno 1.x`
    - `Tests: node.js`
  - official npm publish: `@stackline/xlsx@1.0.4`
  - official npm `latest`: `1.0.4`
  - official npm direct and alias smoke install: passed
  - consumer `npm audit --omit=dev`: `0 vulnerabilities`
- Historical validation notes below refer to earlier public releases unless
  explicitly marked `1.0.4`.
- Keep the primary Verdaccio install experience as:

```bash
npm install @stackline/xlsx
```

- Keep alias install as a migration path:

```bash
npm install xlsx@npm:@stackline/xlsx
```

- Implement the senior hardening pass:
  - centralized unsafe-key helpers
  - null-prototype parser maps
  - preserved `SheetNames` semantics in ZIP parsing
  - preserved JSON header indexes
  - stronger real-workbook security regressions
  - Verdaccio consumer smoke-test environment
- Latest validation results:
  - `npm run build`: passed
  - `make dist`: passed
  - `make mdlint`: passed
  - `npm test`: `37346 passing`, `1 pending`
  - `npm pack --dry-run`: passed
  - local tarball install smoke: passed
  - Verdaccio direct and alias smoke: passed
  - consumer `npm audit --omit=dev`: `0 vulnerabilities`
  - official npm publish: `npm publish --access public --registry https://registry.npmjs.org/`
  - official npm access state: `@stackline/xlsx` is public with `latest: 1.0.0`
  - official npm tarball URL is available, but packument reads returned 404
    immediately after first publish; treat as npm registry propagation/cache
    until `npm view @stackline/xlsx` returns normally
  - GitHub Actions on `github` at commit `1a70a90`:
    - `Tests: pretest/posttest`: passed
    - `Tests: Bun`: passed
    - `Tests: deno 1.x`: passed
    - `Tests: node.js`: passed
  - `@stackline/xlsx@1.0.1` release validation:
    - local `npm run build`: passed
    - local `PATH="$PWD/node_modules/.bin:$PATH" make dist`: passed
    - local `make mdlint`: passed
    - local `npm test`: `37346 passing`, `1 pending`
    - local `npm pack --dry-run`: passed
    - GitHub Actions on `github` at commit `738cb9a`: passed
    - official npm publish: `@stackline/xlsx@1.0.1`
    - official npm `latest`: `1.0.1`
    - official npm direct and alias smoke install: passed
    - consumer `npm audit --omit=dev`: `0 vulnerabilities`
    - public docs synced to `https://alexandro.net/docs/vanilla/xlsx/`
  - `@stackline/xlsx@1.0.2` release validation:
    - fixed README badge/license links to
      `https://github.com/alexandroit/sheetjs/blob/github/LICENSE`
    - local `npm run build`: passed
    - local `PATH="$PWD/node_modules/.bin:$PATH" make dist`: passed
    - local `make mdlint`: passed
    - local `npm test`: `37346 passing`, `1 pending`
    - local `npm pack --dry-run`: passed
    - GitHub Actions on `github` at commit `962740e`: passed
    - official npm publish: `@stackline/xlsx@1.0.2`
    - official npm `latest`: `1.0.2`
    - official npm direct and alias smoke install: passed
    - Verdaccio `latest`: `1.0.2`
    - Verdaccio direct and alias smoke install: passed
    - consumer `npm audit --omit=dev`: `0 vulnerabilities`
    - public docs synced to `https://alexandro.net/docs/vanilla/xlsx/`

## Public Release Decision

- The official npm first release should be `@stackline/xlsx@1.0.0`.
- The package should not publish the deprecated `xlsx` CLI command.
- `publishConfig` should not point to Verdaccio in the public-ready package.
- `homepage` should point to the public docs:

```text
https://alexandro.net/docs/vanilla/xlsx/
```

## Review Summary

The first security patch was rated `7/10`.

Reasoning:

- Good as a security hotfix: it fixed the core issue, passed tests, published
  to Verdaccio and preserved the existing `xlsx` alias path.
- Not yet senior 2026 quality: it is still a defensive patch spread across
  parser paths instead of a clean security architecture.
- The next stage should harden compatibility, standardize sanitization and
  improve release reproducibility.

The desired target is `9/10`: a public package with clean documentation,
centralized safety primitives, stronger regression coverage, reproducible
builds and CI.

## Extracted Technical Findings

### `parse_zip` compatibility risk

Current concern:

- `safeSheetNames` was built from sheets that were actually parsed.
- This can change behavior when `opts.sheets` is used or when a sheet fails in
  tolerant parsing mode.

Senior direction:

- Keep separate concepts:
  - `safeAllSheetNames`: every workbook sheet name that is valid and safe.
  - `parsedSheets`: sheet names that were actually loaded into `Sheets`.
- Preserve upstream `SheetNames` semantics wherever possible.

### JSON header index risk

Current concern:

- In `sheet_add_json`, filtering unsafe headers by pushing into a new array can
  compact indexes.
- Example: `["a", "__proto__", "b"]` can move `b` to a different column.

Senior direction:

- Preserve indexes with `null`, `undefined` or holes instead of compacting the
  user-provided header array.
- Ensure dangerous headers are ignored without shifting later columns.

### Partial sanitization risk

Current concern:

- `is_proto_key` currently checks exact string matches.
- `safe_set_obj` should be responsible for safe key normalization before any
  write.

Senior direction:

- Coerce keys safely before comparing.
- Reject or ignore unsafe keys consistently.
- Avoid direct writes like `obj[key] = value` when `key` can come from a file
  or user data.

### Plain object map risk

Current concern:

- Internal parser maps still use `{}` in some paths.
- Examples from review:
  - `hash = {}` in relationships parsing.
  - `sheets = {}` in ZIP parsing.

Senior direction:

- Use `Object.create(null)` for maps that receive untrusted keys.
- Wrap creation in a helper such as `safeDict`.

### Test coverage gaps

Current concern:

- The first regression tests cover important utility and XLML cases, but not
  enough real workbook formats.
- The ReDoS regression is timing-based, which can be flaky on loaded CI
  machines.

Senior direction:

- Add malicious fixtures and targeted tests for:
  - real XLSX workbook sheet names
  - real XLS workbook sheet names
  - ODS / FODS sheet names
  - relationships with unsafe IDs or targets
  - custom properties with unsafe names
  - `opts.sheets`
- Prefer deterministic bounded parser behavior over timing-only ReDoS tests.

### Distribution build risk

Original concern:

- `make dist` failed because the target expected `modules/xlsx.zahl.js` and
  `modules/xlsx.zahl.mjs`.

Current status:

- The Makefile was adjusted so optional `xlsx.zahl` module files are copied
  only when present.
- `make dist` now passes locally.

Senior direction:

- Keep `make dist` in CI so distribution artifacts remain reproducible.

## Fork vs Rewrite Decision

Decision: keep and evolve the fork.

Reasoning:

- `xlsx` compatibility includes years of behavior across XLSX, XLS, XLSB, ODS,
  CSV, HTML, DBF, codepages, dates, formulas, styles, comments and malformed
  files.
- A rewrite from zero would look cleaner but would likely lose real-world
  compatibility.
- A new library only makes sense if the supported scope is intentionally
  smaller, for example:
  - only modern XLSX
  - only reading
  - only simple writing
  - no XLS
  - no ODS
  - no macro-related behavior
  - no full `xlsx` drop-in promise

Long-term architecture:

- Phase 1: compatible secure fork.
- Phase 2: Stackline docs, security policy, CI, release process and tests.
- Phase 3: modernize critical internals behind the compatible API.
- Phase 4: consider a smaller original library only if product usage proves
  the full `xlsx` surface is unnecessary.

## Public npm Readiness

Before npm public release:

- Replace internal/Verdaccio language with public package language.
- Clearly state this is an independent maintained fork based on SheetJS CE.
- Keep Apache-2.0 attribution and original notices.
- Prefer public install command:

```bash
npm install @stackline/xlsx
```

- Document alias install only for migration:

```bash
npm install xlsx@npm:@stackline/xlsx
```

- Avoid over-promising with names or marketing like `secure xlsx`.
- Preferred positioning:

```text
A maintained SheetJS-compatible fork with security hardening for known
prototype pollution and ReDoS advisories.
```

## Senior Improvements Backlog

### 1. Public npm polish

- Keep README primary install command as `npm install @stackline/xlsx`.
- Keep `xlsx@npm:@stackline/xlsx` in a migration section.
- Keep changelog notes current with the upstream base used by the release.

### 2. Centralize security helpers

- Replace scattered checks with a small shared helper set:
  - `isUnsafeKey`
  - `safeSet`
  - `safeHas`
  - `safeDict`
- Ensure helpers coerce keys safely before comparison.
- Avoid ad hoc `obj[key] = value` for user-controlled keys.

### 3. Use null-prototype dictionaries

- Replace parser maps that receive untrusted keys with `Object.create(null)`.
- Priority areas:
  - workbook `Sheets`
  - relationships maps
  - custom properties
  - XML attribute objects
  - header counters in JSON conversion

### 4. Preserve compatibility semantics

- Review `parse_zip` sheet filtering so `SheetNames` behavior matches upstream
  behavior when `opts.sheets`, `bookSheets`, partial parsing or tolerant parse
  paths are used.
- Avoid changing row or column positions when ignoring dangerous JSON headers.
- In `sheet_add_json`, preserve header indexes instead of compacting user
  headers after filtering unsafe keys.

### 5. Add stronger regression coverage

- Add malicious real-file fixtures for:
  - XLSX workbook sheet names
  - XLS workbook sheet names
  - ODS / FODS sheet names
  - custom properties
  - relationship IDs and targets
- Add tests for both default tolerant mode and `WTF` strict mode.
- Avoid timing-only ReDoS tests where possible. Prefer deterministic bounded
  parser behavior plus a conservative smoke timeout.

### 6. Release engineering

- Keep `npm run build` and `make dist` reproducible.
- Add CI that runs:
  - markdown lint
  - targeted security tests
  - full test suite
  - build
  - dist build
  - `npm pack --dry-run`
  - smoke install with direct scoped package
  - smoke install with `xlsx` npm alias
  - `npm audit --omit=dev` in the consumer project

### 7. TypeScript and Angular consumer checks

- Verify `types/index.d.ts` still works with direct scoped imports.
- Verify Angular consumer builds with:
  - `import * as XLSX from '@stackline/xlsx'`
  - `import * as XLSX from 'xlsx'` through npm alias
- Keep browser fields and exports compatible with Angular bundlers.

### 8. Documentation standard

- Keep README aligned with the Stackline package style used by
  `@stackline/angular-multiselect-dropdown`.
- Avoid internal-only language in public docs.
- Keep `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md` and `README.md`
  included in the package tarball.

### 9. License compliance documentation TODO

- [ ] Add a root `NOTICE` or `THIRD_PARTY_NOTICES.md` file for stronger public
  package auditability.
- [ ] Explicitly state that the fork is based on SheetJS Community Edition and
  that original SheetJS copyrights belong to SheetJS LLC.
- [ ] Document that Stackline maintains the security hardening and downstream
  release changes.
- [ ] Mention included Apache-2.0 SheetJS components such as `codepage` /
  `cpexcel` where applicable.
- [ ] Include the notice file in `package.json#files` so it ships in the npm
  tarball.
- [ ] Link the notice file from the README license section and public docs
  footer.
- [ ] Re-run `npm pack --dry-run` and confirm `LICENSE`, `dist/LICENSE` and the
  new notice file are included.

## Commands Worth Remembering

```bash
npm run build
PATH="$PWD/node_modules/.bin:$PATH" make dist
make mdlint
npx mocha -R spec -t 10000 test.js -g "security regressions"
npm test
npm pack --dry-run
```

## Important Caution

Do not republish an already published official npm version expecting README
changes to appear. Official npm package versions are immutable; bump the
version for npm.

Verdaccio is internal and can be repaired by explicit unpublish/republish when
the team accepts that tradeoff. This was done for `@stackline/xlsx@1.0.0` on
May 27, 2026 so Verdaccio matches the public-ready package metadata.
