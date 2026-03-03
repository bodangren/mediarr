import type { SeriesViewMode } from '@/types/series';
export interface SeriesOptionsState {
    viewMode: SeriesViewMode;
    sortBy: string;
    sortDir: 'asc' | 'desc';
}
export type SeriesOptionsAction = {
    type: 'series/viewMode/set';
    payload: SeriesViewMode;
} | {
    type: 'series/sortBy/set';
    payload: string;
} | {
    type: 'series/sortDir/set';
    payload: 'asc' | 'desc';
};
export interface StorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}
export interface SeriesOptionsStore {
    getState: () => SeriesOptionsState;
    dispatch: (action: SeriesOptionsAction) => SeriesOptionsState;
}
export declare const SERIES_OPTIONS_STORAGE_KEY = "mediarr.series.options";
export declare function seriesOptionsReducer(state: SeriesOptionsState, action: SeriesOptionsAction): SeriesOptionsState;
export declare function createInitialSeriesOptions(storage?: StorageLike): SeriesOptionsState;
export declare function persistSeriesOptions(state: SeriesOptionsState, storage?: StorageLike): void;
interface CreateSeriesOptionsStoreOptions {
    storage?: StorageLike;
    initialState?: SeriesOptionsState;
}
export declare function createSeriesOptionsStore(options?: CreateSeriesOptionsStoreOptions): SeriesOptionsStore;
export declare function getGlobalSeriesOptionsStore(): SeriesOptionsStore;
export {};
//# sourceMappingURL=seriesOptionsStore.d.ts.map