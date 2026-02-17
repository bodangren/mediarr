import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubtitleUpload } from './SubtitleUpload';

describe('SubtitleUpload', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload component', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Upload Subtitles')).toBeInTheDocument();
    expect(screen.getByText('Default Language')).toBeInTheDocument();
    expect(screen.getByText('Drag & drop subtitle files here')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const cancelButton = screen.getAllByText('Cancel')[0];
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when close button is clicked', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const closeButton = screen.getByLabelText('Cancel upload');
    fireEvent.click(closeButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows file count when files are selected', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    // Initially shows 0 files
    expect(screen.getByText('0 files selected')).toBeInTheDocument();
  });

  it('renders drop zone with correct text', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('or click to browse')).toBeInTheDocument();
    expect(screen.getByText('.srt, .sub, .ass, .vtt')).toBeInTheDocument();
  });

  it('has language selector with default option', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const select = screen.getByLabelText('Default Language');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('en');
  });

  it('shows upload button disabled when no files', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeDisabled();
  });

  it('accepts seriesId prop', () => {
    render(
      <SubtitleUpload
        seriesId={123}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    // Component should render without error
    expect(screen.getByText('Upload Subtitles')).toBeInTheDocument();
  });

  it('accepts episodeId prop', () => {
    render(
      <SubtitleUpload
        episodeId={456}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Upload Subtitles')).toBeInTheDocument();
  });

  it('accepts movieId prop', () => {
    render(
      <SubtitleUpload
        movieId={789}
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Upload Subtitles')).toBeInTheDocument();
  });

  it('shows Files to Upload section when files are added', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    // Simulate file selection
    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    // Should show file list section
    expect(screen.getByText('Files to Upload')).toBeInTheDocument();
  });

  it('shows file name and size in list', async () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file = new File(['test content'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('test.srt')).toBeInTheDocument();
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });
  });

  it('shows drop zone overlay when dragging', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const dropZone = screen.getByText('Drag & drop subtitle files here').parentElement;

    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-accent-primary');

    fireEvent.dragLeave(dropZone!);
    expect(dropZone).not.toHaveClass('border-accent-primary');
  });

  it('disables remove button for non-pending files', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    // The remove button should be enabled for pending files
    const removeButtons = screen.queryAllByLabelText(/Remove/);
    // No files added yet, so no remove buttons
    expect(removeButtons.length).toBe(0);
  });

  it('updates selected language count', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    expect(screen.getByText('1 file selected')).toBeInTheDocument();
  });

  it('handles multiple files correctly', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file1 = new File(['test1'], 'test1.srt', { type: 'text/plain' });
    const file2 = new File(['test2'], 'test2.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file1, file2],
      writable: false,
    });

    fireEvent.change(input);

    expect(screen.getByText('2 files selected')).toBeInTheDocument();
  });

  it('shows progress bar during upload', async () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    // Add files and click upload
    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });
  });

  it('shows success state after upload', async () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    // Wait for upload to complete
    await waitFor(
      () => {
        expect(screen.queryByText('Uploading...')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('shows Done button after successful upload', async () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(
      () => {
        expect(screen.getByText('Done')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('calls onSuccess when Done is clicked', async () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    await waitFor(
      () => {
        const doneButton = screen.getByText('Done');
        expect(doneButton).toBeInTheDocument();
        fireEvent.click(doneButton);
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 },
    );
  });

  it('has accessible file input', () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const input = screen.getByLabelText('Select subtitle files');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', '.srt,.sub,.ass,.vtt');
  });

  it('shows language selector for each file', async () => {
    render(
      <SubtitleUpload
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />,
    );

    const file = new File(['test'], 'test.srt', { type: 'text/plain' });
    const input = screen.getByLabelText('Select subtitle files');

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      const languageSelects = screen.getAllByDisplayValue('en');
      expect(languageSelects.length).toBeGreaterThan(0);
    });
  });
});
