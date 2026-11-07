---
description: "Model-resolution fixture agent (unmapped, malformed sourceModel)"
mode: subagent
model: just-a-string-without-slash
---
Model-resolution fixture agent (unmapped, malformed).

Synthetic agent used by tests/model-resolution.test.mjs to exercise the
suggestion-classification contract. The model's `sourceModel`
(`just-a-string-without-slash`) is absent from `MODEL_MAP` and is NOT
well-formed (no `<provider>/<id>` shape), so the suggestion must be
`reference_incorrect`.
