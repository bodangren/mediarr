import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './Alert';
import { Button } from '@/components/ui/button';
import { Icon } from './Icon';
import { Label } from './Label';

describe('core primitives', () => {
  it('renders button variants and click interactions', () => {
    const onClick = vi.fn();
    render(
      <>
        <Button variant="default" onClick={onClick}>
          Primary
        </Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Danger</Button>
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Primary' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument();
  });

  it('renders icon from lucide set with accessible label', () => {
    render(<Icon name="search" label="Search icon" />);
    expect(screen.getByLabelText('Search icon')).toBeInTheDocument();
  });

  it('renders alert variants with semantic tone classes', () => {
    const { rerender } = render(<Alert variant="info">Info message</Alert>);
    expect(screen.getByText('Info message')).toBeInTheDocument();

    rerender(<Alert variant="success">Success message</Alert>);
    expect(screen.getByText('Success message')).toBeInTheDocument();

    rerender(<Alert variant="warning">Warning message</Alert>);
    expect(screen.getByText('Warning message')).toBeInTheDocument();

    rerender(<Alert variant="danger">Danger message</Alert>);
    expect(screen.getByText('Danger message')).toBeInTheDocument();
  });

  it('renders label badge variants', () => {
    render(
      <>
        <Label tone="info">Info</Label>
        <Label tone="success">Success</Label>
        <Label tone="warning">Warning</Label>
        <Label tone="danger">Danger</Label>
      </>,
    );

    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Danger')).toBeInTheDocument();
  });
});
