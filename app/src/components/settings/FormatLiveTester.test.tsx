import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FormatLiveTester } from './FormatLiveTester';
import type { CustomFormat } from '@/types/customFormat';

const mockTestApi = vi.fn();

const mockFormat: CustomFormat = {
  id: 1,
  name: 'HDR10',
  includeCustomFormatWhenRenaming: false,
  conditions: [
    { type: 'regex', field: 'title', operator: 'contains', value: 'HDR10', negate: false, required: false },
  ],
  scores: [],
};

describe('FormatLiveTester', () => {
  beforeEach(() => {
    mockTestApi.mockClear();
  });

  it('renders input field and test button', () => {
    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    expect(screen.getByPlaceholderText(/enter release title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test/i })).toBeInTheDocument();
  });

  it('calls onTest with title when form submitted', async () => {
    mockTestApi.mockResolvedValue({
      formatId: 1,
      formatName: 'HDR10',
      matches: true,
      conditionResults: [
        { index: 0, type: 'regex', field: 'title', operator: 'contains', value: 'HDR10', negate: false, matches: true },
      ],
    });

    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    const input = screen.getByPlaceholderText(/enter release title/i);
    fireEvent.change(input, { target: { value: 'Movie.2024.1080p.HDR10.BluRay' } });

    const button = screen.getByRole('button', { name: /test/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockTestApi).toHaveBeenCalledWith(1, expect.objectContaining({
        title: 'Movie.2024.1080p.HDR10.BluRay',
      }));
    });
  });

  it('displays match result when test succeeds', async () => {
    mockTestApi.mockResolvedValue({
      formatId: 1,
      formatName: 'HDR10',
      matches: true,
      conditionResults: [
        { index: 0, type: 'regex', field: 'title', operator: 'contains', value: 'HDR10', negate: false, matches: true },
      ],
    });

    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    const input = screen.getByPlaceholderText(/enter release title/i);
    fireEvent.change(input, { target: { value: 'Movie.2024.1080p.HDR10.BluRay' } });

    fireEvent.click(screen.getByRole('button', { name: /test/i }));

    await waitFor(() => {
      expect(screen.getByText(/match/i)).toBeInTheDocument();
    });
  });

  it('displays no match result when test fails', async () => {
    mockTestApi.mockResolvedValue({
      formatId: 1,
      formatName: 'HDR10',
      matches: false,
      conditionResults: [
        { index: 0, type: 'regex', field: 'title', operator: 'contains', value: 'HDR10', negate: false, matches: false },
      ],
    });

    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    const input = screen.getByPlaceholderText(/enter release title/i);
    fireEvent.change(input, { target: { value: 'Movie.2024.1080p.BluRay' } });

    fireEvent.click(screen.getByRole('button', { name: /test/i }));

    await waitFor(() => {
      expect(screen.getByText(/no match/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while testing', async () => {
    mockTestApi.mockImplementation(() => new Promise(() => {}));

    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    fireEvent.change(screen.getByPlaceholderText(/enter release title/i), {
      target: { value: 'Movie.2024.1080p.HDR10.BluRay' },
    });

    fireEvent.click(screen.getByRole('button', { name: /test/i }));

    expect(screen.getByRole('button', { name: /testing/i })).toBeDisabled();
  });

  it('does not submit when title is empty', () => {
    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    fireEvent.click(screen.getByRole('button', { name: /test/i }));

    expect(mockTestApi).not.toHaveBeenCalled();
  });

  it('shows per-condition results', async () => {
    mockTestApi.mockResolvedValue({
      formatId: 1,
      formatName: 'HDR10',
      matches: true,
      conditionResults: [
        { index: 0, type: 'regex', field: 'title', operator: 'contains', value: 'HDR10', negate: false, matches: true },
      ],
    });

    render(<FormatLiveTester format={mockFormat} onTest={mockTestApi} />
    );

    fireEvent.change(screen.getByPlaceholderText(/enter release title/i), {
      target: { value: 'Movie.2024.1080p.HDR10.BluRay' },
    });

    fireEvent.click(screen.getByRole('button', { name: /test/i }));

    await waitFor(() => {
      expect(screen.getByText(/title contains/i)).toBeInTheDocument();
      expect(screen.getByText(/HDR10/i)).toBeInTheDocument();
    });
  });
});
