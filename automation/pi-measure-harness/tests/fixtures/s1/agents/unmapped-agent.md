---
description: "S1 fixture agent with intentionally unmapped model"
model: "ghost-provider/ghost-model-9999"
mode: "subagent"
---
Unmapped model probe — the harness must reject this file via `unmapped_model:unmapped-agent`
because the `ghost-provider/ghost-model-9999` identifier has no entry in MODEL_MAP.
