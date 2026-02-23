import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { SubtitleUpload } from './SubtitleUpload';

const mockUploadSubtitle = vi.fn();

vi.mock('@/lib/api/client', () => ({
  getApiClients: vi.fn(() => ({
    subtitleApi: {
      uploadSubtitle: mockUploadSubtitle,
    },
  })),
}));

function renderWithProviders(ui: ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('SubtitleUpload', () => {
  const onSuccess = vi.fn();
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file picker, language selector, and flags', () => {
    renderWithProviders(
      <SubtitleUpload movieId={9} onSuccess={onSuccess} onCancel={onCancel} />,
    );

    expect(screen.getByText('Upload Subtitles')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Forced')).toBeInTheDocument();
    expect(screen.getByLabelText('Hearing Impaired')).toBeInTheDocument();
    expect(screen.getByLabelText('Select subtitle file')).toHaveAttribute('accept', '.srt,.ass,.ssa,.sub,.vtt');
  });

  it('uploads subtitle with movie context and metadata', async () => {
    const user = userEvent.setup();
    const file = new File(['subtitle content'], 'movie.en.srt', { type: 'application/x-subrip' });

    mockUploadSubtitle.mockResolvedValue({
      id: 1,
      mediaId: 9,
      mediaType: 'movie',
      filePath: '/data/subtitles/movie.en.srt',
      language: 'en',
      forced: false,
      hearingImpaired: false,
    });

    renderWithProviders(
      <SubtitleUpload movieId={9} onSuccess={onSuccess} onCancel={onCancel} />,
    );

    await user.upload(screen.getByLabelText('Select subtitle file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockUploadSubtitle).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    const call = mockUploadSubtitle.mock.calls[0]?.[0];
    expect(call.file).toBe(file);
    expect(call.mediaId).toBe(9);
    expect(call.mediaType).toBe('movie');
    expect(call.language).toBe('en');
    expect(call.forced).toBe(false);
    expect(call.hearingImpaired).toBe(false);
    expect(typeof call.onUploadProgress).toBe('function');
  });

  it('uses episode context when episodeId is provided', async () => {
    const user = userEvent.setup();
    const file = new File(['subtitle content'], 'episode.en.srt', { type: 'application/x-subrip' });
    mockUploadSubtitle.mockResolvedValue({ id: 2 });

    renderWithProviders(
      <SubtitleUpload episodeId={44} onSuccess={onSuccess} onCancel={onCancel} />,
    );

    await user.upload(screen.getByLabelText('Select subtitle file'), file);
    await user.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() => {
      expect(mockUploadSubtitle).toHaveBeenCalledTimes(1);
    });

    expect(mockUploadSubtitle.mock.calls[0]?.[0].mediaType).toBe('episode');
    expect(mockUploadSubtitle.mock.calls[0]?.[0].mediaId).toBe(44);
  });

  it('rejects unsupported file extensions', async () => {
    const user = userEvent.setup();
    const invalidFile = new File(['not subtitle'], 'notes.txt', { type: 'text/plain' });

    renderWithProviders(
      <SubtitleUpload movieId={9} onSuccess={onSuccess} onCancel={onCancel} />,
    );

    await user.upload(screen.getByLabelText('Select subtitle file'), invalidFile);

    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(mockUploadSubtitle).not.toHaveBeenCalled();
  });

  it('disables upload when no media context is provided', async () => {
    const user = userEvent.setup();
    const file = new File(['subtitle content'], 'movie.en.srt', { type: 'application/x-subrip' });

    renderWithProviders(
      <SubtitleUpload onSuccess={onSuccess} onCancel={onCancel} />,
    );

    await user.upload(screen.getByLabelText('Select subtitle file'), file);

    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.getByText('Upload target is unavailable for this media item.')).toBeInTheDocument();
  });
});
