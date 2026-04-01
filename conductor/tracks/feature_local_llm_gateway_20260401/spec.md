# Specification: Local LLM Gateway Routing

## Overview

`ReleaseParser` currently routes all AI SDK requests directly through OpenRouter. We need to support an OpenAI-compatible local gateway instead, driven by environment variables, so the parser can send requests to a local multimodal gateway without changing call sites. When the local gateway is not configured, the current OpenRouter path must continue to work.

## Functional Requirements

1. Add environment-driven provider selection for `ReleaseParser`.
2. When local gateway environment variables are present, `ReleaseParser` must use an OpenAI-compatible AI SDK provider pointed at the configured base URL.
3. The model used for local-gateway requests must come from environment variables rather than a hardcoded provider/model pair.
4. When local-gateway configuration is absent, `ReleaseParser` must preserve the current OpenRouter behavior and regex fallback behavior.
5. Smoke scripts and developer-facing docs must describe the new local-gateway configuration path.

## Non-Functional Requirements

1. Preserve existing `parse`, `parseBatch`, and `parseFiles` behavior aside from provider routing.
2. Keep the provider decision centralized so future AI call sites can reuse it.
3. Maintain unit coverage for provider selection, fallback behavior, and prompt wiring.

## Acceptance Criteria

1. `ReleaseParser` uses the local gateway when gateway env vars are set.
2. `ReleaseParser` still uses OpenRouter when gateway env vars are absent and `OPENROUTER_API_KEY` is set.
3. `ReleaseParser` still falls back without AI when neither provider is configured.
4. Unit tests cover local-gateway routing and OpenRouter fallback.
5. Smoke scripts and README guidance mention the new env vars and routing behavior.

## Out of Scope

1. Adding new multimodal features beyond `ReleaseParser`.
2. Replacing every historical AI integration in the repository.
3. Building authentication flows for the gateway.
