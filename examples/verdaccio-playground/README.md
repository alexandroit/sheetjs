# Stackline XLSX local playground

This private, framework-free application tests the exact `@stackline/xlsx@1.0.8-verdaccio.1` artifact installed from the local Verdaccio registry. It does not publish packages or modify the library.

```sh
cd examples/verdaccio-playground
npm ci --registry=http://127.0.0.1:4873
npm start
```

Open http://localhost:4178/ . The server binds to `127.0.0.1`; override the port with `PLAYGROUND_PORT=4179 npm start` if needed. The registry must be running for installation, but the already-installed app runs without it.

- http://localhost:4178/#workbook — edit typed cells, cached formulas, comments, hyperlinks, sheets, properties, merges and dimensions.
- http://localhost:4178/#formats — import local files, choose among 29 writer selectors (including aliases), download and inspect a reread comparison.
- http://localhost:4178/#convert — JSON, arrays, CSV, TSV, HTML, formula listing, pasted input and address helpers.
- http://localhost:4178/#formatting — SSF formatting and serial dates.
- http://localhost:4178/#encoding — legacy encodings and Unicode bytes.
- http://localhost:4178/#cfb — inspect and create ZIP/CFB containers.
- http://localhost:4178/#tests — run browser and Node regression checks and download the JSON report.
- http://localhost:4178/#coverage — scope, actual installed identity and real source files for the running examples.

Uploaded files remain in the browser and are parsed in disposable workers (32 MB file limit, 20-second timeout). The editable preview shows up to 40 rows and 16 columns per page; exporting includes all loaded cells. The optional import row limit discards rows deliberately and shows a warning. Main-thread conversions and exports reject ranges exceeding 250,000 cell positions before calling the library; use a smaller conversion range or an import row limit. The comparison inspects at most 2,000 cells and displays at most 100 differences. Save edits through a download before closing or restoring the sample: this playground keeps workbook state in memory.

HTML previews run in a script-disabled sandbox with a restrictive CSP. The Node endpoint accepts same-origin POST requests and only runs fixed demonstrations in temporary directories, then deletes them. No client file paths or code are executed by the server. The static route allowlist does not expose `.npmrc` or arbitrary workspace files.

## Scope and limits

The app exercises the installed library, not an Excel calculation/rendering engine. Formulas need explicit cached values. It does not execute macros, provide encrypted export, guarantee complete preservation of styles/charts/pivots, or stream XLSX reads. Legacy formats can lose Unicode and metadata. Sheet rename does not rewrite formula references. The grid intentionally exposes hidden cells and merged-cell coordinates for inspection.

The browser suite reports actual failures and explicit unsupported cases. These results are not a claim of exhaustive compatibility or security. The producer's existing full test suite is separate; this app is an interactive consumer and targeted regression harness.

Use `npm run test:node` for the fixed local Node checks. The application has no runtime dependency beyond the candidate and its npm alias, both pinned in the local lockfile.

## Known candidate regressions exposed by the playground

The exact immutable candidate has three reproducible failures: NUMBERS export rereads negative values such as `-7.5` as `0`; WK3 export rereads `-7.5` as `-491512.5`; and XLSX `read` with an array-valued `sheets` filter materializes an unrequested sheet. A scalar sheet name/index works in the independent probe. These failures remain visible in the test panel. The playground does not patch or replace the published runtime.
