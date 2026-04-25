# Spec: AI-Powered Filename Parsing

## Overview
Replace regex-based filename and directory parsing in `Parser` and
`FilenameParsingService` with a GLM AI model (`glm-4.7-flash`) via an
OpenAI-compatible client. A new `AiParsingService` singleton wraps the client
and is called by both parsers. The existing regex logic is retained as a
fallback when the AI is unavailable.

## Functional Requirements

### FR1 — AiParsingService
- New singleton at `server/src/services/AiParsingService.ts`.
- Reads `GLM_API_KEY` from `process.env`; model constant: `glm-4.7-flash`.
- OpenAI-compatible client: `baseURL = "https://api.z.ai/api/paas/v4/"`.
- Single generic method: `parse<T>(systemPrompt, userPrompt): Promise<T | null>`.
- **Retry:** up to 3 attempts with exponential back-off (1 s, 2 s delays).
- **Timeout:** 10 seconds per attempt.
- Returns `null` on: network error, timeout, malformed JSON, missing fields.

### FR2 — Structured JSON responses
- Every prompt instructs the model to respond with a JSON object only.
- Service parses the JSON and validates required fields; failure = null.

### FR3 — Parser.ts integration (all methods become async)
- `Parser.parse(filename)` → AI → `ParsedInfo`; regex fallback.
- `Parser.parseMovie(filename)` → AI → `ParsedMovie`; regex fallback.
- `Parser.parseDirectory(dirName)` → AI → `ParsedDirectory`; regex fallback.
- All non-test call-site files updated to `await` the results.

### FR4 — FilenameParsingService.ts integration (both methods become async)
- `parseFilename(filename)` → AI → `ParsedMovieInfo`; regex fallback.
- `parseEpisodeFilename(filename)` → AI → `ParsedEpisodeInfo`; regex fallback.

### FR5 — Fallback triggers
Regex is used when:
1. Network/connection error.
2. Timeout after 10 s per attempt, exhausted after 3 retries.
3. AI returns malformed JSON or missing required fields.

### FR6 — Configuration
- `GLM_API_KEY` already in `.env`; no settings UI required.
- `openai` npm package added to `server/package.json`.

## Non-Functional Requirements
- Parsing is a background/import-time operation; 30 s worst-case acceptable.
- No response caching required for this track.
- `tsc --noEmit` must exit clean after async signature changes.

## Acceptance Criteria
- [ ] `AiParsingService` connects to Z.AI using `GLM_API_KEY`.
- [ ] All 5 parsing methods call `AiParsingService` first.
- [ ] Valid AI JSON maps correctly to existing parsed interfaces.
- [ ] Mocked AI failure produces identical output to pure regex path.
- [ ] Retry logic retries ≤ 3 times then falls back.
- [ ] All call-site files updated; `tsc --noEmit` clean.
- [ ] Test coverage ≥ 80% for `AiParsingService`, `Parser`, `FilenameParsingService`.

## Out of Scope
- Settings UI for model/API key configuration.
- Response caching.
- AI for custom format scoring or subtitle matching.
- Android TV client changes.
