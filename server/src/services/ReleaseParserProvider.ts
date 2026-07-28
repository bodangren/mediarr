import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * Pinned 2026-07-28. Measured 2.4–3.1s per 8-title call at $0.047/1000 titles, and
 * byte-identical across three runs at `temperature=0` — determinism matters here
 * because this output feeds auto-grab decisions.
 *
 * The previous default, `minimax/minimax-m2.7`, measured 77–88s against a 15s abort
 * deadline: 4–6× slower than its own timeout, so every call aborted and the AI layer
 * silently degraded to regex. See {@link KNOWN_FAST_MODELS} for the full comparison.
 */
const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash-lite';
const DEFAULT_GATEWAY_API_KEY = 'local-dev-key';

/**
 * Models measured to complete a release-parse call well inside its abort deadline.
 *
 * Measured 2026-07-28 against OpenRouter — 3 runs per arm, 8 real release titles,
 * `temperature=0`:
 *
 * | model                        | latency  | $/1000 titles | valid JSON | alignment |
 * |------------------------------|----------|---------------|------------|-----------|
 * | google/gemini-2.5-flash-lite | 2.4–3.1s | $0.047        | 3/3        | 3/3 OK    |
 * | mistralai/mistral-nemo       | 9–15s    | $0.0043       | 3/3        | 7-of-8 ×2 |
 * | openrouter/auto              | 14–21s   | $4.41         | 3/3        | 3/3 OK    |
 * | openrouter/free              | 31–35s   | $0            | 3/3        | 6-of-8    |
 * | minimax/minimax-m2.7         | 77–88s   | $0.61         | 1/3        | —         |
 *
 * Only entries with latency comfortably under {@link DEFAULT_PARSE_TIMEOUT_MS} are
 * listed. A model outside this list is not rejected — it produces a one-time startup
 * warning, so an `OPENROUTER_MODEL` override that reintroduces the "slower than its
 * own timeout" defect is visible rather than silent.
 */
export const KNOWN_FAST_MODELS: readonly string[] = [
  'google/gemini-2.5-flash-lite',
  'mistralai/mistral-nemo',
];

/** Abort deadline for {@link ReleaseParser.parse} — a single title. */
export const DEFAULT_PARSE_TIMEOUT_MS = 15_000;
/** Abort deadline for {@link ReleaseParser.parseBatch} — up to 25 titles in one call. */
export const DEFAULT_BATCH_TIMEOUT_MS = 30_000;
/** Abort deadline for {@link ReleaseParser.parseFiles} — up to 50 paths per call. */
export const DEFAULT_FILES_TIMEOUT_MS = 45_000;
/** Maximum in-flight single-title parse calls. */
export const DEFAULT_MAX_CONCURRENCY = 4;

export interface ReleaseParserRuntimeConfig {
  parseTimeoutMs: number;
  batchTimeoutMs: number;
  filesTimeoutMs: number;
  maxConcurrency: number;
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/**
 * Reads a positive integer from the environment, falling back to `fallback` when the
 * variable is unset, non-numeric, or non-positive. A zero or negative deadline would
 * abort every call instantly, so it is treated as absent rather than honoured.
 */
function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/**
 * Resolves the parser's timeouts and concurrency bound.
 *
 * These were three hardcoded literals (15s/20s/20s) until 2026-07-28. The shipped
 * default model measured 77–88s per call, so every call aborted and the AI layer
 * silently degraded to regex on every request. Making the deadlines configuration —
 * and defaulting them with real headroom over the pinned model — is what keeps that
 * failure mode from recurring undetected.
 */
export function resolveReleaseParserRuntimeConfig(): ReleaseParserRuntimeConfig {
  return {
    parseTimeoutMs: readPositiveIntEnv('RELEASE_PARSER_PARSE_TIMEOUT_MS', DEFAULT_PARSE_TIMEOUT_MS),
    batchTimeoutMs: readPositiveIntEnv('RELEASE_PARSER_BATCH_TIMEOUT_MS', DEFAULT_BATCH_TIMEOUT_MS),
    filesTimeoutMs: readPositiveIntEnv('RELEASE_PARSER_FILES_TIMEOUT_MS', DEFAULT_FILES_TIMEOUT_MS),
    maxConcurrency: readPositiveIntEnv('RELEASE_PARSER_MAX_CONCURRENCY', DEFAULT_MAX_CONCURRENCY),
  };
}

export interface ReleaseParserAiConfig {
  enabled: boolean;
  model?: LanguageModel;
  providerOptions?: { openrouter: Record<string, never> };
  source: 'gateway' | 'openrouter' | 'none';
  modelId?: string;
  description: string;
}

/** Model ids already warned about, so the warning fires once per model per process. */
const warnedModels = new Set<string>();

/**
 * Warns when the resolved model is not one measured to fit inside its abort deadline.
 *
 * This is a warning, not a rejection — operators keep the `OPENROUTER_MODEL` override
 * for models we have not measured. The point is that the original defect was
 * *silent*: a too-slow model aborts every call, `parse()` returns the regex result and
 * `parseBatch()` returns empty slots, so the parser looks alive while doing nothing.
 * A slow model is now at least loud.
 */
function warnIfModelNotKnownFast(modelId: string, source: string): void {
  if (KNOWN_FAST_MODELS.includes(modelId) || warnedModels.has(modelId)) return;
  warnedModels.add(modelId);
  console.warn(
    `[ReleaseParser] Model "${modelId}" (${source}) has not been measured against the ` +
      `parser's abort deadlines. If it takes longer than RELEASE_PARSER_PARSE_TIMEOUT_MS ` +
      `to respond, every call will abort and the parser will silently fall back to regex. ` +
      `Known-fast models: ${KNOWN_FAST_MODELS.join(', ')}.`,
  );
}

/** Test-only: clears the once-per-process warning memo. */
export function __resetModelWarningsForTests(): void {
  warnedModels.clear();
}

export function resolveReleaseParserAiConfig(): ReleaseParserAiConfig {
  const gatewayBaseURL = readEnv('AI_GATEWAY_BASE_URL');
  const gatewayModel = readEnv('AI_GATEWAY_MODEL') ?? readEnv('OPENROUTER_MODEL');

  if (gatewayBaseURL && gatewayModel) {
    warnIfModelNotKnownFast(gatewayModel, 'gateway');
    const openai = createOpenAI({
      baseURL: gatewayBaseURL,
      apiKey: readEnv('AI_GATEWAY_API_KEY') ?? readEnv('API_SECRET_KEY') ?? DEFAULT_GATEWAY_API_KEY,
    });

    return {
      enabled: true,
      model: openai(gatewayModel) as LanguageModel,
      source: 'gateway',
      modelId: gatewayModel,
      description: `OpenAI-compatible gateway (${gatewayBaseURL}) using ${gatewayModel}`,
    };
  }

  const openrouterApiKey = readEnv('OPENROUTER_API_KEY');
  if (openrouterApiKey) {
    const modelId = readEnv('OPENROUTER_MODEL') ?? DEFAULT_OPENROUTER_MODEL;
    warnIfModelNotKnownFast(modelId, 'openrouter');
    const openrouter = createOpenRouter({
      apiKey: openrouterApiKey,
    });

    return {
      enabled: true,
      model: openrouter(modelId) as LanguageModel,
      providerOptions: { openrouter: {} },
      source: 'openrouter',
      modelId,
      description: `OpenRouter using ${modelId}`,
    };
  }

  return {
    enabled: false,
    source: 'none',
    description: 'Regex fallback only (no AI provider configured)',
  };
}
