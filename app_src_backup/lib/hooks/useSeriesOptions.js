import { useEffect, useState } from 'react';
import { getGlobalSeriesOptionsStore, } from '@/lib/state/seriesOptionsStore';
export function useSeriesOptions() {
    const store = getGlobalSeriesOptionsStore();
    const [state, setState] = useState(() => store.getState());
    useEffect(() => {
        const checkForUpdates = () => {
            const currentState = store.getState();
            setState(currentState);
        };
        checkForUpdates();
    }, [store]);
    const dispatch = (action) => {
        const newState = store.dispatch(action);
        setState(newState);
    };
    return [state, dispatch];
}
export function useSeriesViewMode() {
    const [state, dispatch] = useSeriesOptions();
    const setViewMode = (mode) => {
        dispatch({ type: 'series/viewMode/set', payload: mode });
    };
    return [state.viewMode, setViewMode];
}
//# sourceMappingURL=useSeriesOptions.js.map