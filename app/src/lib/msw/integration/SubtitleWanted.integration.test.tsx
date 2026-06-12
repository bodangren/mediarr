import { describe, expect, it } from 'vitest';
import { getApiClients } from '@/lib/api/client';

describe('SubtitleWanted MSW integration', () => {
  it('loads wanted movies through MSW interceptors', async () => {
    const api = getApiClients();
    const page = await api.subtitleWantedApi.listWantedMovies({ page: 1, pageSize: 10 });

    expect(page.meta.page).toBe(1);
  });
});
