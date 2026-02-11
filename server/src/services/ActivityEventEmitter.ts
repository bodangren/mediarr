import {
  ActivityEventRepository,
  CreateActivityEventInput,
} from '../repositories/ActivityEventRepository';

/**
 * Lightweight adapter used by services to persist activity events.
 */
export class ActivityEventEmitter {
  constructor(private readonly repository?: ActivityEventRepository) {}

  async emit(event: CreateActivityEventInput): Promise<void> {
    if (!this.repository) {
      return;
    }

    await this.repository.create(event);
  }
}
