import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectCheckboxCell } from './SelectCheckboxCell';
import { SelectFooter } from './SelectFooter';
import { SelectProvider } from './SelectProvider';

function SelectionHarness({ onBulkAction }: { onBulkAction: (ids: Array<string | number>) => void }) {
  return (
    <SelectProvider rowIds={[1, 2, 3, 4]}>
      <table>
        <tbody>
          {[1, 2, 3, 4].map(id => (
            <tr key={id}>
              <SelectCheckboxCell rowId={id} />
            </tr>
          ))}
        </tbody>
      </table>
      <SelectFooter
        actions={[
          {
            label: 'Delete',
            onClick: onBulkAction,
          },
        ]}
      />
    </SelectProvider>
  );
}

describe('selection mode', () => {
  it('supports row selection and shift-click range selection', () => {
    const onBulkAction = vi.fn();
    render(<SelectionHarness onBulkAction={onBulkAction} />);

    const checkboxes = screen.getAllByRole('checkbox', { name: /select row/i });

    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[2], { shiftKey: true });

    expect(screen.getByText('3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onBulkAction).toHaveBeenCalledWith([1, 2, 3]);
  });
});
