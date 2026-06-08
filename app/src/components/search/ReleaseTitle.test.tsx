import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReleaseTitle } from './ReleaseTitle';

describe('ReleaseTitle', () => {
  it('renders the full title when it is short (length <= 60)', () => {
    const title = 'Short title';
    render(<ReleaseTitle title={title} />);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('exposes the full title on the title (tooltip) attribute', () => {
    const title = 'Short title';
    render(<ReleaseTitle title={title} />);
    expect(screen.getByText(title)).toHaveAttribute('title', title);
  });

  it('truncates a long title with line-clamp and offers a "Show more" button', () => {
    const title = 'A'.repeat(80);
    render(<ReleaseTitle title={title} />);

    const span = screen.getByText(title);
    expect(span.className).toMatch(/line-clamp-2/);

    const button = screen.getByRole('button', { name: /show more/i });
    expect(button).toBeInTheDocument();
  });

  it('expands the title and toggles the button label when "Show more" is clicked', () => {
    const title = 'B'.repeat(80);
    render(<ReleaseTitle title={title} />);

    const span = screen.getByText(title);
    const button = screen.getByRole('button', { name: /show more/i });

    fireEvent.click(button);

    expect(span.className).not.toMatch(/line-clamp-2/);
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
  });

  it('respects the maxLines prop when applying the clamp class', () => {
    const title = 'C'.repeat(80);
    render(<ReleaseTitle title={title} maxLines={3} />);
    expect(screen.getByText(title).className).toMatch(/line-clamp-3/);
  });
});
