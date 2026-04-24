
import { useCallback, useEffect, useRef, useState } from 'react';
import { createUIStore, type UIAction, type UIState, type UIStore } from './uiStore';

function resolveBrowserStorage() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}

export function useUIStore() {
  const storeRef = useRef<UIStore | null>(null);

  const [state, setState] = useState<UIState | null>(null);

  useEffect(() => {
    if (!storeRef.current) {
      storeRef.current = createUIStore({
        storage: resolveBrowserStorage(),
      });
    }
    setState(storeRef.current.getState());
  }, []);

  const dispatch = useCallback((action: UIAction) => {
    const next = storeRef.current!.dispatch(action);
    setState(next);
  }, []);

  return {
    state,
    dispatch,
    setSidebarCollapsed(value: boolean) {
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
