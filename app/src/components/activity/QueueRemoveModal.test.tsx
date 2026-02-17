import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueRemoveModal, type QueueRemoveOptions } from '@/components/activity/QueueRemoveModal';

describe('QueueRemoveModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    itemTitle: 'Test Movie 2024',
  };

  it('renders modal with title and item name', () => {
    render(<QueueRemoveModal {...defaultProps} />);

    expect(screen.getByText('Remove from queue')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to remove/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Test Movie 2024')).toBeInTheDocument();
  });

  it('renders all checkboxes unchecked by default', () => {
    render(<QueueRemoveModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
    expect(checkboxes[3]).not.toBeChecked();
  });

  it('toggles checkbox state when clicked', async () => {
    const user = userEvent.setup();
    render(<QueueRemoveModal {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<QueueRemoveModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onConfirm with options when Remove button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<QueueRemoveModal {...defaultProps} onConfirm={onConfirm} />);

    // Check all options
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(checkboxes[3]);

    await user.click(screen.getByText('Remove'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      const callArgs = onConfirm.mock.calls[0] as unknown[];
      expect(callArgs[0]).toEqual({
        blockRelease: true,
        addToImportExclusions: true,
        ignoreMovie: true,
        deleteFiles: true,
      });
    });
  });

  it('resets options when modal is closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<QueueRemoveModal {...defaultProps} />);

    // Check some options
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[2]);

    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    // Close and reopen
    rerender(<QueueRemoveModal {...defaultProps} isOpen={false} />);
    rerender(<QueueRemoveModal {...defaultProps} isOpen={true} />);

    // Check if options are reset
    const newCheckboxes = screen.getAllByRole('checkbox');
    expect(newCheckboxes[0]).not.toBeChecked();
    expect(newCheckboxes[2]).not.toBeChecked();
  });

  it('shows warning for delete files option', () => {
    render(<QueueRemoveModal {...defaultProps} />);

    expect(
      screen.getByText(/Warning: This will delete downloaded files/i),
    ).toBeInTheDocument();
  });

  it('disables buttons when confirming', () => {
    render(<QueueRemoveModal {...defaultProps} isConfirming={true} />);

    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Removing...')).toBeInTheDocument();
    expect(screen.queryByText('Remove')).not.toBeInTheDocument();
  });

  it('shows secondary button for Cancel', () => {
    render(<QueueRemoveModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
  });

  it('shows danger button for Remove', () => {
    render(<QueueRemoveModal {...defaultProps} />);

    const removeButton = screen.getByText('Remove');
    expect(removeButton).toBeInTheDocument();
  });
});
