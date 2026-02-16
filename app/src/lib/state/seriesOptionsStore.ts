import type { SeriesViewMode } from '@/types/series';

export interface SeriesOptionsState {
  viewMode: SeriesViewMode;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export type SeriesOptionsAction =
  | { type: 'series/viewMode/set'; payload: SeriesViewMode }
  | { type: 'series/sortBy/set'; payload: string }
  | { type: 'series/sortDir/set'; payload: 'asc' | 'desc' };

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface SeriesOptionsStore {
  getState: () => SeriesOptionsState;
  dispatch: (action: SeriesOptionsAction) => SeriesOptionsState;
}

export const SERIES_OPTIONS_STORAGE_KEY = 'mediarr.series.options';

const DEFAULT_SERIES_OPTIONS: SeriesOptionsState = {
  viewMode: 'table',
  sortBy: 'title',
  sortDir: 'asc',
};

export function seriesOptionsReducer(state: SeriesOptionsState, action: SeriesOptionsAction): SeriesOptionsState {
  if (action.type === 'series/viewMode/set') {
    return {
      ...state,
      viewMode: action.payload,
    };
  }

  if (action.type === 'series/sortBy/set') {
    return {
      ...state,
      sortBy: action.payload,
    };
  }

  if (action.type === 'series/sortDir/set') {
    return {
      ...state,
      sortDir: action.payload,
    };
  }

  return state;
}

export function createInitialSeriesOptions(storage?: StorageLike): SeriesOptionsState {
  if (!storage) {
    return DEFAULT_SERIES_OPTIONS;
  }

  const raw = storage.getItem(SERIES_OPTIONS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_SERIES_OPTIONS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SeriesOptionsState>;
    return {
      viewMode: parsed.viewMode ?? DEFAULT_SERIES_OPTIONS.viewMode,
      sortBy: parsed.sortBy ?? DEFAULT_SERIES_OPTIONS.sortBy,
      sortDir: parsed.sortDir ?? DEFAULT_SERIES_OPTIONS.sortDir,
    };
  } catch {
    return DEFAULT_SERIES_OPTIONS;
  }
}

export function persistSeriesOptions(state: SeriesOptionsState, storage?: StorageLike): void {
  if (!storage) {
    return;
  }

  storage.setItem(SERIES_OPTIONS_STORAGE_KEY, JSON.stringify(state));
}

interface CreateSeriesOptionsStoreOptions {
  storage?: StorageLike;
  initialState?: SeriesOptionsState;
}

export function createSeriesOptionsStore(options: CreateSeriesOptionsStoreOptions = {}): SeriesOptionsStore {
  const { storage, initialState } = options;
  let state = initialState ?? createInitialSeriesOptions(storage);

  return {
    getState() {
      return state;
    },
    dispatch(action) {
      state = seriesOptionsReducer(state, action);
      persistSeriesOptions(state, storage);
      return state;
    },
  };
}

// Global singleton instance
let globalSeriesOptionsStore: SeriesOptionsStore | null = null;

export function getGlobalSeriesOptionsStore(): SeriesOptionsStore {
  if (!globalSeriesOptionsStore) {
    globalSeriesOptionsStore = createSeriesOptionsStore({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    });
  }
  return globalSeriesOptionsStore;
}
