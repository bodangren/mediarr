import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubtitleProgressBar } from './SubtitleProgressBar';

describe('SubtitleProgressBar', () => {
  it('renders progress bar correctly', () => {
    render(<SubtitleProgressBar total={10} complete={5} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays correct completion text', () => {
    render(<SubtitleProgressBar total={50} complete={45} label="Progress" />);
    expect(screen.getByText('45/50')).toBeInTheDocument();
    expect(screen.getByText(/90% complete/)).toBeInTheDocument();
  });

  it('handles zero complete', () => {
    render(<SubtitleProgressBar total={50} complete={0} />);
    expect(screen.getByText(/0% complete/)).toBeInTheDocument();
    expect(screen.getByText(/50 missing/)).toBeInTheDocument();
  });

  it('handles full completion', () => {
    render(<SubtitleProgressBar total={50} complete={50} />);
    expect(screen.getByText(/100% complete/)).toBeInTheDocument();
    expect(screen.getByText(/0 missing/)).toBeInTheDocument();
  });

  it('rounds percentage correctly', () => {
    render(<SubtitleProgressBar total={3} complete={2} />);
    expect(screen.getByText(/67% complete/)).toBeInTheDocument();
  });

  it('handles zero total', () => {
    render(<SubtitleProgressBar total={0} complete={0} />);
    expect(screen.getByText(/0% complete/)).toBeInTheDocument();
    expect(screen.getByText(/0 missing/)).toBeInTheDocument();
  });
});
