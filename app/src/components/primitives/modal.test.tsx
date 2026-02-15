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

  it('applies scrollable overflow styles to ModalBody', () => {
    render(
      <Modal isOpen ariaLabel="Scrollable modal">
        <ModalHeader title="Scrollable title" />
        <ModalBody>
          <p>Scrollable content</p>
        </ModalBody>
      </Modal>,
    );

    const modal = screen.getByRole('dialog', { name: 'Scrollable modal' });
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

    const modal = screen.getByRole('dialog', { name: 'Sticky footer modal' });
    const modalFooter = modal.querySelector('footer');
    expect(modalFooter).toBeInTheDocument();
    expect(modalFooter).toHaveClass('sticky', 'bottom-0');
  });

  it('applies responsive max-width classes to Modal', () => {
    render(
      <Modal isOpen ariaLabel="Responsive modal" maxWidthClassName="max-w-lg sm:max-w-xl lg:max-w-2xl">
        <ModalBody>
          <p>Responsive content</p>
        </ModalBody>
      </Modal>,
    );

    const modal = screen.getByRole('dialog', { name: 'Responsive modal' });
    expect(modal).toHaveClass('max-w-lg', 'sm:max-w-xl', 'lg:max-w-2xl');
  });

  it('applies mobile-optimized padding to Modal backdrop', () => {
    render(
      <Modal isOpen ariaLabel="Mobile modal">
        <ModalBody>
          <p>Mobile content</p>
        </ModalBody>
      </Modal>,
    );

    const backdrop = screen.getByTestId('modal-backdrop').parentElement;
    expect(backdrop).toHaveClass('p-2', 'sm:p-4');
  });

  it('limits modal height to 85vh with flex layout', () => {
    render(
      <Modal isOpen ariaLabel="Height-limited modal">
        <ModalHeader title="Height title" />
        <ModalBody>
          <p>Tall content</p>
        </ModalBody>
        <ModalFooter>
          <button type="button">Action</button>
        </ModalFooter>
      </Modal>,
    );

    const modal = screen.getByRole('dialog', { name: 'Height-limited modal' });
    expect(modal).toHaveClass('max-h-[85vh]', 'flex', 'flex-col');
  });
});
