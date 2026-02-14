import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from './Modal';

describe('Modal primitives', () => {
  it('renders dialog content and closes on backdrop click', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} ariaLabel="Indexers modal">
        <ModalHeader title="Manage indexer" onClose={onClose} />
        <ModalBody>
          <p>Body content</p>
        </ModalBody>
      </Modal>,
    );

    expect(screen.getByRole('dialog', { name: 'Indexers modal' })).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} ariaLabel="Hidden modal">
        <ModalBody>
          <p>Hidden</p>
        </ModalBody>
      </Modal>,
    );

    expect(screen.queryByRole('dialog', { name: 'Hidden modal' })).not.toBeInTheDocument();
  });

  it('renders modal subcomponents layout blocks', () => {
    render(
      <Modal isOpen ariaLabel="Layout modal">
        <ModalHeader title="Layout title" />
        <ModalBody>
          <p>Layout body</p>
        </ModalBody>
        <ModalFooter>
          <button type="button">Done</button>
        </ModalFooter>
      </Modal>,
    );

    expect(screen.getByText('Layout title')).toBeInTheDocument();
    expect(screen.getByText('Layout body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('fires confirm and cancel handlers in confirm modal', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen
        title="Delete indexer"
        description="This operation cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmVariant="danger"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-status-error/20');
  });
});
