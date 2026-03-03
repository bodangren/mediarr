'use client';
import { useCallback, useRef, useState } from 'react';
import { createUIStore } from './uiStore';
function resolveBrowserStorage() {
    if (typeof window === 'undefined') {
        return undefined;
    }
    return window.localStorage;
}
export function useUIStore() {
    const storeRef = useRef(null);
    if (!storeRef.current) {
        storeRef.current = createUIStore({
            storage: resolveBrowserStorage(),
        });
    }
    const [state, setState] = useState(() => storeRef.current.getState());
    const dispatch = useCallback((action) => {
        const next = storeRef.current.dispatch(action);
        setState(next);
    }, []);
    return {
        state,
        dispatch,
        setSidebarCollapsed(value) {
            dispatch({
                type: 'ui/sidebarCollapsed/set',
                payload: value,
            });
        },
        toggleSidebarCollapsed() {
            dispatch({
                type: 'ui/sidebarCollapsed/toggle',
            });
        },
    };
}
//# sourceMappingURL=useUIStore.js.map