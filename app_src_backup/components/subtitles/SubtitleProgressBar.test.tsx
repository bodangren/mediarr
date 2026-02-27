import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubtitleProgressBar } from './SubtitleProgressBar';

describe('SubtitleProgressBar', () => {
  it('renders progress bar correctly', () => {
    render(<SubtitleProgressBar total={50} complete={45} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays correct completion text', () => {
    render(<SubtitleProgressBar total={50} complete={45} />);
    expect(screen.getByText('45', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('50', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('90% complete')).toBeInTheDocument();
    expect(screen.getByText('5 missing')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    render(<SubtitleProgressBar total={100} complete={75} />);
    expect(screen.getByText('75% complete')).toBeInTheDocument();
  });

  it('shows green color for >90% completion', () => {
    const { container } = render(<SubtitleProgressBar total={100} complete={95} />);
    const progressBar = container.querySelector('.bg-accent-success');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows yellow color for 50-90% completion', () => {
    const { container } = render(<SubtitleProgressBar total={100} complete={70} />);
    const progressBar = container.querySelector('.bg-accent-warning');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows red color for <50% completion', () => {
    const { container } = render(<SubtitleProgressBar total={100} complete={30} />);
    const progressBar = container.querySelector('.bg-accent-danger');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<SubtitleProgressBar total={50} complete={45} label="Episode Subtitles" />);
    expect(screen.getByText('Episode Subtitles')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    const { container } = render(<SubtitleProgressBar total={50} complete={45} />);
    const labels = container.querySelectorAll('.text-sm.text-text-secondary');
    const labelText = Array.from(labels).find(el => el.textContent === 'Episode Subtitles');
    expect(labelText).toBeUndefined();
  });

  it('handles zero total', () => {
    render(<SubtitleProgressBar total={0} complete={0} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('handles zero complete', () => {
    render(<SubtitleProgressBar total={50} complete={0} />);
    expect(screen.getByText('0', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('50', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('0% complete')).toBeInTheDocument();
    expect(screen.getByText('50 missing')).toBeInTheDocument();
  });

  it('handles full completion', () => {
    render(<SubtitleProgressBar total={50} complete={50} />);
    const fifties = screen.getAllByText('50');
    expect(fifties.length).toBe(2);
    expect(screen.getByText('100% complete')).toBeInTheDocument();
    expect(screen.getByText('0 missing')).toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<SubtitleProgressBar total={100} complete={75} />);
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps percentage to 100%', () => {
    render(<SubtitleProgressBar total={10} complete={15} />);
    expect(screen.getByText('100% complete')).toBeInTheDocument();
  });

  it('clamps percentage to 0%', () => {
    render(<SubtitleProgressBar total={10} complete={-5} />);
    expect(screen.getByText('0% complete')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <SubtitleProgressBar total={50} complete={45} className="custom-class" />,
    );
    const wrapper = document.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('shows transition animation on progress bar', () => {
    const { container } = render(<SubtitleProgressBar total={100} complete={50} />);
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toHaveClass('transition-all', 'duration-300');
  });

  it('handles fractional progress', () => {
    render(<SubtitleProgressBar total={3} complete={1} />);
    expect(screen.getByText('33% complete')).toBeInTheDocument();
  });

  it('displays missing count correctly', () => {
    render(<SubtitleProgressBar total={100} complete={60} />);
    expect(screen.getByText('40 missing')).toBeInTheDocument();
  });

  it('rounds percentage correctly', () => {
    render(<SubtitleProgressBar total={3} complete={2} />);
    expect(screen.getByText('67% complete')).toBeInTheDocument();
  });
});
