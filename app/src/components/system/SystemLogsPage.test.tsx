import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SystemLogsPage } from './SystemLogsPage';

const mockLogFiles = [
  { filename: 'mediarr.log', size: 524288, lastModified: new Date().toISOString() },
  { filename: 'mediarr.trace.log', size: 2097152, lastModified: new Date().toISOString() },
];

const mockLogContents = {
  filename: 'mediarr.log',
  contents: [
    '[2024-02-15 10:30:00] INFO  [main] Server started',
    '[2024-02-15 10:35:02] WARN  [rss] Slow response',
    '[2024-02-15 10:40:00] ERROR [torrent] Connection refused',
  ].join('\n'),
  totalLines: 3,
};

const mockListFiles = vi.fn();
const mockGetFileContents = vi.fn();
const mockClearFile = vi.fn();
const mockDeleteFile = vi.fn();
const mockDownloadFile = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: () => ({
    logsApi: {
      listFiles: mockListFiles,
      getFileContents: mockGetFileContents,
      clearFile: mockClearFile,
      deleteFile: mockDeleteFile,
      downloadFile: mockDownloadFile,
    },
  }),
}));

vi.mock('@/lib/format', () => ({
  formatBytes: (n: number) => `${n}B`,
  formatRelativeDate: (s: string) => s,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <SystemLogsPage />
    </MemoryRouter>,
  );
}

describe('SystemLogsPage', () => {
  beforeEach(() => {
    mockListFiles.mockResolvedValue(mockLogFiles);
    mockGetFileContents.mockResolvedValue(mockLogContents);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Logs')).toBeInTheDocument();
  });

  it('shows log file list in sidebar', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('mediarr.log')).toBeInTheDocument());
    expect(screen.getByText('mediarr.trace.log')).toBeInTheDocument();
  });

  it('displays log contents for selected file', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Server started/)).toBeInTheDocument());
  });

  it('shows ERROR lines', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/Connection refused/)).toBeInTheDocument());
  });

  it('shows 3 total lines count', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('3 total lines')).toBeInTheDocument());
  });

  it('calls clearFile when Clear is clicked and confirmed', async () => {
    mockClearFile.mockResolvedValue({ success: true, filename: 'mediarr.log' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await waitFor(() => expect(screen.getByText('Clear')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Clear'));
    await waitFor(() => expect(mockClearFile).toHaveBeenCalledWith('mediarr.log'));
  });

  it('does not call clearFile when Clear is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await waitFor(() => expect(screen.getByText('Clear')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Clear'));
    expect(mockClearFile).not.toHaveBeenCalled();
  });

  it('renders "No log files found" when file list is empty', async () => {
    mockListFiles.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText('No log files found.')).toBeInTheDocument());
  });
});
