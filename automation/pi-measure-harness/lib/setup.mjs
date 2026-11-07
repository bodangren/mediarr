import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export const VOCENGINE_PROVIDER = Object.freeze({
  baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3",
  api: "openai-completions",
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
  models: [
    {
      id: "glm-5.2",
      name: "GLM 5.2 (Ark Coding Plan)",
      reasoning: true,
      contextWindow: 204800,
      maxTokens: 65536,
      cost: { input: 1.4, output: 4.4, cacheRead: 0.26, cacheWrite: 0 },
    },
    {
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro (Ark Coding Plan)",
      reasoning: true,
      contextWindow: 204800,
      maxTokens: 65536,
    },
    {
      id: "ark-code-latest",
      name: "Ark Code Latest",
      reasoning: true,
      contextWindow: 204800,
      maxTokens: 65536,
      cost: { input: 0.45, output: 2.25, cacheRead: 0.09, cacheWrite: 0 },
    },
  ],
});

export const MINIMAX_CODING_PLAN_PROVIDER = Object.freeze({
  baseUrl: "https://api.minimaxi.com/v1",
  api: "openai-completions",
  compat: {
    supportsDeveloperRole: false,
    supportsReasoningEffort: false,
  },
  models: [
    {
      id: "MiniMax-M3",
      name: "MiniMax M3 (CN Coding Plan)",
      reasoning: true,
      input: ["text", "image"],
      contextWindow: 1000000,
      maxTokens: 128000,
      cost: { input: 0.6, output: 2.4, cacheRead: 0.12, cacheWrite: 0 },
    },
  ],
});

const AUTH_ALIASES = Object.freeze([
  ["openai", "openai-codex"],
  ["deepseek", "deepseek"],
  ["minimax-cn-coding-plan", "minimax-cn"],
  ["minimax-cn", "minimax-cn"],
  ["xiaomi", "xiaomi"],
  ["vocengine-coding", "vocengine-coding"],
  ["kimi-for-coding", "kimi-coding"],
  ["nvidia", "nvidia"],
  ["openrouter", "openrouter"],
]);

/** Reads a JSON object, returning an empty object when the file does not exist. */
export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

/** Atomically writes JSON and applies the requested file mode. */
export function writeJson(path, value, mode = 0o600) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode });
  renameSync(temporaryPath, path);
  chmodSync(path, mode);
}

/** Merges the local package and required custom models into Pi configuration. */
export function buildPiConfiguration(settings, models, packageRoot) {
  const packages = Array.isArray(settings.packages) ? [...settings.packages] : [];
  if (!packages.includes(packageRoot)) packages.push(packageRoot);
  return {
    settings: { ...settings, packages },
    models: {
      ...models,
      providers: {
        ...(models.providers ?? {}),
        "minimax-cn": MINIMAX_CODING_PLAN_PROVIDER,
        "vocengine-coding": VOCENGINE_PROVIDER,
      },
    },
  };
}

/** Converts one OpenCode credential to Pi's credential format. */
export function toPiCredential(source) {
  if (!source || typeof source !== "object") return undefined;
  if (typeof source.access === "string" && typeof source.refresh === "string" && typeof source.expires === "number") {
    const { access, refresh, expires, accountId } = source;
    return accountId ? { type: "oauth", access, refresh, expires, accountId } : { type: "oauth", access, refresh, expires };
  }
  if (typeof source.key === "string") {
    return source.env ? { type: "api_key", key: source.key, env: source.env } : { type: "api_key", key: source.key };
  }
  return undefined;
}

/** Merges compatible OpenCode credentials without replacing existing Pi entries. */
export function migrateCredentials(sourceAuth, targetAuth, force = false) {
  const migrated = { ...targetAuth };
  const providers = [];
  for (const [sourceName, targetName] of AUTH_ALIASES) {
    const credential = toPiCredential(sourceAuth[sourceName]);
    if (!credential || providers.includes(targetName) || (!force && migrated[targetName])) continue;
    migrated[targetName] = credential;
    if (!providers.includes(targetName)) providers.push(targetName);
  }
  return { auth: migrated, providers };
}
