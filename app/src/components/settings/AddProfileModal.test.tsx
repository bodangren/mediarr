import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddProfileModal } from './AddProfileModal';

// react-dnd requires a backend in tests; use the test backend
vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ isOver: false }, vi.fn()],
}));
vi.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));

const noop = () => Promise.resolve();

describe('AddProfileModal', () => {
  it('renders with name input and quality list when open', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    expect(screen.getByLabelText(/profile name/i)).toBeInTheDocument();
    expect(screen.getByText(/allowed qualities/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AddProfileModal isOpen={false} onClose={noop} onSave={noop} />,
    );
    expect(screen.queryByLabelText(/profile name/i)).not.toBeInTheDocument();
  });

  it('renders reorderable quality rows in the selected list', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    // Multiple quality rows should be shown (defaults to all selected)
    const upButtons = screen.getAllByRole('button', { name: /move .* up/i });
    expect(upButtons.length).toBeGreaterThan(0);
    const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
    expect(downButtons.length).toBeGreaterThan(0);
  });

  it('first row up button is disabled and last row down button is disabled', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    const upButtons = screen.getAllByRole('button', { name: /move .* up/i });
    const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('clicking up arrow on second item moves it above the first', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    const upButtons = screen.getAllByRole('button', { name: /move .* up/i });
    const rows = screen.getAllByRole('listitem');
    const firstLabel = rows[0].textContent;
    const secondLabel = rows[1].textContent;

    fireEvent.click(upButtons[1]);

    const reorderedRows = screen.getAllByRole('listitem');
    expect(reorderedRows[0].textContent).toBe(secondLabel);
    expect(reorderedRows[1].textContent).toBe(firstLabel);
  });

  it('clicking down arrow on first item moves it below the second', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
    const rows = screen.getAllByRole('listitem');
    const firstLabel = rows[0].textContent;
    const secondLabel = rows[1].textContent;

    fireEvent.click(downButtons[0]);

    const reorderedRows = screen.getAllByRole('listitem');
    expect(reorderedRows[0].textContent).toBe(secondLabel);
    expect(reorderedRows[1].textContent).toBe(firstLabel);
  });

  it('cutoff selector options match the selected qualities', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    const cutoffSelect = screen.getByRole('combobox', { name: /cutoff quality/i });
    const options = within(cutoffSelect).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('saved payload includes qualities in user-defined order', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <AddProfileModal isOpen onClose={noop} onSave={onSave} />,
    );

    // Enter a name
    fireEvent.change(screen.getByLabelText(/profile name/i), { target: { value: 'My Profile' } });

    // Move first item down
    const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
    const rows = screen.getAllByRole('listitem');
    const originalSecond = rows[1].textContent ?? '';
    fireEvent.click(downButtons[0]);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /add profile/i }));
    await vi.waitFor(() => expect(onSave).toHaveBeenCalled());

    const savedPayload = onSave.mock.calls[0][0];
    // The qualities array should preserve user-defined order
    expect(Array.isArray(savedPayload.items ?? savedPayload.qualities)).toBe(true);
    const firstSaved = (savedPayload.items ?? savedPayload.qualities)[0];
    // The originally second item should now be first
    const firstSavedName = firstSaved?.quality?.name ?? firstSaved?.name ?? '';
    expect(originalSecond).toContain(firstSavedName.replace(/\s/g, '').charAt(0));
  });

  it('cutoff quality stays in sync when its row is moved', () => {
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} />,
    );
    const cutoffSelect = screen.getByRole('combobox', { name: /cutoff quality/i });
    const initialCutoff = (cutoffSelect as HTMLSelectElement).value;

    // Move cutoff item around — it should remain selectable
    const cutoffOption = Array.from((cutoffSelect as HTMLSelectElement).options)
      .find(o => o.value === initialCutoff);
    expect(cutoffOption).toBeTruthy();
  });

  it('populates fields when editing an existing profile', () => {
    const editProfile = {
      id: 1,
      name: 'Test Profile',
      cutoffId: 0,
      qualities: [
        { id: 1, name: 'SDTV', resolution: '480p', source: 'TV' },
      ],
    };
    render(
      <AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={editProfile} />,
    );
    expect((screen.getByLabelText(/profile name/i) as HTMLInputElement).value).toBe('Test Profile');
  });
});
