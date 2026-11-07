---
description: "Parity fixture agent A (callable)"
mode: subagent
model: openai/gpt-5.6-sol
---
Parity fixture agent A body.

Synthetic agent used by tests/parity.test.mjs to exercise the
`rosterParity` contract. The on-disk description and mode are part of
the expected-roster fixture and must not drift silently.