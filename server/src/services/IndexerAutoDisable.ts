import type { IndexerHealthRepository } from '../repositories/IndexerHealthRepository';
import type { IndexerHealthSnapshot } from '../types/modelTypes';
import type { ApiEventHub } from '../api/eventHub';

export interface DisableResult {
  wasDisabled: boolean;
}

export interface SettingsProvider {
  getAutoDisableThreshold(): Promise<number>;
}

export function shouldAutoDisable(
  snapshot: IndexerHealthSnapshot | null,
  threshold: number,
): boolean {
  if (threshold === 0) return false;
  if (!snapshot) return false;
  return snapshot.failureCount >= threshold;
}

export class IndexerAutoDisable {
  private readonly disabledIndexerIds = new Set<number>();

  constructor(
    private readonly healthRepo: IndexerHealthRepository,
    private readonly settings: SettingsProvider,
    private readonly eventHub?: ApiEventHub,
  ) {}

  async handleFailure(
    indexerId: number,
    message: string,
  ): Promise<DisableResult> {
    const snapshot = await this.healthRepo.recordFailure(indexerId, message);

    if (this.disabledIndexerIds.has(indexerId)) {
      return { wasDisabled: false };
    }

    const threshold = await this.settings.getAutoDisableThreshold();

    if (shouldAutoDisable(snapshot, threshold)) {
      this.disabledIndexerIds.add(indexerId);
      await this.healthRepo.disable(indexerId);
      this.eventHub?.publish('indexer:healthChanged', { indexerId });
      return { wasDisabled: true };
    }

    return { wasDisabled: false };
  }
}
