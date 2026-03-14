// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './button';
import { Dialog, DialogContent, DialogTrigger } from './dialog';
import { Input } from './input';
import { Checkbox } from './checkbox';
import { Switch } from './switch';

describe('shadcn/ui primitive smoke tests', () => {
  describe('Button', () => {
    it('renders with default variant', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByRole('button', { name: 'Delete' });
      expect(btn).toBeInTheDocument();
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Cancel</Button>);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('is disabled when disabled prop is set', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
    });

    it('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click</Button>);
      fireEvent.click(screen.getByRole('button', { name: 'Click' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dialog', () => {
    it('shows content when open', () => {
      render(
        <Dialog open>
          <DialogContent>Dialog body</DialogContent>
        </Dialog>
      );
      expect(screen.getByText('Dialog body')).toBeInTheDocument();
    });

    it('hides content when closed', () => {
      render(
        <Dialog open={false}>
          <DialogContent>Hidden body</DialogContent>
        </Dialog>
      );
      expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
    });

    it('opens via trigger', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>Modal content</DialogContent>
        </Dialog>
      );
      fireEvent.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders an input element', () => {
      render(<Input aria-label="test-input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('calls onChange with new value', () => {
      const onChange = vi.fn();
      render(<Input aria-label="test" onChange={onChange} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is set', () => {
      render(<Input aria-label="test" disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('Checkbox', () => {
    it('renders unchecked by default', () => {
      render(<Checkbox aria-label="test-checkbox" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('calls onCheckedChange when clicked', () => {
      const onChange = vi.fn();
      render(<Checkbox aria-label="test" onCheckedChange={onChange} />);
      fireEvent.click(screen.getByRole('checkbox'));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('renders checked when checked prop is true', () => {
      render(<Checkbox aria-label="checked" checked onCheckedChange={vi.fn()} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('Switch', () => {
    it('renders as a switch role', () => {
      render(<Switch aria-label="toggle" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('calls onCheckedChange when toggled', () => {
      const onChange = vi.fn();
      render(<Switch aria-label="toggle" onCheckedChange={onChange} />);
      fireEvent.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('renders checked state', () => {
      render(<Switch aria-label="toggle" checked onCheckedChange={vi.fn()} />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });
  });
});
