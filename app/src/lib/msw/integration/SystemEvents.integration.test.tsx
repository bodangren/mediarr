import { describe, expect, it } from 'vitest';
import { getApiClients } from '@/lib/api/client';

describe('SystemEvents MSW integration', () => {
  it('loads paginated system events through MSW interceptors', async () => {
    const api = getApiClients();
    const page = await api.systemApi.getEvents({ page: 1, pageSize: 10 });

    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items[0]).toHaveProperty('message');
    expect(page.meta.page).toBe(1);
  });
});
