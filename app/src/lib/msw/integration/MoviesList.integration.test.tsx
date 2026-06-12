import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getApiClients } from '@/lib/api/client';
import type { MovieListItem } from '@/types/movie';

function MoviesList() {
  const api = getApiClients();
  const [movies, setMovies] = useState<MovieListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.mediaApi.listMovies({ page: 1, pageSize: 25 }).then(page => {
      setMovies(page.items);
      setLoading(false);
    });
  }, [api]);

  if (loading) return <div>Loading movies…</div>;
  return (
    <ul>
      {movies.map(movie => (
        <li key={movie.id}>{movie.title} ({movie.year})</li>
      ))}
    </ul>
  );
}

import { useEffect, useState } from 'react';

describe('MoviesList MSW integration', () => {
  it('loads movies through MSW interceptors', async () => {
    render(<MoviesList />);

    await waitFor(() => {
      expect(screen.getAllByText(/The Matrix|Arrival|Dune/).length).toBeGreaterThan(0);
    });
  });
});
