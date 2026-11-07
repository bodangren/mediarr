---
description: "Model-resolution fixture agent (load-path probe — unmapped, well-formed)"
mode: subagent
model: ghost-provider/ghost-model-9999
---
Model-resolution fixture agent (load-path probe).

Synthetic agent used by tests/model-resolution.test.mjs to exercise the
fail-closed load-time contract. The model's `sourceModel`
(`ghost-provider/ghost-model-9999`) is absent from `MODEL_MAP`. The
load path must not silently coerce the unmapped reference into a
passthrough; the resulting agent's `model` field must be `undefined`.
