import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SystemReportPage } from './SystemReportPage';

describe('SystemReportPage', () => {
  it('embeds the served feature report and offers a new-tab link', () => {
    render(<MemoryRouter><SystemReportPage /></MemoryRouter>);
    const frame = screen.getByTitle('Mediarr system report');
    expect(frame).toHaveAttribute('src', '/reports/features.html');
    expect(screen.getByRole('link', { name: /Open in a new tab/i })).toHaveAttribute('href', '/reports/features.html');
  });
});
