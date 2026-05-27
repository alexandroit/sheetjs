# Verdaccio Consumer Smoke Test

This folder validates the package exactly as an application would consume it
from Verdaccio.

## Install

```bash
npm install
```

The local `.npmrc` points to `http://localhost:4873`.

## Run

```bash
npm test
```

The smoke tests cover:

- direct scoped usage: `require('@stackline/xlsx')`
- migration alias usage: `require('xlsx')`
- ESM usage: `import * as XLSX from '@stackline/xlsx'`
