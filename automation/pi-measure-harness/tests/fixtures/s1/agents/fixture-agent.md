---
description: "S1 manifest test fixture agent"
model: "openai/gpt-5.6-sol"
mode: "subagent"
---
A minimal agent used solely to exercise the S1 manifest contract.

The harness must compute a deterministic hash of this file (or its prompt body)
and compare it against the value stored in the manifest's `agentHashes` map.

If the on-disk file is edited, the manifest must report `drift:agent:fixture-agent.md`.
