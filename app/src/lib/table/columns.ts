export interface ColumnPreference {
  key: string;
  label: string;
  visible: boolean;
}

export interface ColumnStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORAGE_PREFIX = 'mediarr.table.columns';

export function toggleColumnVisibility(columns: ColumnPreference[], key: string): ColumnPreference[] {
  return columns.map(column =>
    column.key === key
      ? {
          ...column,
          visible: !column.visible,
        }
      : column,
  );
}

export function moveColumn(columns: ColumnPreference[], fromIndex: number, toIndex: number): ColumnPreference[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= columns.length || toIndex >= columns.length) {
    return columns;
  }

  const next = [...columns];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function saveColumnPreferences(tableKey: string, columns: ColumnPreference[], storage?: ColumnStorage): void {
  if (!storage) {
    return;
  }

  storage.setItem(`${STORAGE_PREFIX}.${tableKey}`, JSON.stringify(columns));
}

export function loadColumnPreferences(tableKey: string, storage?: ColumnStorage): ColumnPreference[] | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(`${STORAGE_PREFIX}.${tableKey}`);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ColumnPreference[];
  } catch {
    return null;
  }
}
