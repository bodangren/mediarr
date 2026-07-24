import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const SERVER_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const BASELINE_PATH = path.join(SERVER_ROOT, 'eslint-baseline.json');
const WRITE_BASELINE = process.argv.includes('--write-baseline');
const sourceRootIndex = process.argv.indexOf('--source-root');
const SOURCE_ROOT =
  sourceRootIndex >= 0
    ? path.resolve(process.argv[sourceRootIndex + 1])
    : SERVER_ROOT;

function summarize(results) {
  const byFile = {};

  for (const result of results) {
    const relativePath = path
      .relative(SOURCE_ROOT, result.filePath)
      .split(path.sep)
      .join('/');
    const errorCounts = {};

    for (const message of result.messages) {
      if (message.severity !== 2) {
        continue;
      }
      const ruleId = message.ruleId ?? 'fatal';
      errorCounts[ruleId] = (errorCounts[ruleId] ?? 0) + 1;
    }

    if (Object.keys(errorCounts).length > 0) {
      byFile[relativePath] = Object.fromEntries(
        Object.entries(errorCounts).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      );
    }
  }

  const sortedFiles = Object.fromEntries(
    Object.entries(byFile).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  const totalErrors = Object.values(sortedFiles).reduce(
    (total, rules) =>
      total +
      Object.values(rules).reduce(
        (fileTotal, count) => fileTotal + count,
        0,
      ),
    0,
  );

  return { version: 1, totalErrors, byFile: sortedFiles };
}

function findRegressions(current, baseline) {
  const regressions = [];

  for (const [file, rules] of Object.entries(current.byFile)) {
    const allowedRules = baseline.byFile[file] ?? {};
    for (const [ruleId, count] of Object.entries(rules)) {
      const allowed = allowedRules[ruleId] ?? 0;
      if (count > allowed) {
        regressions.push({ file, ruleId, allowed, actual: count });
      }
    }
  }

  return regressions;
}

const eslint = new ESLint({
  cwd: SOURCE_ROOT,
  overrideConfigFile: path.join(SOURCE_ROOT, 'eslint.config.mjs'),
});
const results = await eslint.lintFiles(['src/**/*.ts']);
const current = summarize(results);

if (WRITE_BASELINE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
  console.log(
    'Wrote ESLint baseline: ' + current.totalErrors +
      ' errors across ' + Object.keys(current.byFile).length + ' files.',
  );
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
const regressions = findRegressions(current, baseline);

console.log(
  'Server ESLint: ' + current.totalErrors + ' legacy errors; baseline ' +
    baseline.totalErrors + '; ' + regressions.length +
    ' increased file/rule buckets.',
);
if (regressions.length > 0) {
  for (const regression of regressions.slice(0, 50)) {
    console.error(
      regression.file + ': ' + regression.ruleId + ' increased from ' +
        regression.allowed + ' to ' + regression.actual,
    );
  }
  process.exit(1);
}
