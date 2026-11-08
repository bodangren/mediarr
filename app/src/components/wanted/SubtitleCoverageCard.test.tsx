import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubtitleCoverageCard } from './SubtitleCoverageCard';
import type { SubtitleCoverageReport } from '../../lib/api/subtitleWantedApi';

const report: SubtitleCoverageReport = {
  buckets: [
    { bucket: 'continue-watching', total: 6, withChinese: 4, withEnglish: 4, withBoth: 3, missingChinese: 2, missingBoth: 1 },
    { bucket: 'recently-watched', total: 3, withChinese: 3, withEnglish: 3, withBoth: 3, missingChinese: 0, missingBoth: 0 },
    { bucket: 'recently-added', total: 17, withChinese: 4, withEnglish: 2, withBoth: 2, missingChinese: 13, missingBoth: 13 },
    { bucket: 'backfill', total: 3136, withChinese: 1500, withEnglish: 1869, withBoth: 1009, missingChinese: 1636, missingBoth: 776 },
  ],
  totals: { total: 3162, withChinese: 1511, withEnglish: 1878, withBoth: 1017, missingChinese: 1651, missingBoth: 790 },
  highPriority: { total: 9, covered: 7, missing: 2 },
};

describe('SubtitleCoverageCard', () => {
  it('summarises the high-priority denominator', () => {
    render(<SubtitleCoverageCard report={report} />);
    expect(screen.getByText('Subtitle coverage')).toBeInTheDocument();
    expect(screen.getByText('9 high-priority · 7 covered · 2 missing')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '78');
  });

  it('renders every bucket with its counts', () => {
    render(<SubtitleCoverageCard report={report} />);
    for (const label of ['Continue watching', 'Watched recently', 'New', 'Backfill']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('3136')).toBeInTheDocument();
    expect(screen.getByText('1636')).toBeInTheDocument();
  });

  it('renders nothing without a report', () => {
    const { container } = render(<SubtitleCoverageCard report={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a measuring state while loading', () => {
    render(<SubtitleCoverageCard report={null} isLoading />);
    expect(screen.getByText('Measuring subtitle coverage…')).toBeInTheDocument();
  });
});
