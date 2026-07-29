export const DEFAULT_JELLYFIN_PORT = 8096;

export interface JellyfinConfig {
  enabled: boolean;
  port: number;
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

/** Reads the fail-closed opt-in compatibility listener configuration. */
export function resolveJellyfinConfig(
  env: Partial<Pick<NodeJS.ProcessEnv, 'JELLYFIN_ENABLED' | 'JELLYFIN_PORT'>>,
): JellyfinConfig {
  const enabled = TRUE_VALUES.has(env.JELLYFIN_ENABLED?.trim().toLowerCase() ?? '');
  const rawPort = env.JELLYFIN_PORT?.trim();
  if (!rawPort) return { enabled, port: DEFAULT_JELLYFIN_PORT };
  if (!/^\d+$/.test(rawPort)) {
    throw new Error('JELLYFIN_PORT must be an integer between 1 and 65535');
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('JELLYFIN_PORT must be an integer between 1 and 65535');
  }
  return { enabled, port };
}
