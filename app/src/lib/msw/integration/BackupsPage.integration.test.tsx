import { describe, expect, it } from 'vitest';
import { getApiClients } from '@/lib/api/client';

describe('BackupsPage MSW integration', () => {
  it('loads backups through MSW interceptors', async () => {
    const api = getApiClients();
    const backups = await api.backupApi.getBackups();

    expect(backups.length).toBeGreaterThan(0);
    expect(backups[0]).toHaveProperty('name');
    expect(backups[0]).toHaveProperty('type');
  });
});
