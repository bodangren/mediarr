import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

/**
 * A router, not a pinned model — chosen 2026-07-28 so the parser survives model
 * retirement. Pinning a single model means the app silently degrades the day that
 * model is withdrawn; the router re-points itself.
 *
 * The previous default, `minimax/minimax-m2.7`, measured 77–88s against a 15s abort
 * deadline: 4–6× slower than its own timeout, so every call aborted and the AI layer
 * silently degraded to regex.
 */
const DEFAULT_OPENROUTER_MODEL = 'openrouter/pareto-code';

/** Router model ids that accept the `pareto-router` plugin's quality/cost dial. */
const PARETO_ROUTER_MODELS = ['openrouter/pareto-code'];

/**
 * The pareto router's quality/cost dial (0–1). Higher demands a stronger model from
 * its shortlist, and costs more.
 *
 * Default 0 is measured, not guessed. Sweep on 2026-07-28 over 8 real titles,
 * `temperature=0`, scoring exact matches on title/season/episode/year:
 *
 * | min_coding_score | routed to        | latency | $/1000 titles | exact |
 * |------------------|------------------|---------|---------------|-------|
 * | 0                | gpt-5.6-luna     | 6.9s    | $0.142        | 8/8   |
 * | 0.25             | gpt-5.6-luna     | 7.0s    | $0.144        | 8/8   |
 * | 0.5              | gpt-5.6-terra    | 2.4s    | $0.295        | 8/8   |
 * | 0.75             | gpt-5.6-sol      | 13.2s   | $1.827        | 8/8   |
 * | 1                | gpt-5.6-sol      | 7.6s    | $1.643        | 8/8   |
 *
 * Every rung parsed correctly, so quality above 0 buys nothing on this task while
 * costing up to 12.9× more. Start at the floor and escalate only on failure — see
 * {@link RETRY_SCORE_STEP}.
 */
export const DEFAULT_MIN_CODING_SCORE = 0;

/**
 * How much to raise `min_coding_score` on each retry.
 *
 * A retry means the cheap tier produced an error, a timeout, or an unusable response.
 * Rather than repeat the same request and hope, each attempt buys a stronger model.
 * This keeps the steady-state cost at the floor while giving hard titles a real
 * chance, instead of falling to regex after three identical failures.
 */
export const RETRY_SCORE_STEP = 0.1;

/** Clamps a quality dial into the range the router accepts. */
export function clampCodingScore(score: number): number {
  if (!Number.isFinite(score)) return DEFAULT_MIN_CODING_SCORE;
  return Math.min(1, Math.max(0, score));
}

/** True when `modelId` is a pareto router that accepts the quality dial. */
export function isParetoRouter(modelId: string): boolean {
  return PARETO_ROUTER_MODELS.includes(modelId);
}
const DEFAULT_GATEWAY_API_KEY = 'local-dev-key';

/**
 * Models measured to complete a release-parse call well inside its abort deadline.
 *
 * Measured 2026-07-28 against OpenRouter. Latency figures are for a 25-title batch
 * (the production batch size) except where noted:
 *
 * | model                        | latency @25 | $/1000 titles | alignment |
 * |------------------------------|-------------|---------------|-----------|
 * | openrouter/pareto-code       | 15.9–17.8s  | $0.142 @score0| 48/48     |
 * | google/gemini-2.5-flash-lite | 5.0–7.2s    | $0.047        | 96/96     |
 * | mistralai/mistral-nemo       | 9–15s @8    | $0.0043       | 7-of-8 ×2 |
 * | openrouter/auto              | 14–21s @8   | $4.41         | OK        |
 * | openrouter/free              | 31–35s @8   | $0            | 6-of-8    |
 * | minimax/minimax-m2.7         | 77–88s @8   | $0.61         | never returned |
 *
 * A model outside this list is not rejected — it produces a one-time startup warning,
 * so an `OPENROUTER_MODEL` override that reintroduces the "slower than its own
 * timeout" defect is visible rather than silent. Note this static allowlist is a weak
 * signal for a *router*, whose backing model changes underneath a stable id; the
 * durable guard is the per-call latency warning in ReleaseParser.
 */
export const KNOWN_FAST_MODELS: readonly string[] = [
  'openrouter/pareto-code',
  'google/gemini-2.5-flash-lite',
  'mistralai/mistral-nemo',
];

/** Abort deadline for {@link ReleaseParser.parse} — a single title. */
export const DEFAULT_PARSE_TIMEOUT_MS = 30_000;
/** Abort deadline for {@link ReleaseParser.parseBatch} — up to 25 titles in one call. */
export const DEFAULT_BATCH_TIMEOUT_MS = 60_000;
/** Abort deadline for {@link ReleaseParser.parseFiles} — up to 50 paths per call. */
export const DEFAULT_FILES_TIMEOUT_MS = 90_000;
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
 * Reads a 0..1 float from the environment. Unlike {@link readPositiveIntEnv}, zero is
 * a legitimate value here — it is the cheapest rung of the quality dial and the
 * measured default.
 */
function readPositiveFloatEnv(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
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
  /** The resolved pareto-router quality dial, when the model is a pareto router. */
  minCodingScore?: number;
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

/**
 * Resolves the provider, model, and — for pareto routers — the quality/cost dial.
 *
 * @param minCodingScore Overrides the configured floor. Callers escalate this on
 *   retry (see {@link RETRY_SCORE_STEP}) so a failed cheap attempt buys a stronger
 *   model rather than repeating itself.
 */
export function resolveReleaseParserAiConfig(minCodingScore?: number): ReleaseParserAiConfig {
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

    // The pareto router exposes a 0–1 quality/cost dial. Attach it explicitly so the
    // request states its cost preference rather than accepting the router's default.
    // The SDK's typed `plugins` union does not yet include `pareto-router`, so this
    // goes through `extraBody` passthrough.
    const codingScore = isParetoRouter(modelId)
      ? clampCodingScore(
          minCodingScore ??
            readPositiveFloatEnv('RELEASE_PARSER_MIN_CODING_SCORE', DEFAULT_MIN_CODING_SCORE),
        )
      : null;

    const model = (codingScore === null
      ? openrouter(modelId)
      : openrouter(modelId, {
          extraBody: {
            plugins: [{ id: 'pareto-router', min_coding_score: codingScore }],
          },
        })) as LanguageModel;

    return {
      enabled: true,
      model,
      providerOptions: { openrouter: {} },
      source: 'openrouter',
      modelId,
      ...(codingScore !== null ? { minCodingScore: codingScore } : {}),
      description:
        codingScore !== null
          ? `OpenRouter using ${modelId} (min_coding_score=${codingScore})`
          : `OpenRouter using ${modelId}`,
    };
  }

  return {
    enabled: false,
    source: 'none',
    description: 'Regex fallback only (no AI provider configured)',
  };
}
