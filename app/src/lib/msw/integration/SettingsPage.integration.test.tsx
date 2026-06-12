import { describe, expect, it } from 'vitest';
import { getApiClients } from '@/lib/api/client';

describe('Settings MSW integration', () => {
  it('loads general settings through MSW interceptors', async () => {
    const api = getApiClients();
    const settings = await api.settingsApi.get();

    expect(settings.torrentLimits.maxActiveDownloads).toBeGreaterThanOrEqual(0);
    expect(settings.schedulerIntervals.rssSyncMinutes).toBeGreaterThanOrEqual(1);
  });
});
