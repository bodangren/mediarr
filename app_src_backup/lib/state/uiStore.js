export const UI_STATE_STORAGE_KEY = 'mediarr.ui.state';
const DEFAULT_UI_STATE = {
    sidebarCollapsed: false,
};
export function uiReducer(state, action) {
    if (action.type === 'ui/sidebarCollapsed/set') {
        return {
            ...state,
            sidebarCollapsed: action.payload,
        };
    }
    if (action.type === 'ui/sidebarCollapsed/toggle') {
        return {
            ...state,
            sidebarCollapsed: !state.sidebarCollapsed,
        };
    }
    return state;
}
export function createInitialUIState(storage) {
    if (!storage) {
        return DEFAULT_UI_STATE;
    }
    const raw = storage.getItem(UI_STATE_STORAGE_KEY);
    if (!raw) {
        return DEFAULT_UI_STATE;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            sidebarCollapsed: parsed.sidebarCollapsed ?? DEFAULT_UI_STATE.sidebarCollapsed,
        };
    }
    catch {
        return DEFAULT_UI_STATE;
    }
}
export function persistUIState(state, storage) {
    if (!storage) {
        return;
    }
    storage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
}
export function createUIStore(options = {}) {
    const { storage, initialState } = options;
    let state = initialState ?? createInitialUIState(storage);
    return {
        getState() {
            return state;
        },
        dispatch(action) {
            state = uiReducer(state, action);
            persistUIState(state, storage);
            return state;
        },
    };
}
//# sourceMappingURL=uiStore.js.map