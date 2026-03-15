import {
  type AppSettingsPayload,
  AppSettingsRepository,
} from '../repositories/AppSettingsRepository';

/**
 * Thin settings service wrapper exposing typed CRUD operations.
 */
export class SettingsService {
  constructor(private readonly repository: AppSettingsRepository) {}

  async get(): Promise<AppSettingsPayload> {
    return this.repository.get();
  }

  async update(partial: Partial<AppSettingsPayload>): Promise<AppSettingsPayload> {
    return this.repository.update(partial);
  }

  async replace(payload: AppSettingsPayload): Promise<AppSettingsPayload> {
    return this.repository.replace(payload);
  }
}
