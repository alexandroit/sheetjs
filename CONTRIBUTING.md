# Contributing

Thanks for helping improve `@stackline/xlsx`. This project is maintained as a
SheetJS-compatible fork with security hardening and compatibility guarantees for
applications that depend on the `xlsx` API.

## Development workflow

- Create focused changes with tests for the behavior being changed.
- Preserve the public `xlsx` API unless the change is explicitly documented as
  breaking.
- Keep security fixes in source files and regenerated bundles in the same
  change.
- Do not include private customer workbooks, proprietary spreadsheets or
  unlicensed sample files.
- Prefer small fixtures that demonstrate the issue without exposing real data.

## Local checks

Run the targeted security regression tests while developing:

```bash
npx mocha -R spec -t 10000 test.js -g "security regressions"
```

Run the full suite before opening a pull request:

```bash
npm test
```

Build and verify the package:

```bash
npm run build
npm pack --dry-run
```

## Pull requests

- Explain the problem and the compatibility impact.
- Link related advisories, issues or test cases when applicable.
- Add or update tests for parser, writer and utility behavior.
- Update `README.md` or `CHANGELOG.md` for user-facing changes.
- Confirm whether the change affects TypeScript definitions.

## Security fixes

Security reports should follow `SECURITY.md`. Do not publish exploit details in
public issues before a fix is available.

## License

Contributions are accepted under the Apache-2.0 license. By contributing, you
confirm that you have the right to submit the work and that it does not include
code or data from incompatible licenses.
