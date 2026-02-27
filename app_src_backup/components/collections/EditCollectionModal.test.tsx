import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { EditCollectionModal } from './EditCollectionModal';
import type { MovieCollection } from '@/types/collection';

const mockOnClose = vi.fn();
const mockOnSave = vi.fn();

const mockCollection: MovieCollection = {
  id: 1,
  tmdbId: 86311,
  name: 'The Avengers Collection',
  overview: 'The Avengers film series produced by Marvel Studios.',
  posterUrl: 'https://via.placeholder.com/300x450?text=Avengers',
  movieCount: 6,
  moviesInLibrary: 5,
  monitored: true,
  movies: [],
};

describe('EditCollectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText('Edit Collection')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Edit Collection')).toBeInTheDocument();
    expect(screen.getByLabelText('Collection Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Overview')).toBeInTheDocument();
  });

  it('pre-fills form with collection data', () => {
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByLabelText('Collection Name');
    expect(nameInput).toHaveValue('The Avengers Collection');

    const overviewTextarea = screen.getByLabelText('Overview');
    expect(overviewTextarea).toHaveValue('The Avengers film series produced by Marvel Studios.');
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onClose when close button in header is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('submits form and calls onSave when Save Changes is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith(1, expect.any(Object));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates form fields when user types', async () => {
    const user = userEvent.setup();
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nameInput = screen.getByLabelText('Collection Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    expect(nameInput).toHaveValue('Updated Name');

    const overviewTextarea = screen.getByLabelText('Overview');
    await user.clear(overviewTextarea);
    await user.type(overviewTextarea, 'Updated overview');

    expect(overviewTextarea).toHaveValue('Updated overview');
  });

  it('displays all form sections', () => {
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByLabelText('Collection Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Overview')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Availability')).toBeInTheDocument();
    expect(screen.getByLabelText('Quality Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Root Folder')).toBeInTheDocument();
  });

  it('displays monitored checkbox correctly', () => {
    render(
      <EditCollectionModal
        collection={mockCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const monitoredCheckbox = screen.getByLabelText('Monitored');
    expect(monitoredCheckbox).toBeChecked();
  });

  it('displays unmonitored checkbox correctly', () => {
    const unmonitoredCollection = { ...mockCollection, monitored: false };

    render(
      <EditCollectionModal
        collection={unmonitoredCollection}
        isOpen
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const monitoredCheckbox = screen.getByLabelText('Monitored');
    expect(monitoredCheckbox).not.toBeChecked();
  });
});
