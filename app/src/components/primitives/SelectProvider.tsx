
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type RowId = string | number;

interface SelectContextValue {
  selectedIds: RowId[];
  isSelected: (id: RowId) => boolean;
  toggleRow: (id: RowId, shiftKey?: boolean) => void;
  clearSelection: () => void;
}

const SelectContext = createContext<SelectContextValue | undefined>(undefined);

interface SelectProviderProps {
  rowIds: RowId[];
  children: ReactNode;
}

export function SelectProvider({ rowIds, children }: SelectProviderProps) {
  const [selectedIds, setSelectedIds] = useState<RowId[]>([]);
  const [lastToggledId, setLastToggledId] = useState<RowId | null>(null);

  const value = useMemo<SelectContextValue>(() => {
    const isSelected = (id: RowId) => selectedIds.includes(id);

    const toggleRow = (id: RowId, shiftKey = false) => {
      setSelectedIds(current => {
        if (shiftKey && lastToggledId != null) {
          const start = rowIds.indexOf(lastToggledId);
          const end = rowIds.indexOf(id);
          if (start !== -1 && end !== -1) {
            const [from, to] = start <= end ? [start, end] : [end, start];
            const range = rowIds.slice(from, to + 1);
            const merged = new Set([...current, ...range]);
            return rowIds.filter(rowId => merged.has(rowId));
          }
        }

        if (current.includes(id)) {
          return current.filter(rowId => rowId !== id);
        }

        return [...current, id];
      });

      setLastToggledId(id);
    };

    const clearSelection = () => {
      setSelectedIds([]);
      setLastToggledId(null);
    };

    return {
      selectedIds,
      isSelected,
      toggleRow,
      clearSelection,
    };
  }, [lastToggledId, rowIds, selectedIds]);

  return <SelectContext.Provider value={value}>{children}</SelectContext.Provider>;
}

export function useSelectContext(): SelectContextValue {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error('useSelectContext must be used within SelectProvider');
  }

  return context;
}
