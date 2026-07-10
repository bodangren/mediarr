# OpenCode Coder Orchestrator Model Update

## Overview

Update the user-level OpenCode `coder-orchestrator` agent to use the locally available `openai/gpt-5.6-terra` model with `xhigh` reasoning. Refresh the front-matter description so it accurately reflects OpenAI's limited-preview status and pricing, plus the published OpenAI and independent Artificial Analysis evaluation results without conflating composite scores with coding-only results.

## Functional Requirements

- **FR-1:** The agent front matter must set `model` to `openai/gpt-5.6-terra`.
- **FR-2:** The agent front matter must set `reasoningEffort` to `xhigh` using OpenCode's documented provider-option syntax.
- **FR-3:** The description must identify Terra as the balanced, lower-cost GPT-5.6 tier, state that access is a limited preview, and include only benchmark or pricing claims supported by authoritative sources.
- **FR-4:** The description must distinguish Artificial Analysis composite results from OpenAI's own claims and must not present the composite score as a standalone coding benchmark or claim OpenAI's Sol Terminal-Bench result for Terra.
- **FR-5:** The routing instructions, coder roster, permissions, examples, and temperature must remain behaviorally unchanged unless a stale model claim requires a narrowly scoped wording update.

## Non-Functional Requirements

- Keep the Markdown/YAML agent file valid and ASCII-only.
- Preserve the existing agent's primary mode and delegation boundary.
- Record the source URLs and verification evidence in the track plan.

## Acceptance Criteria

- [x] `coder-orchestrator.md` contains the requested Terra model and `xhigh` setting.
- [x] The description reflects the current official GPT-5.6 Terra preview information without unsupported benchmark inflation.
- [x] `opencode models` lists `openai/gpt-5.6-terra` locally.
- [x] The edited agent file remains readable by OpenCode and retains the existing coder-only task permission.
- [x] Measure artifacts are updated and the completed track is archived.

## Out of Scope

- Changing the coder subagent roster, routing matrix, permissions, or provider credentials.
- Changing OpenCode installation, account access, or model availability.
- Adding a new benchmark harness or running model-quality evaluations.
