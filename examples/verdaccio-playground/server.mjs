import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { runNodeChecks } from './node-checks.mjs';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PLAYGROUND_PORT || 4178);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Invalid PLAYGROUND_PORT');
const packageRoot = `${root}node_modules/@stackline/xlsx/`;
const pkg = JSON.parse(await readFile(`${packageRoot}package.json`, 'utf8'));
const alias = JSON.parse(await readFile(`${root}node_modules/xlsx/package.json`, 'utf8'));
const lock = JSON.parse(await readFile(`${root}package-lock.json`, 'utf8'));
const installed = lock.packages['node_modules/@stackline/xlsx'];
if (pkg.version !== '1.0.8-verdaccio.1' || alias.version !== pkg.version || !installed.resolved.startsWith('http://127.0.0.1:4873/')) {
    throw new Error('This playground requires the exact Verdaccio candidate. Run npm ci in this directory.');
}
const identity = { name: pkg.name, version: pkg.version, aliasVersion: alias.version, registry: 'http://127.0.0.1:4873', resolved: installed.resolved, integrity: installed.integrity, moduleSha256: createHash('sha256').update(await readFile(`${packageRoot}xlsx.mjs`)).digest('hex') };
const routes = new Map([
    ['/', ['public/index.html', 'text/html']],
    ...['app.js', 'features.js', 'read-worker.mjs'].map(name => [`/${name}`, [`public/${name}`, 'text/javascript']]),
    ['/styles.css', ['public/styles.css', 'text/css']],
    ['/source/node-checks.mjs', ['node-checks.mjs', 'text/plain']],
    ['/README.md', ['README.md', 'text/plain']],
    ...['xlsx.mjs', 'dist/cpexcel.full.mjs', 'dist/xlsx.zahl.mjs', 'dist/xlsx.full.min.js', 'dist/xlsx.core.min.js', 'dist/xlsx.mini.min.js'].map(name => [`/vendor/${name.replace('dist/', '')}`, [`node_modules/@stackline/xlsx/${name}`, 'text/javascript']])
]);
const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
const allowedOrigins = new Set([...allowedHosts].map(host => `http://${host}`));
let checksRunning = false;
function send(res, status, data, type = 'application/json') {
    res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(type === 'application/json' ? JSON.stringify(data) : data);
}
const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    if (!allowedHosts.has(req.headers.host) || (req.headers.origin && !allowedOrigins.has(req.headers.origin)))
        return send(res, 403, { error: 'Local requests only' });
    let path;
    try {
        if (!req.url.startsWith('/') || req.url.startsWith('//'))
            return send(res, 400, { error: 'Invalid request target' });
        path = new URL(req.url, `http://127.0.0.1:${port}`).pathname;
    }
    catch {
        return send(res, 400, { error: 'Invalid request target' });
    }
    try {
        if (path === '/api/node-checks') {
            if (req.method !== 'POST')
                return send(res, 405, { error: 'POST required' });
            if (!allowedOrigins.has(req.headers.origin))
                return send(res, 403, { error: 'A local browser Origin is required' });
            if (Number(req.headers['content-length'] || 0) > 1024 || req.headers['transfer-encoding'])
                return send(res, 413, { error: 'Request body is not needed' });
            if (checksRunning)
                return send(res, 429, { error: 'Tests already running' });
            checksRunning = true;
            try {
                send(res, 200, await runNodeChecks());
            }
            finally {
                checksRunning = false;
            }
            return;
        }
        if (req.method !== 'GET' && req.method !== 'HEAD')
            return send(res, 405, { error: 'GET required' });
        if (path === '/api/identity')
            return send(res, 200, identity);
        if (path === '/favicon.ico') {
            res.writeHead(204);
            res.end();
            return;
        }
        const route = routes.get(path);
        if (!route)
            return send(res, 404, { error: 'Not found' });
        const content = await readFile(`${root}${route[0]}`);
        send(res, 200, req.method === 'HEAD' ? '' : content, route[1]);
    }
    catch (error) {
        console.error(error.message);
        send(res, 500, { error: 'Local operation failed. See the server log.' });
    }
});
server.requestTimeout = 30000;
server.listen(port, '127.0.0.1', () => console.log(`XLSX ${pkg.version} playground: http://localhost:${port}`));
