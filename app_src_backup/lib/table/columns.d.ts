export interface ColumnPreference {
    key: string;
    label: string;
    visible: boolean;
}
export interface ColumnStorage {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}
export declare function toggleColumnVisibility(columns: ColumnPreference[], key: string): ColumnPreference[];
export declare function moveColumn(columns: ColumnPreference[], fromIndex: number, toIndex: number): ColumnPreference[];
export declare function saveColumnPreferences(tableKey: string, columns: ColumnPreference[], storage?: ColumnStorage): void;
export declare function loadColumnPreferences(tableKey: string, storage?: ColumnStorage): ColumnPreference[] | null;
//# sourceMappingURL=columns.d.ts.map