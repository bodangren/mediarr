export interface WantedState {
  activeTab: 'missing' | 'cutoffUnmet';
}

export type WantedAction =
  | { type: 'wanted/activeTab/set'; payload: 'missing' | 'cutoffUnmet' };

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface WantedStore {
  getState: () => WantedState;
  dispatch: (action: WantedAction) => WantedState;
}

export const WANTED_STATE_STORAGE_KEY = 'mediarr.wanted.state';

const DEFAULT_WANTED_STATE: WantedState = {
  activeTab: 'missing',
};

export function wantedReducer(state: WantedState, action: WantedAction): WantedState {
  if (action.type === 'wanted/activeTab/set') {
    return {
      ...state,
      activeTab: action.payload,
    };
  }

  return state;
}

export function createInitialWantedState(storage?: StorageLike): WantedState {
  if (!storage) {
    return DEFAULT_WANTED_STATE;
  }

  const raw = storage.getItem(WANTED_STATE_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_WANTED_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WantedState>;
    return {
      activeTab: parsed.activeTab ?? DEFAULT_WANTED_STATE.activeTab,
    };
  } catch {
    return DEFAULT_WANTED_STATE;
  }
}

export function persistWantedState(state: WantedState, storage?: StorageLike): void {
  if (!storage) {
    return;
  }

  storage.setItem(WANTED_STATE_STORAGE_KEY, JSON.stringify(state));
}

interface CreateWantedStoreOptions {
  storage?: StorageLike;
  initialState?: WantedState;
}

export function createWantedStore(options: CreateWantedStoreOptions = {}): WantedStore {
  const { storage, initialState } = options;
  let state = initialState ?? createInitialWantedState(storage);

  return {
    getState() {
      return state;
    },
    dispatch(action: WantedAction) {
      state = wantedReducer(state, action);
      persistWantedState(state, storage);
      return state;
    },
  };
}
