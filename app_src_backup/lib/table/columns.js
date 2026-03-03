const STORAGE_PREFIX = 'mediarr.table.columns';
export function toggleColumnVisibility(columns, key) {
    return columns.map(column => column.key === key
        ? {
            ...column,
            visible: !column.visible,
        }
        : column);
}
export function moveColumn(columns, fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= columns.length || toIndex >= columns.length) {
        return columns;
    }
    const next = [...columns];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}
export function saveColumnPreferences(tableKey, columns, storage) {
    if (!storage) {
        return;
    }
    storage.setItem(`${STORAGE_PREFIX}.${tableKey}`, JSON.stringify(columns));
}
export function loadColumnPreferences(tableKey, storage) {
    if (!storage) {
        return null;
    }
    const raw = storage.getItem(`${STORAGE_PREFIX}.${tableKey}`);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=columns.js.map