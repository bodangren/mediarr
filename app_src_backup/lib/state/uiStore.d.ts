export interface UIState {
    sidebarCollapsed: boolean;
}
export type UIAction = {
    type: 'ui/sidebarCollapsed/set';
    payload: boolean;
} | {
    type: 'ui/sidebarCollapsed/toggle';
};
export interface StorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}
export interface UIStore {
    getState: () => UIState;
    dispatch: (action: UIAction) => UIState;
}
export declare const UI_STATE_STORAGE_KEY = "mediarr.ui.state";
export declare function uiReducer(state: UIState, action: UIAction): UIState;
export declare function createInitialUIState(storage?: StorageLike): UIState;
export declare function persistUIState(state: UIState, storage?: StorageLike): void;
interface CreateUIStoreOptions {
    storage?: StorageLike;
    initialState?: UIState;
}
export declare function createUIStore(options?: CreateUIStoreOptions): UIStore;
export {};
//# sourceMappingURL=uiStore.d.ts.map