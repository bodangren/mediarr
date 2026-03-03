export interface WantedState {
    activeTab: 'missing' | 'cutoffUnmet';
}
export type WantedAction = {
    type: 'wanted/activeTab/set';
    payload: 'missing' | 'cutoffUnmet';
};
export interface StorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}
export interface WantedStore {
    getState: () => WantedState;
    dispatch: (action: WantedAction) => WantedState;
}
export declare const WANTED_STATE_STORAGE_KEY = "mediarr.wanted.state";
export declare function wantedReducer(state: WantedState, action: WantedAction): WantedState;
export declare function createInitialWantedState(storage?: StorageLike): WantedState;
export declare function persistWantedState(state: WantedState, storage?: StorageLike): void;
interface CreateWantedStoreOptions {
    storage?: StorageLike;
    initialState?: WantedState;
}
export declare function createWantedStore(options?: CreateWantedStoreOptions): WantedStore;
export {};
//# sourceMappingURL=wantedStore.d.ts.map