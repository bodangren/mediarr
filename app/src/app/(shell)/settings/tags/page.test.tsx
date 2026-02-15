import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import Page from './page';

// Mock the API client
vi.mock('@/lib/api/client');

const mockGetApiClients = vi.mocked(getApiClients);

mockGetApiClients.mockReturnValue({
  tagsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 1,
        label: 'HD Movies',
        color: '#FF5733',
        indexerIds: [1, 2],
        applicationIds: [3],
        downloadClientIds: [],
      },
      {
        id: 2,
        label: 'TV Shows',
        color: '#33FF57',
        indexerIds: [3],
        applicationIds: [1, 2],
        downloadClientIds: [1],
      },
    ]),
    create: vi.fn().mockResolvedValue({
      id: 3,
      label: 'New Tag',
      color: '#00FF00',
      indexerIds: [],
      applicationIds: [],
      downloadClientIds: [],
    }),
    update: vi.fn().mockResolvedValue({
      id: 1,
      label: 'Updated Tag',
      color: '#0000FF',
      indexerIds: [1, 2],
      applicationIds: [3],
      downloadClientIds: [],
    }),
    remove: vi.fn().mockResolvedValue({ id: 1 }),
    getDetails: vi.fn().mockResolvedValue({
      tag: {
        id: 1,
        label: 'HD Movies',
        color: '#FF5733',
      },
      indexers: [
        { id: 1, name: 'The Pirate Bay' },
        { id: 2, name: 'RARBG' },
      ],
      applications: [
        { id: 3, name: 'My Radarr' },
      ],
      downloadClients: [],
    }),
    updateAssignments: vi.fn(),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

// Mock toast provider
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    pushToast: vi.fn(),
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Tags Settings Page', () => {
  it('should render page header with title and description', () => {
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole('heading', { level: 1, name: /Tags/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Manage tags for organizing indexers, applications, and download clients/i),
    ).toBeInTheDocument();
  });

  it('should render toolbar with action buttons', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });
  });

  it('should render tags table with data', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('HD Movies')).toBeInTheDocument();
      expect(screen.getByText('TV Shows')).toBeInTheDocument();
    });
  });

  it('should display tag colors in the table', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      const colorBadges = document.querySelectorAll('[style*="background-color"]');
      expect(colorBadges.length).toBeGreaterThan(0);
    });
  });

  it('should display assignment counts', async () => {
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      const indexerCounts = screen.getAllByText('2');
      const appCounts = screen.getAllByText('1');
      const dlCounts = screen.getAllByText('0');
      expect(indexerCounts.length).toBeGreaterThan(0);
      expect(appCounts.length).toBeGreaterThan(0);
      expect(dlCounts.length).toBeGreaterThan(0);
    });
  });

  it('should open add modal when Add button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Add tag/i })).toBeInTheDocument();
    });
  });

  it('should display label input in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Add tag/i });
      expect(within(modal).getByLabelText(/Label/i)).toBeInTheDocument();
    });
  });

  it('should display color picker in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Add tag/i });
      expect(within(modal).getByDisplayValue('#FF5733')).toBeInTheDocument();
      expect(within(modal).getAllByLabelText(/Select color/i).length).toBeGreaterThan(0);
    });
  });

  it('should display preset color options in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      const colorButtons = document.querySelectorAll('button[aria-label^="Select color"]');
      expect(colorButtons.length).toBeGreaterThan(0);
    });
  });

  it('should open edit modal when Edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const editButton = await screen.findAllByRole('button', { name: /Edit/i });
    await user.click(editButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Edit tag/i })).toBeInTheDocument();
    });
  });

  it('should pre-populate edit modal with tag data', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const editButton = await screen.findAllByRole('button', { name: /Edit/i });
    await user.click(editButton[0]);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Edit tag/i });
      expect(within(modal).getByDisplayValue('HD Movies')).toBeInTheDocument();
    });
  });

  it('should open details modal when Details button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const detailsButton = await screen.findAllByRole('button', { name: /Details/i });
    await user.click(detailsButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Tag details/i })).toBeInTheDocument();
    });
  });

  it('should show tag details in details modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const detailsButton = await screen.findAllByRole('button', { name: /Details/i });
    await user.click(detailsButton[0]);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Tag details/i });
      expect(within(modal).getByText('HD Movies')).toBeInTheDocument();
      expect(within(modal).getByText(/The Pirate Bay/i)).toBeInTheDocument();
      expect(within(modal).getByText(/My Radarr/i)).toBeInTheDocument();
    });
  });

  it('should show indexer list in details modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const detailsButton = await screen.findAllByRole('button', { name: /Details/i });
    await user.click(detailsButton[0]);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Tag details/i });
      expect(within(modal).getByText(/Indexers \(2\)/i)).toBeInTheDocument();
    });
  });

  it('should show application list in details modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const detailsButton = await screen.findAllByRole('button', { name: /Details/i });
    await user.click(detailsButton[0]);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Tag details/i });
      expect(within(modal).getByText(/Applications \(1\)/i)).toBeInTheDocument();
    });
  });

  it('should open delete confirmation when Delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const deleteButton = await screen.findAllByRole('button', { name: /Delete/i });
    await user.click(deleteButton[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Delete tag/i })).toBeInTheDocument();
    });
  });

  it('should show delete confirmation message', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const deleteButton = await screen.findAllByRole('button', { name: /Delete/i });
    await user.click(deleteButton[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/This will remove the tag from all indexers, applications, and download clients/i),
      ).toBeInTheDocument();
    });
  });

  it('should allow clicking assignment counts to view details', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Find the count buttons (they have specific text and type="button")
      const countButtons = screen.getAllByRole('button', { name: '2' });
      expect(countButtons.length).toBeGreaterThan(0);
      user.click(countButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Tag details/i })).toBeInTheDocument();
    });
  });

  it('should render empty state when no tags exist', async () => {
    mockGetApiClients.mockReturnValueOnce({
      tagsApi: {
        list: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        getDetails: vi.fn(),
        updateAssignments: vi.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(<Page />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No tags configured/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Create your first tag to organize indexers, applications, and download clients/i),
      ).toBeInTheDocument();
    });
  });

  it('should validate label is required in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Add tag/i });
      const addTagButton = within(modal).getByRole('button', { name: /Add Tag/i });
      user.click(addTagButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Label is required/i)).toBeInTheDocument();
    });
  });

  it('should validate color format in add modal', async () => {
    const user = userEvent.setup();
    render(<Page />, { wrapper: createWrapper() });

    const addButton = await screen.findByRole('button', { name: /Add/i });
    await user.click(addButton);

    const modal = screen.getByRole('dialog', { name: /Add tag/i });
    const labelInput = within(modal).getByLabelText(/Label/i);
    await user.type(labelInput, 'Test Tag');
    const colorInput = within(modal).getByDisplayValue('#FF5733');
    await user.clear(colorInput);
    await user.type(colorInput, 'invalid');
    const addTagButton = within(modal).getByRole('button', { name: /Add Tag/i });
    await user.click(addTagButton);

    await waitFor(() => {
      expect(screen.getByText(/Color must be a valid hex code/i)).toBeInTheDocument();
    });
  });
});
