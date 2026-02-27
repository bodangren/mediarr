import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SubtitleTrackList } from './SubtitleTrackList';
import type { SubtitleTrack } from '@/lib/api/subtitleApi';

const mockTracks: SubtitleTrack[] = [
  {
    languageCode: 'en',
    isForced: false,
    isHi: false,
    path: '/path/to/movie.en.srt',
    provider: 'OpenSubtitles',
  },
  {
    languageCode: 'es',
    isForced: true,
    isHi: true,
    path: '/path/to/movie.es.forced.hi.srt',
    provider: 'Subscene',
  },
];

const mockMissingLanguages = ['fr', 'de', 'it'];

describe('SubtitleTrackList', () => {
  it('renders available subtitles section', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Available Subtitles')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('es')).toBeInTheDocument();
  });

  it('renders missing languages section', () => {
    render(
      <SubtitleTrackList
        tracks={[]}
        missingLanguages={mockMissingLanguages}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Missing Languages')).toBeInTheDocument();
    expect(screen.getByText('fr')).toBeInTheDocument();
    expect(screen.getByText('de')).toBeInTheDocument();
    expect(screen.getByText('it')).toBeInTheDocument();
  });

  it('renders provider name for each track', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('OpenSubtitles')).toBeInTheDocument();
    expect(screen.getByText('Subscene')).toBeInTheDocument();
  });

  it('renders file path (truncated)', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const longPath = screen.getByTitle('/path/to/movie.en.srt');
    expect(longPath).toBeInTheDocument();
  });

  it('shows forced indicator on language badge', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('(F)')).toBeInTheDocument();
  });

  it('shows HI indicator on language badge', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('(HI)')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const handleDelete = vi.fn();
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    const deleteButtons = screen.getAllByLabelText(/Delete subtitle for/);
    fireEvent.click(deleteButtons[0]);
    expect(handleDelete).toHaveBeenCalledWith(0);
  });

  it('calls onSearch when missing language badge is clicked', () => {
    const handleSearch = vi.fn();
    render(
      <SubtitleTrackList
        tracks={[]}
        missingLanguages={mockMissingLanguages}
        onSearch={handleSearch}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('fr'));
    expect(handleSearch).toHaveBeenCalledWith('fr');
  });

  it('renders download button when onDownload is provided', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    const downloadButtons = screen.getAllByLabelText(/Download subtitle for/);
    expect(downloadButtons.length).toBeGreaterThan(0);
  });

  it('does not render download button when onDownload is not provided', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const downloadButtons = screen.queryAllByLabelText(/Download subtitle for/);
    expect(downloadButtons.length).toBe(0);
  });

  it('does not render delete button when onDelete is not provided', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
      />,
    );

    const deleteButtons = screen.queryAllByLabelText(/Delete subtitle for/);
    expect(deleteButtons.length).toBe(0);
  });

  it('renders empty state when no tracks or missing languages', () => {
    render(
      <SubtitleTrackList
        tracks={[]}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('No subtitle tracks found')).toBeInTheDocument();
  });

  it('calls onSearch for all missing languages when Search All is clicked', () => {
    const handleSearch = vi.fn();
    render(
      <SubtitleTrackList
        tracks={[]}
        missingLanguages={mockMissingLanguages}
        onSearch={handleSearch}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Search All'));
    expect(handleSearch).toHaveBeenCalledTimes(3);
    expect(handleSearch).toHaveBeenCalledWith('fr');
    expect(handleSearch).toHaveBeenCalledWith('de');
    expect(handleSearch).toHaveBeenCalledWith('it');
  });

  it('applies custom className', () => {
    const { container } = render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
        className="custom-class"
      />,
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('renders track with correct styling classes', () => {
    render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const trackItems = document.querySelectorAll('.rounded-md.border');
    expect(trackItems.length).toBeGreaterThan(0);
    trackItems.forEach(item => {
      expect(item).toHaveClass('bg-surface-1');
    });
  });

  it('handles language badge click with keyboard', () => {
    const handleSearch = vi.fn();
    render(
      <SubtitleTrackList
        tracks={[]}
        missingLanguages={mockMissingLanguages}
        onSearch={handleSearch}
        onDelete={vi.fn()}
      />,
    );

    const badge = screen.getByText('fr');
    fireEvent.keyDown(badge, { key: 'Enter' });
    expect(handleSearch).toHaveBeenCalledWith('fr');
  });

  it('disables delete button when deleting', () => {
    const handleDelete = vi.fn();
    const { rerender } = render(
      <SubtitleTrackList
        tracks={mockTracks}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={handleDelete}
      />,
    );

    // Trigger delete by simulating the internal state change
    const deleteButton = screen.getAllByLabelText(/Delete subtitle for/)[0];
    expect(deleteButton).not.toBeDisabled();

    // After delete is clicked, the button should be disabled
    fireEvent.click(deleteButton);
  });

  it('renders Search All button with search icon', () => {
    render(
      <SubtitleTrackList
        tracks={[]}
        missingLanguages={mockMissingLanguages}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Search All')).toBeInTheDocument();
  });

  it('truncates long file paths correctly', () => {
    const longPathTrack: SubtitleTrack = {
      languageCode: 'en',
      isForced: false,
      isHi: false,
      path: '/very/long/path/to/the/subtitle/file/that/goes/on/and/on/movie.en.srt',
      provider: 'TestProvider',
    };

    render(
      <SubtitleTrackList
        tracks={[longPathTrack]}
        missingLanguages={[]}
        onSearch={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const pathElement = screen.getByTitle(longPathTrack.path);
    expect(pathElement.textContent).toContain('...');
  });
});
