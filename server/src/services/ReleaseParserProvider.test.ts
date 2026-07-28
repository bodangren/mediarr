import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
// Mirrors the mocking style used in ReleaseParser.test.ts.

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => vi.fn(() => 'mock-openrouter-model')),
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => vi.fn(() => 'mock-openai-compatible-model')),
}));

import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  resolveReleaseParserAiConfig,
  resolveReleaseParserRuntimeConfig,
  KNOWN_FAST_MODELS,
  DEFAULT_PARSE_TIMEOUT_MS,
  DEFAULT_BATCH_TIMEOUT_MS,
  DEFAULT_FILES_TIMEOUT_MS,
  DEFAULT_MAX_CONCURRENCY,
} from './ReleaseParserProvider';

const mockCreateOpenAI = vi.mocked(createOpenAI);
const mockCreateOpenRouter = vi.mocked(createOpenRouter);

// All env vars either resolver function reads. Cleared to `undefined` in beforeEach
// so a real .env loaded into this process (OPENROUTER_API_KEY IS set on this
// machine) cannot leak into a test asserting "no env configured".
const ALL_RELEVANT_ENV_VARS = [
  'AI_GATEWAY_BASE_URL',
  'AI_GATEWAY_MODEL',
  'AI_GATEWAY_API_KEY',
  'API_SECRET_KEY',
  'OPENROUTER_API_KEY',
  'OPENROUTER_MODEL',
  'RELEASE_PARSER_PARSE_TIMEOUT_MS',
  'RELEASE_PARSER_BATCH_TIMEOUT_MS',
  'RELEASE_PARSER_FILES_TIMEOUT_MS',
  'RELEASE_PARSER_MAX_CONCURRENCY',
] as const;

function clearAllRelevantEnv(): void {
  for (const name of ALL_RELEVANT_ENV_VARS) {
    vi.stubEnv(name, undefined as unknown as string);
  }
}

beforeEach(() => {
  vi.unstubAllEnvs();
  clearAllRelevantEnv();
  mockCreateOpenAI.mockClear();
  mockCreateOpenRouter.mockClear();
});

// ── resolveReleaseParserAiConfig ─────────────────────────────────────────────

describe('resolveReleaseParserAiConfig — env isolation sanity', () => {
  it('has no relevant env vars set after clearing (guards against a leaking .env)', () => {
    for (const name of ALL_RELEVANT_ENV_VARS) {
      expect(process.env[name]).toBeUndefined();
    }
  });
});

describe('resolveReleaseParserAiConfig — gateway precedence', () => {
  it('wins when AI_GATEWAY_BASE_URL and AI_GATEWAY_MODEL are both set', () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'https://gateway.example.com/v1');
    vi.stubEnv('AI_GATEWAY_MODEL', 'gateway-model-x');

    const config = resolveReleaseParserAiConfig();

    expect(config.source).toBe('gateway');
    expect(config.enabled).toBe(true);
    expect(config.modelId).toBe('gateway-model-x');
    expect(mockCreateOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://gateway.example.com/v1' }),
    );
    expect(mockCreateOpenRouter).not.toHaveBeenCalled();
  });

  it('also fires via the OPENROUTER_MODEL fallback when AI_GATEWAY_MODEL is unset', () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'https://gateway.example.com/v1');
    vi.stubEnv('OPENROUTER_MODEL', 'fallback-model-y');

    const config = resolveReleaseParserAiConfig();

    expect(config.source).toBe('gateway');
    expect(config.modelId).toBe('fallback-model-y');
    expect(mockCreateOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://gateway.example.com/v1' }),
    );
  });

  it('falls through to OpenRouter when AI_GATEWAY_BASE_URL is set but no model at all is provided', () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'https://gateway.example.com/v1');
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key');

    const config = resolveReleaseParserAiConfig();

    expect(config.source).toBe('openrouter');
    expect(mockCreateOpenAI).not.toHaveBeenCalled();
    expect(mockCreateOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'or-key' }),
    );
  });

  describe('gateway API key fallback chain', () => {
    beforeEach(() => {
      vi.stubEnv('AI_GATEWAY_BASE_URL', 'https://gateway.example.com/v1');
      vi.stubEnv('AI_GATEWAY_MODEL', 'gateway-model-x');
    });

    it('prefers AI_GATEWAY_API_KEY when set', () => {
      vi.stubEnv('AI_GATEWAY_API_KEY', 'gateway-key');
      vi.stubEnv('API_SECRET_KEY', 'secret-key');

      resolveReleaseParserAiConfig();

      expect(mockCreateOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'gateway-key' }),
      );
    });

    it('falls back to API_SECRET_KEY when AI_GATEWAY_API_KEY is unset', () => {
      vi.stubEnv('API_SECRET_KEY', 'secret-key');

      resolveReleaseParserAiConfig();

      expect(mockCreateOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'secret-key' }),
      );
    });

    it("falls back to the literal 'local-dev-key' when neither key is set", () => {
      resolveReleaseParserAiConfig();

      expect(mockCreateOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'local-dev-key' }),
      );
    });
  });
});

describe('resolveReleaseParserAiConfig — OpenRouter path', () => {
  it('resolves via OpenRouter when only OPENROUTER_API_KEY is set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key');

    const config = resolveReleaseParserAiConfig();

    expect(config.source).toBe('openrouter');
    expect(config.enabled).toBe(true);
    expect(config.providerOptions).toEqual({ openrouter: {} });
    expect(mockCreateOpenRouter).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'or-key' }),
    );
  });

  it('honours an OPENROUTER_MODEL override', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key');
    vi.stubEnv('OPENROUTER_MODEL', 'my/custom-model');

    const config = resolveReleaseParserAiConfig();

    expect(config.source).toBe('openrouter');
    expect(config.modelId).toBe('my/custom-model');
  });
});

describe('resolveReleaseParserAiConfig — no configuration', () => {
  it('returns disabled/none with no env set at all', () => {
    const config = resolveReleaseParserAiConfig();

    expect(config).toMatchObject({ enabled: false, source: 'none' });
    expect(config.model).toBeUndefined();
    expect(mockCreateOpenAI).not.toHaveBeenCalled();
    expect(mockCreateOpenRouter).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only OPENROUTER_API_KEY as absent (readEnv trims)', () => {
    vi.stubEnv('OPENROUTER_API_KEY', '   ');

    const config = resolveReleaseParserAiConfig();

    expect(config.source).toBe('none');
    expect(config.enabled).toBe(false);
  });
});

describe('resolveReleaseParserAiConfig — description', () => {
  it('describes the gateway path', () => {
    vi.stubEnv('AI_GATEWAY_BASE_URL', 'https://gateway.example.com/v1');
    vi.stubEnv('AI_GATEWAY_MODEL', 'gateway-model-x');

    const config = resolveReleaseParserAiConfig();

    expect(config.description).toEqual(expect.any(String));
    expect(config.description.length).toBeGreaterThan(0);
    expect(config.description).toContain('gateway-model-x');
    expect(config.description).toContain('https://gateway.example.com/v1');
  });

  it('describes the OpenRouter path', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key');
    vi.stubEnv('OPENROUTER_MODEL', 'my/custom-model');

    const config = resolveReleaseParserAiConfig();

    expect(config.description).toEqual(expect.any(String));
    expect(config.description.length).toBeGreaterThan(0);
    expect(config.description).toContain('my/custom-model');
  });

  it('describes the none path', () => {
    const config = resolveReleaseParserAiConfig();

    expect(config.description).toEqual(expect.any(String));
    expect(config.description.length).toBeGreaterThan(0);
  });
});

// ── THE RED TEST ─────────────────────────────────────────────────────────────

describe('resolveReleaseParserAiConfig — default model pin (FR-4)', () => {
  // RED until Phase 3 pins the default model (FR-4).
  it('defaults to google/gemini-2.5-flash-lite when only OPENROUTER_API_KEY is set', () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key');

    const config = resolveReleaseParserAiConfig();

    expect(config.modelId).toBe('google/gemini-2.5-flash-lite');
  });
});

// ── KNOWN_FAST_MODELS ────────────────────────────────────────────────────────

describe('KNOWN_FAST_MODELS', () => {
  it('is a non-empty exported list containing the pinned fast default', () => {
    expect(Array.isArray(KNOWN_FAST_MODELS)).toBe(true);
    expect(KNOWN_FAST_MODELS.length).toBeGreaterThan(0);
    expect(KNOWN_FAST_MODELS).toContain('google/gemini-2.5-flash-lite');
  });
});

// ── resolveReleaseParserRuntimeConfig ────────────────────────────────────────

describe('resolveReleaseParserRuntimeConfig — defaults', () => {
  it('uses the exported DEFAULT_* constants when no env is set', () => {
    const config = resolveReleaseParserRuntimeConfig();

    expect(config).toEqual({
      parseTimeoutMs: DEFAULT_PARSE_TIMEOUT_MS,
      batchTimeoutMs: DEFAULT_BATCH_TIMEOUT_MS,
      filesTimeoutMs: DEFAULT_FILES_TIMEOUT_MS,
      maxConcurrency: DEFAULT_MAX_CONCURRENCY,
    });
  });
});

describe('resolveReleaseParserRuntimeConfig — overrides', () => {
  it('honours RELEASE_PARSER_PARSE_TIMEOUT_MS', () => {
    vi.stubEnv('RELEASE_PARSER_PARSE_TIMEOUT_MS', '9999');

    expect(resolveReleaseParserRuntimeConfig().parseTimeoutMs).toBe(9999);
  });

  it('honours RELEASE_PARSER_BATCH_TIMEOUT_MS', () => {
    vi.stubEnv('RELEASE_PARSER_BATCH_TIMEOUT_MS', '8888');

    expect(resolveReleaseParserRuntimeConfig().batchTimeoutMs).toBe(8888);
  });

  it('honours RELEASE_PARSER_FILES_TIMEOUT_MS', () => {
    vi.stubEnv('RELEASE_PARSER_FILES_TIMEOUT_MS', '7777');

    expect(resolveReleaseParserRuntimeConfig().filesTimeoutMs).toBe(7777);
  });

  it('honours RELEASE_PARSER_MAX_CONCURRENCY', () => {
    vi.stubEnv('RELEASE_PARSER_MAX_CONCURRENCY', '12');

    expect(resolveReleaseParserRuntimeConfig().maxConcurrency).toBe(12);
  });
});

describe('resolveReleaseParserRuntimeConfig — invalid values fall back to default', () => {
  const invalidValues = ['0', '-1', 'abc', '', '1.5', 'Infinity', 'NaN'];

  it.each(invalidValues)('RELEASE_PARSER_PARSE_TIMEOUT_MS=%s falls back to default', (value) => {
    vi.stubEnv('RELEASE_PARSER_PARSE_TIMEOUT_MS', value);

    expect(resolveReleaseParserRuntimeConfig().parseTimeoutMs).toBe(DEFAULT_PARSE_TIMEOUT_MS);
  });

  it.each(invalidValues)('RELEASE_PARSER_BATCH_TIMEOUT_MS=%s falls back to default', (value) => {
    vi.stubEnv('RELEASE_PARSER_BATCH_TIMEOUT_MS', value);

    expect(resolveReleaseParserRuntimeConfig().batchTimeoutMs).toBe(DEFAULT_BATCH_TIMEOUT_MS);
  });

  it.each(invalidValues)('RELEASE_PARSER_FILES_TIMEOUT_MS=%s falls back to default', (value) => {
    vi.stubEnv('RELEASE_PARSER_FILES_TIMEOUT_MS', value);

    expect(resolveReleaseParserRuntimeConfig().filesTimeoutMs).toBe(DEFAULT_FILES_TIMEOUT_MS);
  });

  it.each(invalidValues)('RELEASE_PARSER_MAX_CONCURRENCY=%s falls back to default', (value) => {
    vi.stubEnv('RELEASE_PARSER_MAX_CONCURRENCY', value);

    expect(resolveReleaseParserRuntimeConfig().maxConcurrency).toBe(DEFAULT_MAX_CONCURRENCY);
  });
});
