export const SERIES_OPTIONS_STORAGE_KEY = 'mediarr.series.options';
const DEFAULT_SERIES_OPTIONS = {
    viewMode: 'table',
    sortBy: 'title',
    sortDir: 'asc',
};
export function seriesOptionsReducer(state, action) {
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
export function createInitialSeriesOptions(storage) {
    if (!storage) {
        return DEFAULT_SERIES_OPTIONS;
    }
    const raw = storage.getItem(SERIES_OPTIONS_STORAGE_KEY);
    if (!raw) {
        return DEFAULT_SERIES_OPTIONS;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            viewMode: parsed.viewMode ?? DEFAULT_SERIES_OPTIONS.viewMode,
            sortBy: parsed.sortBy ?? DEFAULT_SERIES_OPTIONS.sortBy,
            sortDir: parsed.sortDir ?? DEFAULT_SERIES_OPTIONS.sortDir,
        };
    }
    catch {
        return DEFAULT_SERIES_OPTIONS;
    }
}
export function persistSeriesOptions(state, storage) {
    if (!storage) {
        return;
    }
    storage.setItem(SERIES_OPTIONS_STORAGE_KEY, JSON.stringify(state));
}
export function createSeriesOptionsStore(options = {}) {
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
let globalSeriesOptionsStore = null;
export function getGlobalSeriesOptionsStore() {
    if (!globalSeriesOptionsStore) {
        globalSeriesOptionsStore = createSeriesOptionsStore({
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        });
    }
    return globalSeriesOptionsStore;
}
//# sourceMappingURL=seriesOptionsStore.js.map