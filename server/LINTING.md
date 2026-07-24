# Server ESLint baseline

The server currently has substantial historical ESLint debt. The normal
`npm run lint --workspace=server` gate runs ESLint over every production and
test TypeScript file in `server/src` and fails whenever any file/rule bucket
increases above `eslint-baseline.json`. Reductions pass, so cleanup can land
incrementally without suppressing rules or excluding tests.

For a change set, also run strict lint over its touched server files:

`npm run lint:changed --workspace=server -- src/path/to/file.ts`

That command has no baseline allowance: every supplied changed file must be
clean. Updating the baseline is not part of normal CI. It is an explicit,
reviewed maintenance action:

`node server/scripts/lint-baseline.mjs --write-baseline`
