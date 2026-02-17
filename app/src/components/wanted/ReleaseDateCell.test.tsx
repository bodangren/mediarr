import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReleaseDateCell } from './ReleaseDateCell';

describe('ReleaseDateCell', () => {
  it('renders all release dates when provided', () => {
    render(
      <ReleaseDateCell
        cinemaDate="2024-03-01"
        digitalDate="2024-05-14"
        physicalDate="2024-06-18"
      />,
    );

    expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
    expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
    // Check that all labels are present
    expect(screen.getAllByText(/Cinema:/i)).toHaveLength(1);
    expect(screen.getAllByText(/Digital:/i)).toHaveLength(1);
    expect(screen.getAllByText(/Physical:/i)).toHaveLength(1);
  });

  it('renders only cinema date when provided', () => {
    render(<ReleaseDateCell cinemaDate="2024-03-01" />);

    expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
    expect(screen.getByText(/Mar/)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
  });

  it('renders only digital date when provided', () => {
    render(<ReleaseDateCell digitalDate="2024-05-14" />);

    expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
    expect(screen.getByText(/May/)).toBeInTheDocument();
    expect(screen.getByText(/14/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
  });

  it('renders only physical date when provided', () => {
    render(<ReleaseDateCell physicalDate="2024-06-18" />);

    expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
    expect(screen.getByText(/18/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
  });

  it('renders all dashes when no dates provided', () => {
    render(<ReleaseDateCell />);

    expect(screen.getByText(/Cinema:/i)).toBeInTheDocument();
    expect(screen.getByText(/Digital:/i)).toBeInTheDocument();
    expect(screen.getByText(/Physical:/i)).toBeInTheDocument();
  });
});
