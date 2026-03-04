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
  ) {}

  getProviderNames(): string[] {
    return Object.keys(this.providers);
  }

  resolveAllManualProviders(): Array<{ name: string; provider: ManualSubtitleProvider }> {
    return Object.entries(this.providers).map(([name, provider]) => ({ name, provider }));
  }

  resolveManualProvider(providerName?: string): ManualSubtitleProvider {
    const configuredName = providerName ?? this.readConfig().manualProvider;
    if (!configuredName) {
      throw new Error('No manual subtitle provider is configured');
    }

    const provider = this.providers[configuredName.toLowerCase()];
    if (!provider) {
      throw new Error(`Subtitle provider '${configuredName}' is not registered`);
    }

    return provider;
  }
}
