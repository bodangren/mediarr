---
description: "Model-resolution fixture agent (mapped provider/id)"
mode: subagent
model: openai/gpt-5.6-sol
---
Model-resolution fixture agent.

Synthetic agent used by tests/model-resolution.test.mjs to exercise the
strict-resolve contract. The model's `sourceModel` (`openai/gpt-5.6-sol`)
is present in `MODEL_MAP` and must resolve to `MODEL_MAP[sourceModel]`,
not be passed through as the sourceModel.
