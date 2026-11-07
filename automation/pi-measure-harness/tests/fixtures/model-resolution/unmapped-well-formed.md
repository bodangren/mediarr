---
description: "Model-resolution fixture agent (unmapped, well-formed provider/id)"
mode: subagent
model: ghost-provider/ghost-model-9999
---
Model-resolution fixture agent (unmapped, well-formed).

Synthetic agent used by tests/model-resolution.test.mjs to exercise the
strict-resolve + suggestion-classification contracts. The model's
`sourceModel` (`ghost-provider/ghost-model-9999`) is absent from
`MODEL_MAP` and is well-formed (`<provider>/<id>`), so the suggestion
must be `map_entry_needed`.
