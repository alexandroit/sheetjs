#!/usr/bin/env bash
set -euo pipefail

TS_VERSION="${1:-${TYPESCRIPT_VERSION:-3.9.10}}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMPDIR_ROOT="${TMPDIR:-/tmp}"
WORKDIR="$(mktemp -d "$TMPDIR_ROOT/xlsx-ts-compat-XXXXXX")"

cleanup() {
	rm -rf "$WORKDIR"
}
trap cleanup EXIT

PACKDIR="$WORKDIR/pack"
APPDIR="$WORKDIR/app"
mkdir -p "$PACKDIR" "$APPDIR"

cd "$ROOT"
TARBALL_NAME="$(npm pack --silent --pack-destination "$PACKDIR")"
TARBALL="$PACKDIR/$TARBALL_NAME"

cd "$APPDIR"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund "typescript@$TS_VERSION" "$TARBALL"

# npm aliases only work with registry dependencies.  For prepublish checks,
# mirror the packed package into the legacy name to validate `import "xlsx"`.
rm -rf node_modules/xlsx
cp -R node_modules/@stackline/xlsx node_modules/xlsx

TS_MAJOR="${TS_VERSION%%.*}"
if [ "$TS_MAJOR" -ge 6 ]; then
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "es2015",
    "module": "node16",
    "moduleResolution": "node16",
    "strict": true,
    "skipLibCheck": false,
    "noEmit": true
  },
  "files": ["index.ts"]
}
JSON
else
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": false,
    "noEmit": true
  },
  "files": ["index.ts"]
}
JSON
fi

cat > index.ts <<'TS'
import * as StacklineXLSX from '@stackline/xlsx';
import * as XLSX from 'xlsx';

const wb: StacklineXLSX.WorkBook = StacklineXLSX.utils.book_new();
const ws: StacklineXLSX.WorkSheet = StacklineXLSX.utils.aoa_to_sheet([['ok'], [42]]);
StacklineXLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

const rows = XLSX.utils.sheet_to_json(wb.Sheets.Sheet1, { header: 1 }) as any[][];
const value: number = rows[1][0];
const bookType: StacklineXLSX.BookType = 'xlsx';
const out = StacklineXLSX.write(wb, { bookType, type: 'array' });
const safeHtml = StacklineXLSX.utils.sheet_to_html(ws, { sanitizeLinks: true });
const safeHtmlBook = StacklineXLSX.write(wb, { bookType: 'html', type: 'string', sanitizeLinks: true });

if(value !== 42 || !out || !safeHtml || !safeHtmlBook) throw new Error('TypeScript compatibility smoke failed');
TS

./node_modules/.bin/tsc -p tsconfig.json
node -e "console.log('typescript compat ok:', require('typescript').version)"
