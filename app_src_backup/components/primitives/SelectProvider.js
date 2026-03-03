'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useState } from 'react';
const SelectContext = createContext(undefined);
export function SelectProvider({ rowIds, children }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const [lastToggledId, setLastToggledId] = useState(null);
    const value = useMemo(() => {
        const isSelected = (id) => selectedIds.includes(id);
        const toggleRow = (id, shiftKey = false) => {
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
    return _jsx(SelectContext.Provider, { value: value, children: children });
}
export function useSelectContext() {
    const context = useContext(SelectContext);
    if (!context) {
        throw new Error('useSelectContext must be used within SelectProvider');
    }
    return context;
}
//# sourceMappingURL=SelectProvider.js.map