import type { LanguageModel } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const DEFAULT_OPENROUTER_MODEL = 'minimax/minimax-m2.7';
const DEFAULT_GATEWAY_API_KEY = 'local-dev-key';

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export interface ReleaseParserAiConfig {
  enabled: boolean;
  model?: LanguageModel;
  providerOptions?: { openrouter: Record<string, never> };
  source: 'gateway' | 'openrouter' | 'none';
  modelId?: string;
  description: string;
}

export function resolveReleaseParserAiConfig(): ReleaseParserAiConfig {
  const gatewayBaseURL = readEnv('AI_GATEWAY_BASE_URL');
  const gatewayModel = readEnv('AI_GATEWAY_MODEL') ?? readEnv('OPENROUTER_MODEL');

  if (gatewayBaseURL && gatewayModel) {
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
