import {runNodeChecks} from './node-checks.mjs';

const report = await runNodeChecks();
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.counts.failed > 0 ? 1 : 0;
