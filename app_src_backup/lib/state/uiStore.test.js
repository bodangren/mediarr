import { describe, expect, it } from 'vitest';
import { createUIStore, createInitialUIState, UI_STATE_STORAGE_KEY, uiReducer, } from './uiStore';
function createMemoryStorage(seed) {
    const store = new Map(Object.entries(seed ?? {}));
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, value);
        },
    };
}
describe('ui store', () => {
    it('creates default state when storage is empty', () => {
        const storage = createMemoryStorage();
        expect(createInitialUIState(storage)).toEqual({
            sidebarCollapsed: false,
        });
    });
    it('creates default state when storage is unavailable', () => {
        expect(createInitialUIState(undefined)).toEqual({
            sidebarCollapsed: false,
        });
    });
    it('hydrates state from localStorage payload', () => {
        const storage = createMemoryStorage({
            [UI_STATE_STORAGE_KEY]: JSON.stringify({ sidebarCollapsed: true }),
        });
        expect(createInitialUIState(storage)).toEqual({
            sidebarCollapsed: true,
        });
    });
    it('dispatches actions and persists updated state to storage', () => {
        const storage = createMemoryStorage();
        const store = createUIStore({ storage });
        const next = store.dispatch({ type: 'ui/sidebarCollapsed/toggle' });
        expect(next.sidebarCollapsed).toBe(true);
        const persisted = storage.getItem(UI_STATE_STORAGE_KEY);
        expect(persisted).toBe(JSON.stringify({ sidebarCollapsed: true }));
    });
    it('supports explicit set action and store getState', () => {
        const storage = createMemoryStorage();
        const store = createUIStore({
            storage,
            initialState: { sidebarCollapsed: true },
        });
        expect(store.getState().sidebarCollapsed).toBe(true);
        const next = store.dispatch({ type: 'ui/sidebarCollapsed/set', payload: false });
        expect(next.sidebarCollapsed).toBe(false);
    });
    it('falls back to default state for invalid JSON payload', () => {
        const storage = createMemoryStorage({
            [UI_STATE_STORAGE_KEY]: '{not valid json',
        });
        expect(createInitialUIState(storage)).toEqual({
            sidebarCollapsed: false,
        });
    });
    it('returns current state for unsupported action shape', () => {
        const current = { sidebarCollapsed: true };
        const invalidAction = { type: 'ui/unknown' };
        expect(uiReducer(current, invalidAction)).toEqual(current);
    });
    it('does not throw when dispatching without storage', () => {
        const store = createUIStore();
        expect(() => store.dispatch({ type: 'ui/sidebarCollapsed/toggle' })).not.toThrow();
    });
});
//# sourceMappingURL=uiStore.test.js.map