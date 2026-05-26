/**
 * Shared StorageLike interface for app state persistence.
 * Used by uiPreferences, seriesOptionsStore, uiStore, and wantedStore.
 */
export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}
