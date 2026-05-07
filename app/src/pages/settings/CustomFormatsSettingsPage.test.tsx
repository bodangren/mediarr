import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomFormatsSettingsPage } from './CustomFormatsSettingsPage';
import * as clientModule from '@/lib/api/client';

const mockApi = {
  customFormatApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    test: vi.fn(),
  },
};

describe('CustomFormatsSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(clientModule, 'getApiClients').mockReturnValue(mockApi as unknown as ReturnType<typeof clientModule.getApiClients>);
  });

  it('renders loading state initially', () => {
    mockApi.customFormatApi.list.mockImplementation(() => new Promise(() => {}));

    render(<CustomFormatsSettingsPage />);

    expect(screen.getByText(/loading custom formats/i)).toBeInTheDocument();
  });

  it('renders custom formats list', async () => {
    mockApi.customFormatApi.list.mockResolvedValue([
      { id: 1, name: 'HDR10', includeCustomFormatWhenRenaming: false, conditions: [], scores: [] },
      { id: 2, name: 'Dolby Vision', includeCustomFormatWhenRenaming: false, conditions: [{ type: 'regex', field: 'title', operator: 'contains', value: 'DV', negate: false, required: false }], scores: [] },
    ]);

    render(<CustomFormatsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('HDR10')).toBeInTheDocument();
      expect(screen.getByText('Dolby Vision')).toBeInTheDocument();
    });
  });

  it('filters formats by search query', async () => {
    mockApi.customFormatApi.list.mockResolvedValue([
      { id: 1, name: 'HDR10', includeCustomFormatWhenRenaming: false, conditions: [], scores: [] },
      { id: 2, name: 'Dolby Vision', includeCustomFormatWhenRenaming: false, conditions: [], scores: [] },
    ]);

    render(<CustomFormatsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('HDR10')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search formats/i);
    fireEvent.change(searchInput, { target: { value: 'Dolby' } });

    expect(screen.queryByText('HDR10')).not.toBeInTheDocument();
    expect(screen.getByText('Dolby Vision')).toBeInTheDocument();
  });

  it('shows empty state when no formats', async () => {
    mockApi.customFormatApi.list.mockResolvedValue([]);

    render(<CustomFormatsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no custom formats found/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when search has no matches', async () => {
    mockApi.customFormatApi.list.mockResolvedValue([
      { id: 1, name: 'HDR10', includeCustomFormatWhenRenaming: false, conditions: [], scores: [] },
    ]);

    render(<CustomFormatsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('HDR10')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search formats/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    expect(screen.getByText(/no formats match your search/i)).toBeInTheDocument();
  });

  it('opens modal when add button clicked', async () => {
    mockApi.customFormatApi.list.mockResolvedValue([]);

    render(<CustomFormatsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no custom formats found/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add custom format/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls delete api when delete button clicked', async () => {
    mockApi.customFormatApi.list.mockResolvedValue([
      { id: 1, name: 'HDR10', includeCustomFormatWhenRenaming: false, conditions: [], scores: [] },
    ]);
    mockApi.customFormatApi.delete.mockResolvedValue({ id: 1 });
    vi.stubGlobal('confirm', () => true);

    render(<CustomFormatsSettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('HDR10')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => {
      expect(mockApi.customFormatApi.delete).toHaveBeenCalledWith(1);
    });

    vi.unstubAllGlobals();
  });
});
