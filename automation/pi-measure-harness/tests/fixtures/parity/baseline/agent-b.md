---
description: "Parity fixture agent B (callable)"
mode: subagent
model: openai/gpt-5.6-luna
---
Parity fixture agent B body.

Synthetic agent used by tests/parity.test.mjs to exercise the
`rosterParity` contract. The on-disk description and mode are part of
the expected-roster fixture and must not drift silently.