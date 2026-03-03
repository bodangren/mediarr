export const WANTED_STATE_STORAGE_KEY = 'mediarr.wanted.state';
const DEFAULT_WANTED_STATE = {
    activeTab: 'missing',
};
export function wantedReducer(state, action) {
    if (action.type === 'wanted/activeTab/set') {
        return {
            ...state,
            activeTab: action.payload,
        };
    }
    return state;
}
export function createInitialWantedState(storage) {
    if (!storage) {
        return DEFAULT_WANTED_STATE;
    }
    const raw = storage.getItem(WANTED_STATE_STORAGE_KEY);
    if (!raw) {
        return DEFAULT_WANTED_STATE;
    }
    try {
        const parsed = JSON.parse(raw);
        return {
            activeTab: parsed.activeTab ?? DEFAULT_WANTED_STATE.activeTab,
        };
    }
    catch {
        return DEFAULT_WANTED_STATE;
    }
}
export function persistWantedState(state, storage) {
    if (!storage) {
        return;
    }
    storage.setItem(WANTED_STATE_STORAGE_KEY, JSON.stringify(state));
}
export function createWantedStore(options = {}) {
    const { storage, initialState } = options;
    let state = initialState ?? createInitialWantedState(storage);
    return {
        getState() {
            return state;
        },
        dispatch(action) {
            state = wantedReducer(state, action);
            persistWantedState(state, storage);
            return state;
        },
    };
}
//# sourceMappingURL=wantedStore.js.map