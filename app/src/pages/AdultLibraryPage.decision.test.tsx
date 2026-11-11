/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdultLibraryPage } from './AdultLibraryPage';
import { getApiClients } from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({ getApiClients: vi.fn() }));

const watchedItem = {
  id: 1,
  title: 'Watched One',
  fileName: 'watched.mp4',
  studio: 'Studio A',
  quality: '1080p',
  releaseDate: null,
  needsReview: false,
  path: '/data/Adult/watched.mp4',
  sizeBytes: 1_000,
  isWatched: true,
  keep: false,
  decidedAt: null,
  thumbUrl: null,
};

const unwatchedItem = {
  ...watchedItem,
  id: 2,
  title: 'Plain Two',
  fileName: 'plain.mp4',
  path: '/data/Adult/plain.mp4',
  isWatched: false,
};

const decisionItem = {
  id: 1,
  title: 'Watched One',
  fileName: 'watched.mp4',
  studio: 'Studio A',
  quality: '1080p',
  isWatched: true,
  lastPlayedAt: '2026-11-01T10:00:00.000Z',
  sizeBytes: 1_000,
  keep: false,
  decidedAt: null,
};

function setupApi(overrides: Record<string, any> = {}) {
  const listItems = vi.fn().mockResolvedValue({
    items: [watchedItem, unwatchedItem],
    page: 1,
    pageSize: 24,
    totalCount: 2,
    needsReview: 0,
  });
  const listDecisions = vi.fn().mockResolvedValue({ items: [decisionItem], total: 1 });
  const decide = overrides.decide ?? vi.fn().mockResolvedValue({ id: 1, decision: 'keep', kept: true });
  (getApiClients as any).mockReturnValue({
    adultLibraryApi: {
      listItems,
      listDecisions,
      decide,
      streamUrl: (id: number) => `/api/adult/items/${id}/stream`,
      reportProgress: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
  });
  return { listItems, listDecisions, decide };
}

const decisionStrip = () => screen.getByRole('region', { name: 'Needs a decision' });

describe('AdultLibraryPage keep/delete decisions', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('shows Keep / Delete on watched items and lists watched-undecided items', async () => {
    setupApi();

    render(<AdultLibraryPage />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Needs a decision (1)' })).toBeInTheDocument());
    const strip = decisionStrip();
    expect(within(strip).getByRole('button', { name: 'Keep Watched One' })).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: 'Delete Watched One' })).toBeInTheDocument();
    expect(within(strip).getByText(/· Watched/)).toBeInTheDocument();

    // The watched card also offers the choice; the unwatched card must not.
    expect(screen.getAllByRole('button', { name: 'Keep Watched One' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Keep Plain Two' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete Plain Two' })).toBeNull();
  });

  it('keeps an item from the strip, clears the prompt, and marks the card kept', async () => {
    const { decide } = setupApi();
    const user = userEvent.setup();

    render(<AdultLibraryPage />);
    await waitFor(() => expect(decisionStrip()).toBeInTheDocument());

    await user.click(within(decisionStrip()).getByRole('button', { name: 'Keep Watched One' }));

    await waitFor(() => expect(decide).toHaveBeenCalledWith(1, 'keep'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Needs a decision' })).toBeNull());
    expect(screen.getByText('Kept')).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('confirms a delete once, calls the API, and removes the item from the page', async () => {
    const { decide } = setupApi({ decide: vi.fn().mockResolvedValue({ id: 1, decision: 'delete', deleted: true }) });
    const user = userEvent.setup();

    render(<AdultLibraryPage />);
    await waitFor(() => expect(decisionStrip()).toBeInTheDocument());

    await user.click(within(decisionStrip()).getByRole('button', { name: 'Delete Watched One' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(confirmSpy.mock.calls[0]?.[0]).toContain('Delete “Watched One”');
    await waitFor(() => expect(decide).toHaveBeenCalledWith(1, 'delete'));
    await waitFor(() => expect(screen.queryByText('Watched One')).toBeNull());
    expect(screen.queryByRole('region', { name: 'Needs a decision' })).toBeNull();
  });

  it('does nothing when the single delete confirmation is declined', async () => {
    const { decide } = setupApi();
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();

    render(<AdultLibraryPage />);
    await waitFor(() => expect(decisionStrip()).toBeInTheDocument());

    await user.click(within(decisionStrip()).getByRole('button', { name: 'Delete Watched One' }));

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(decide).not.toHaveBeenCalled();
    expect(decisionStrip()).toBeInTheDocument();
  });

  it('surfaces a failed decision instead of silently dropping it', async () => {
    setupApi({ decide: vi.fn().mockRejectedValue(new Error('quarantine is not writable')) });
    const user = userEvent.setup();

    render(<AdultLibraryPage />);
    await waitFor(() => expect(decisionStrip()).toBeInTheDocument());

    await user.click(within(decisionStrip()).getByRole('button', { name: 'Keep Watched One' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('quarantine is not writable'));
    expect(decisionStrip()).toBeInTheDocument();
  });
});
