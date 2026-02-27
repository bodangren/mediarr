import { useEffect, useState } from 'react';
import type { SeriesOptionsState, SeriesViewMode } from '@/types/series';
import {
  getGlobalSeriesOptionsStore,
  type SeriesOptionsAction,
} from '@/lib/state/seriesOptionsStore';

export function useSeriesOptions(): [SeriesOptionsState, (action: SeriesOptionsAction) => void] {
  const store = getGlobalSeriesOptionsStore();
  const [state, setState] = useState(() => store.getState());

  useEffect(() => {
    const checkForUpdates = () => {
      const currentState = store.getState();
      setState(currentState);
    };

    checkForUpdates();
  }, [store]);

  const dispatch = (action: SeriesOptionsAction) => {
    const newState = store.dispatch(action);
    setState(newState);
  };

  return [state, dispatch];
}

export function useSeriesViewMode(): [SeriesViewMode, (mode: SeriesViewMode) => void] {
  const [state, dispatch] = useSeriesOptions();

  const setViewMode = (mode: SeriesViewMode) => {
    dispatch({ type: 'series/viewMode/set', payload: mode });
  };

  return [state.viewMode, setViewMode];
}
