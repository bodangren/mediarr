# Plan: OpenCode Coder Orchestrator Model Update

## Phase 1: Research, Configuration, and Verification

- [x] Task: Establish the model configuration contract
    - [x] Decision update: Luna's OpenCode API endpoint was not working, so Terra is the selected compatible target.
    - [x] Verify the local model ID with `opencode models`.
    - [x] Verify OpenCode's `model` and `reasoningEffort` Markdown-agent syntax from the official agent documentation.
    - [x] Verify OpenAI's official model ID, preview status, pricing, and published evaluation caveats.
- [x] Task: Update the global agent configuration
    - [x] Set `model: openai/gpt-5.6-terra`.
    - [x] Set `reasoningEffort: xhigh`.
    - [x] Replace stale GPT-5.5 description claims with sourced GPT-5.6 Terra information while preserving routing behavior.
- [x] Task: Verify and close out
    - [x] Validate the agent front matter and confirm the model remains available locally with PyYAML and `opencode models`.
    - [x] Re-read the final file and check that `mode: primary` and the coder-only task permission are unchanged; `opencode agent list --pure` loads the agent.
    - [x] Update this plan, archive the completed track, and update `measure/tracks.md`.

### Sources

- OpenAI, [Previewing GPT-5.6 Sol: a next-generation model](https://openai.com/index/previewing-gpt-5-6-sol/): family positioning, capability claims, preview availability, and pricing.
- OpenAI Help Center, [A preview of GPT-5.6 Sol, Terra, and Luna](https://help.openai.com/en/articles/20001325-a-preview-of-gpt-5-6-sol-terra-and-luna): model ID, limited-preview access, and pricing table.
- OpenAI, [GPT-5.6 Preview System Card](https://deploymentsafety.openai.com/gpt-5-6-preview/gpt-5-6-preview.pdf): published GPT-5.6 family evaluation context and benchmark caveats.
- OpenCode, [Agents documentation](https://opencode.ai/docs/agents/): `provider/model-id` syntax and pass-through `reasoningEffort` option.
- Artificial Analysis, [GPT-5.6 Terra (xhigh)](https://artificialanalysis.ai/models/gpt-5-6-terra-xhigh), plus the linked low/medium/high/max pages: independent Intelligence Index effort curve, speed, latency, context, and price measurements.
