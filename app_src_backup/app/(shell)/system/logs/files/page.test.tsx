'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import LogsPage from './page';

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(),
}));

// Mock toast provider
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    pushToast: vi.fn(),
  }),
}));

interface LogFileFixture {
  filename: string;
  size: number;
  lastModified: string;
}

interface LogFileContentsFixture {
  filename: string;
  contents: string;
  totalLines: number;
}

function buildLogFile(overrides: Partial<LogFileFixture> = {}): LogFileFixture {
  return {
    filename: 'mediarr.log',
    size: 1024000,
    lastModified: '2026-02-15T10:30:00Z',
    ...overrides,
  };
}

function buildLogFileContents(overrides: Partial<LogFileContentsFixture> = {}): LogFileContentsFixture {
  return {
    filename: 'mediarr.log',
    contents: '[INFO] 2026-02-15T10:30:00Z Application started\n[ERROR] 2026-02-15T10:31:00Z Failed to connect to database\n[WARN] 2026-02-15T10:32:00Z Disk space low',
    totalLines: 3,
    ...overrides,
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function renderPage(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <LogsPage />
    </QueryClientProvider>,
  );
}

const mockedGetApiClients = vi.mocked(getApiClients);
const listFilesMock = vi.fn<() => Promise<LogFileFixture[]>>();
const getFileContentsMock = vi.fn<() => Promise<LogFileContentsFixture>>();
const deleteFileMock = vi.fn<() => Promise<{ success: boolean; filename: string }>>();
const clearFileMock = vi.fn<() => Promise<{ success: boolean; filename: string }>>();
const downloadFileMock = vi.fn<() => Promise<{ downloadUrl: string; filename: string }>>();

beforeEach(() => {
  vi.clearAllMocks();
  listFilesMock.mockResolvedValue([buildLogFile(), buildLogFile({ filename: 'error.log', size: 512000 })]);
  getFileContentsMock.mockResolvedValue(buildLogFileContents());
  deleteFileMock.mockResolvedValue({ success: true, filename: 'mediarr.log' });
  clearFileMock.mockResolvedValue({ success: true, filename: 'mediarr.log' });
  downloadFileMock.mockResolvedValue({ downloadUrl: '/api/logs/files/mediarr.log/download', filename: 'mediarr.log' });

  mockedGetApiClients.mockReturnValue({
    logsApi: {
      listFiles: listFilesMock,
      getFileContents: getFileContentsMock,
      deleteFile: deleteFileMock,
      clearFile: clearFileMock,
      downloadFile: downloadFileMock,
    },
  } as unknown as ReturnType<typeof getApiClients>);
});

describe('System Logs Page', () => {
  it('should render page header', () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    expect(screen.getByText('System: Log Files')).toBeInTheDocument();
    expect(
      screen.getByText('Browse and inspect structured log files.'),
    ).toBeInTheDocument();
  });

  it('should render log files table', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Filename')).toBeInTheDocument();
    });

    expect(screen.getByText('mediarr.log')).toBeInTheDocument();
    expect(screen.getByText('error.log')).toBeInTheDocument();
  });

  it('should render file size column', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Size')).toBeInTheDocument();
    });

    expect(screen.getByText(/1000 KB/i)).toBeInTheDocument();
    expect(screen.getByText(/500 KB/i)).toBeInTheDocument();
  });

  it('should render last modified column', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Last Modified')).toBeInTheDocument();
    });

    // Using getAllByText since there are multiple rows
    expect(screen.getAllByText(/Feb 15/i).length).toBeGreaterThan(0);
  });

  it('should render actions column', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    // Check that action buttons are present
    const viewButtons = screen.getAllByText('View');
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it('should handle loading state', () => {
    listFilesMock.mockReturnValue(new Promise(() => {}));
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    // Check for loading animation class
    const loadingElements = screen.getAllByRole('status');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should handle error state', async () => {
    listFilesMock.mockRejectedValue(new Error('Failed to fetch'));
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('Could not load data')).toBeInTheDocument();
    });
  });

  it('should handle empty state', async () => {
    listFilesMock.mockResolvedValue([]);
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getByText('No log files available')).toBeInTheDocument();
    });
  });

  it('should open log viewer modal when View is clicked', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getAllByText('View').length).toBeGreaterThan(0);
    });

    const viewButtons = screen.getAllByText('View');
    viewButtons[0].click();

    await waitFor(() => {
      expect(screen.getByText(/Log Viewer: mediarr.log/i)).toBeInTheDocument();
    });
  });

  it('should render log level filter in modal', async () => {
    const queryClient = createTestQueryClient();
    renderPage(queryClient);

    await waitFor(() => {
      expect(screen.getAllByText('View').length).toBeGreaterThan(0);
    });

    const viewButtons = screen.getAllByText('View');
    viewButtons[0].click();

    await waitFor(() => {
      expect(screen.getByText(/Log Level/i)).toBeInTheDocument();
    });
  });
});
