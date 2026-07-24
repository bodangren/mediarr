import type { ManualSubtitleProvider } from './SubtitleInventoryApiService';

export interface SubtitleProviderConfig {
  manualProvider?: string;
}

type ConfigReader = () => SubtitleProviderConfig;

/**
 * Resolves subtitle providers from runtime configuration.
 */
export class SubtitleProviderFactory {
  constructor(
    private readonly providers: Record<string, ManualSubtitleProvider>,
    private readonly readConfig: ConfigReader,
    private readonly unavailableProviders: Record<string, string> = {},
  ) {}

  getProviderNames(): string[] {
    return [...new Set([
      ...Object.keys(this.providers),
      ...Object.keys(this.unavailableProviders),
    ])];
  }

  isProviderAvailable(providerName: string): boolean {
    return Boolean(this.providers[providerName.toLowerCase()]);
  }

  getProviderUnavailableReason(providerName: string): string | null {
    return this.unavailableProviders[providerName.toLowerCase()] ?? null;
  }

  resolveAllManualProviders(): Array<{ name: string; provider: ManualSubtitleProvider }> {
    return Object.entries(this.providers).map(([name, provider]) => ({ name, provider }));
  }

  resolveManualProvider(providerName?: string): ManualSubtitleProvider {
    const configuredName = providerName ?? this.readConfig().manualProvider;
    if (!configuredName) {
      throw new Error('No manual subtitle provider is configured');
    }

    const normalizedName = configuredName.toLowerCase();
    const unavailableReason = this.unavailableProviders[normalizedName];
    if (unavailableReason) {
      throw new Error(
        `Subtitle provider '${configuredName}' is unavailable: ${unavailableReason}`,
      );
    }

    const provider = this.providers[normalizedName];
    if (!provider) {
      throw new Error(`Subtitle provider '${configuredName}' is not registered`);
    }

    return provider;
  }
}
