import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NextUpWidget } from './NextUpWidget';
import type { NextUpItem } from '@/lib/api/dashboardApi';

function item(overrides: Partial<NextUpItem> & { seriesId: number }): NextUpItem {
  return {
    seriesId: overrides.seriesId,
    title: `Series ${overrides.seriesId}`,
    posterUrl: null,
    backdropUrl: null,
    year: 2005,
    watchedCount: 2,
    totalCount: 22,
    nextEpisode: { episodeId: overrides.seriesId * 100, seasonNumber: 3, episodeNumber: 18, title: 'Rebound Bro' },
    lastWatchedAt: 1795300000000,
    ...overrides,
  };
}

/** Owner request 2026-11-22: partially watched series with their next episode, newest first. */
describe('NextUpWidget', () => {
  it('renders series with the next episode and watched counts, in the given order', () => {
    render(
      <MemoryRouter>
        <NextUpWidget
          isLoading={false}
          items={[item({ seriesId: 1, title: 'Firefly' }), item({ seriesId: 2, title: 'How I Met Your Mother' })]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Next up' })).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/library/series/1'));
    expect(links[0]).toHaveTextContent('Firefly');
    expect(links[0]).toHaveTextContent('S03E18 · Rebound Bro');
    expect(links[0]).toHaveTextContent('2/22 watched');
    expect(links[1]).toHaveTextContent('How I Met Your Mother');
  });

  it('disappears when no series is in progress', () => {
    const { container } = render(
      <MemoryRouter>
        <NextUpWidget isLoading={false} items={[]} />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
