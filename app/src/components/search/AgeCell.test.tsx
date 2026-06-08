import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AgeCell } from './AgeCell';

describe('AgeCell', () => {
  it('renders hours for age < 24h', () => {
    render(<AgeCell ageHours={2} />);
    expect(screen.getByText('2 hours')).toBeInTheDocument();
  });

  it('renders singular hour when age equals 1', () => {
    render(<AgeCell ageHours={1} />);
    expect(screen.getByText('1 hour')).toBeInTheDocument();
  });

  it('renders days for age >= 24h', () => {
    render(<AgeCell ageHours={48} />);
    expect(screen.getByText('2 days')).toBeInTheDocument();
  });

  it('renders minutes for age < 1h (asserts against implementation, not spec text)', () => {
    render(<AgeCell ageHours={0.5} />);
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
  });

  it('renders a "Published: …" tooltip when publishDate is provided', () => {
    const publishDate = '2024-01-02T03:04:05.000Z';
    render(<AgeCell ageHours={3} publishDate={publishDate} />);
    const span = screen.getByText('3 hours');
    expect(span).toHaveAttribute('title', expect.stringMatching(/^Published: /));
  });
});
