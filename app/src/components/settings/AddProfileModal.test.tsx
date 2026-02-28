import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QualityProfileItem } from '@/lib/api/qualityProfileApi';
import { AddProfileModal } from './AddProfileModal';

vi.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ isOver: false }, vi.fn()],
}));
vi.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));

const mockProfile: QualityProfileItem = {
  id: 1,
  name: 'HD-1080p',
  cutoff: 2,
  items: [
    { quality: { id: 1, name: 'SDTV', resolution: 480, source: 'TV' }, allowed: false },
    { quality: { id: 2, name: 'WEB-DL 1080p', resolution: 1080, source: 'Web' }, allowed: true },
    { quality: { id: 3, name: 'Bluray-1080p', resolution: 1080, source: 'Bluray' }, allowed: true },
  ],
};

const noop = () => Promise.resolve();

describe('AddProfileModal', () => {
  it('does not render when closed', () => {
    render(<AddProfileModal isOpen={false} onClose={noop} onSave={noop} editProfile={mockProfile} />);
    expect(screen.queryByLabelText(/profile name/i)).not.toBeInTheDocument();
  });

  it('renders profile name pre-filled in edit mode', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    const nameInput = screen.getByLabelText(/profile name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('HD-1080p');
  });

  it('renders quality rows for all items (allowed and not)', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    expect(screen.getByLabelText(/toggle SDTV/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/toggle WEB-DL 1080p/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/toggle Bluray-1080p/i)).toBeInTheDocument();
  });

  it('allowed items have checked checkboxes; disallowed are unchecked', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    expect(screen.getByLabelText(/toggle SDTV/i)).not.toBeChecked();
    expect(screen.getByLabelText(/toggle WEB-DL 1080p/i)).toBeChecked();
    expect(screen.getByLabelText(/toggle Bluray-1080p/i)).toBeChecked();
  });

  it('cutoff selector shows only allowed qualities', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    const cutoffSelect = screen.getByRole('combobox', { name: /cutoff quality/i });
    const optionTexts = within(cutoffSelect).getAllByRole('option').map(o => o.textContent);
    expect(optionTexts).toContain('WEB-DL 1080p');
    expect(optionTexts).toContain('Bluray-1080p');
    expect(optionTexts).not.toContain('SDTV');
  });

  it('cutoff selector has the profile cutoff quality pre-selected', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    const cutoffSelect = screen.getByRole('combobox', { name: /cutoff quality/i }) as HTMLSelectElement;
    // cutoff is quality id=2 which is 'WEB-DL 1080p'
    expect(cutoffSelect.value).toBe('2');
  });

  it('first up button is disabled; last down button is disabled', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    const upButtons = screen.getAllByRole('button', { name: /move .* up/i });
    const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[downButtons.length - 1]).toBeDisabled();
  });

  it('clicking down on first row moves it below the second', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    const rows = screen.getAllByRole('listitem');
    const firstText = rows[0].textContent;
    const secondText = rows[1].textContent;

    const downButtons = screen.getAllByRole('button', { name: /move .* down/i });
    fireEvent.click(downButtons[0]);

    const reorderedRows = screen.getAllByRole('listitem');
    expect(reorderedRows[0].textContent).toBe(secondText);
    expect(reorderedRows[1].textContent).toBe(firstText);
  });

  it('save calls onSave with correct API payload structure', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AddProfileModal isOpen onClose={noop} onSave={onSave} editProfile={mockProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());

    const payload = onSave.mock.calls[0][0];
    expect(payload.name).toBe('HD-1080p');
    expect(payload.cutoff).toBe(2);
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items).toHaveLength(3);
    // items must use the real API shape: { quality: { id, name, ... }, allowed: boolean }
    expect(payload.items[0]).toHaveProperty('quality');
    expect(payload.items[0]).toHaveProperty('allowed');
    expect(typeof payload.items[0].quality.id).toBe('number');
  });

  it('toggling an allowed quality off removes it from the cutoff options', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    fireEvent.click(screen.getByLabelText(/toggle WEB-DL 1080p/i));
    const cutoffSelect = screen.getByRole('combobox', { name: /cutoff quality/i });
    const optionTexts = within(cutoffSelect).getAllByRole('option').map(o => o.textContent);
    expect(optionTexts).not.toContain('WEB-DL 1080p');
  });

  it('if the current cutoff is toggled off, cutoff auto-moves to another allowed quality', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    // cutoff is quality id=2 (WEB-DL 1080p) — toggle it off
    fireEvent.click(screen.getByLabelText(/toggle WEB-DL 1080p/i));
    const cutoffSelect = screen.getByRole('combobox', { name: /cutoff quality/i }) as HTMLSelectElement;
    // cutoff should now be Bluray-1080p (id=3), the only remaining allowed
    expect(cutoffSelect.value).toBe('3');
  });

  it('shows "Edit: <name>" title in edit mode', () => {
    render(<AddProfileModal isOpen onClose={noop} onSave={noop} editProfile={mockProfile} />);
    expect(screen.getByText(/edit: hd-1080p/i)).toBeInTheDocument();
  });
});
