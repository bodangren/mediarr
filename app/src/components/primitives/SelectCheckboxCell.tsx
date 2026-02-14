'use client';

import { useSelectContext } from './SelectProvider';

interface SelectCheckboxCellProps {
  rowId: string | number;
}

export function SelectCheckboxCell({ rowId }: SelectCheckboxCellProps) {
  const { isSelected, toggleRow } = useSelectContext();

  return (
    <td className="px-3 py-2">
      <input
        type="checkbox"
        aria-label="Select row"
        checked={isSelected(rowId)}
        onChange={event => toggleRow(rowId, (event.nativeEvent as MouseEvent).shiftKey)}
      />
    </td>
  );
}
