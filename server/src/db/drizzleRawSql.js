// CJS companion for createRequire compatibility.
// The canonical implementation lives in drizzleRawSql.ts.
// This file is a thin JS mirror for environments where createRequire cannot load .ts files.

async function runRawDrizzle(client, query) {
  const built = query.buildQueryFromSourceParams(
    query.queryChunks,
    { escapeSequences: false, escapeParam: () => '?' },
  );
  const stmt = client.sqlite.prepare(built.sql);
  const result = stmt.run(...built.params);
  return Number(result.changes ?? 0);
}

module.exports = { runRawDrizzle };
