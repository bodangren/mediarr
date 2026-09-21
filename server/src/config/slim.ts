export interface SlimConfig {
  slim: boolean;
}

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);

/**
 * Reads the opt-in slim-mode configuration. Slim mode disables the -arr
 * domains (torrent engine, indexers, RSS sync, import lists, subtitle
 * automation, notifications, quality-profile seeds). The default is the
 * full-stack behaviour so existing deployments keep working until the flag
 * is flipped.
 */
export function resolveSlimConfig(
  env: Partial<Pick<NodeJS.ProcessEnv, 'MEDIARR_SLIM_MODE'>>,
): SlimConfig {
  return {
    slim: TRUE_VALUES.has(env.MEDIARR_SLIM_MODE?.trim().toLowerCase() ?? ''),
  };
}
