import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { getApiClients } from '@/lib/api/client';
import type { SeriesListItem } from '@/types/series';

function SeriesList() {
  const api = getApiClients();
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.mediaApi.listSeries({ page: 1, pageSize: 25 }).then(page => {
      setSeries(page.items);
      setLoading(false);
    });
  }, [api]);

  if (loading) return <div>Loading series…</div>;
  return (
    <ul>
      {series.map(s => (
        <li key={s.id}>{s.title} ({s.year})</li>
      ))}
    </ul>
  );
}

describe('SeriesList MSW integration', () => {
  it('loads series through MSW interceptors', async () => {
    render(<SeriesList />);

    await waitFor(() => {
      expect(screen.getAllByText(/Andor|Foundation|Silo/).length).toBeGreaterThan(0);
    });
  });
});
