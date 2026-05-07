import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScoreBreakdownPanel } from './ScoreBreakdownPanel';

const mockBreakdown = {
  customFormats: [
    { id: 1, name: 'HDR10', score: 50 },
    { id: 2, name: 'Dolby Vision', score: 100 },
  ],
  customFormatScore: 150,
  confidenceScore: 100,
  indexerPriority: 25,
  indexerScore: 125,
  seeders: 100,
  seedScore: 20,
  totalScore: 395,
};

describe('ScoreBreakdownPanel', () => {
  it('renders total score prominently', () => {
    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    expect(screen.getByText('395')).toBeInTheDocument();
  });

  it('shows custom formats section', () => {
    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    expect(screen.getByText('Custom Formats')).toBeInTheDocument();
    expect(screen.getByText('HDR10')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('Dolby Vision')).toBeInTheDocument();
    expect(screen.getAllByText('+100')).toHaveLength(2); // Dolby Vision +100 and Confidence +100
  });

  it('shows indexer priority section', () => {
    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    expect(screen.getByText('Indexer Priority')).toBeInTheDocument();
    expect(screen.getByText('Priority: 25')).toBeInTheDocument();
    expect(screen.getByText('+125')).toBeInTheDocument();
  });

  it('shows confidence section', () => {
    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    expect(screen.getByText('Title Confidence')).toBeInTheDocument();
    // +100 appears in both Dolby Vision and Confidence - just check the section exists
    expect(screen.getAllByText('+100').length).toBeGreaterThanOrEqual(1);
  });

  it('shows seeders section', () => {
    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    expect(screen.getByText('Seeders')).toBeInTheDocument();
    expect(screen.getByText('100 peers')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
  });

  it('toggles JSON view', async () => {
    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    const jsonToggle = screen.getByRole('button', { name: /show json/i });
    fireEvent.click(jsonToggle);

    await waitFor(() => {
      expect(screen.getByText(/"totalScore": 395/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /hide json/i }));

    await waitFor(() => {
      expect(screen.queryByText(/"totalScore": 395/)).not.toBeInTheDocument();
    });
  });

  it('copies JSON to clipboard', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: mockWriteText } });

    render(<ScoreBreakdownPanel breakdown={mockBreakdown} />);

    fireEvent.click(screen.getByRole('button', { name: /show json/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('"totalScore": 395'));
    });
  });

  it('handles empty custom formats', () => {
    const breakdownWithoutFormats = {
      ...mockBreakdown,
      customFormats: [],
      customFormatScore: 0,
      totalScore: 245,
    };

    render(<ScoreBreakdownPanel breakdown={breakdownWithoutFormats} />);

    expect(screen.getByText('No matching custom formats')).toBeInTheDocument();
  });
});
