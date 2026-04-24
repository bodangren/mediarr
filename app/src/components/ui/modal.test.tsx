import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from './modal';

describe('Modal primitives', () => {
  it('renders dialog content', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} ariaLabel="Indexers modal">
        <ModalHeader title="Manage indexer" onClose={onClose} />
        <ModalBody>
          <p>Body content</p>
        </ModalBody>
      </Modal>,
    );

    // shadcn DialogTitle renders the name for the dialog
    expect(screen.getByRole('dialog', { name: 'Manage indexer' })).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('closes on close button click', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} ariaLabel="Indexers modal">
        <ModalHeader title="Manage indexer" onClose={onClose} />
        <ModalBody>
          <p>Body content</p>
        </ModalBody>
      </Modal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click when closeOnBackdropClick is true', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Modal isOpen onClose={onClose} ariaLabel="Backdrop modal">
        <ModalHeader title="Backdrop test" />
        <ModalBody>
          <p>Content</p>
        </ModalBody>
      </Modal>,
    );

    // Radix Dialog overlay has data-state="open" and is behind the content
    // Clicking the overlay should trigger onOpenChange(false) -> onClose()
    const overlay = document.querySelector('[data-state="open"]');
    expect(overlay).toBeInTheDocument();

    // Use userEvent for proper pointer event simulation that Radix expects
    if (overlay) {
      await user.click(overlay);
    }

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on backdrop click when closeOnBackdropClick is false', () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose} ariaLabel="Locked modal" closeOnBackdropClick={false}>
        <ModalHeader title="Locked modal" />
        <ModalBody>
          <p>Content</p>
        </ModalBody>
      </Modal>,
    );

    const overlay = document.querySelector('[data-state="open"]');
    expect(overlay).toBeInTheDocument();

    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(onClose).not.toHaveBeenCalled();
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
    // danger maps to destructive in shadcn
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-destructive');
  });

  it('applies scrollable overflow styles to ModalBody', () => {
    render(
      <Modal isOpen ariaLabel="Scrollable modal">
        <ModalHeader title="Scrollable title" />
        <ModalBody>
          <p>Scrollable content</p>
        </ModalBody>
      </Modal>,
    );

    const modal = screen.getByRole('dialog', { name: 'Scrollable title' });
    const modalBody = modal.querySelector('.overflow-y-auto');
    expect(modalBody).toBeInTheDocument();
    expect(modalBody).toHaveTextContent('Scrollable content');
  });

  it('applies sticky positioning to ModalFooter', () => {
    render(
      <Modal isOpen ariaLabel="Sticky footer modal">
        <ModalHeader title="Sticky footer title" />
        <ModalBody>
          <p>Content</p>
        </ModalBody>
        <ModalFooter>
          <button type="button">Footer Button</button>
        </ModalFooter>
      </Modal>,
    );

    const modal = screen.getByRole('dialog', { name: 'Sticky footer title' });
    const modalFooter = modal.querySelector('footer');
    expect(modalFooter).toBeInTheDocument();
    expect(modalFooter).toHaveClass('sticky', 'bottom-0');
  });

  it('applies responsive max-width classes to Modal', () => {
    render(
      <Modal isOpen ariaLabel="Responsive modal" maxWidthClassName="max-w-lg">
        <ModalBody>
          <p>Responsive content</p>
        </ModalBody>
      </Modal>,
    );

    const modal = screen.getByRole('dialog', { name: 'Responsive modal' });
    expect(modal).toHaveClass('max-w-lg');
  });
});
