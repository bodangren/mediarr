export interface UIState {
  sidebarCollapsed: boolean;
}

export type UIAction =
  | { type: 'ui/sidebarCollapsed/set'; payload: boolean }
  | { type: 'ui/sidebarCollapsed/toggle' };

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface UIStore {
  getState: () => UIState;
  dispatch: (action: UIAction) => UIState;
}

export const UI_STATE_STORAGE_KEY = 'mediarr.ui.state';

const DEFAULT_UI_STATE: UIState = {
  sidebarCollapsed: false,
};

export function uiReducer(state: UIState, action: UIAction): UIState {
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

export function createInitialUIState(storage?: StorageLike): UIState {
  if (!storage) {
    return DEFAULT_UI_STATE;
  }

  const raw = storage.getItem(UI_STATE_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_UI_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UIState>;
    return {
      sidebarCollapsed: parsed.sidebarCollapsed ?? DEFAULT_UI_STATE.sidebarCollapsed,
    };
  } catch {
    return DEFAULT_UI_STATE;
  }
}

export function persistUIState(state: UIState, storage?: StorageLike): void {
  if (!storage) {
    return;
  }

  storage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
}

interface CreateUIStoreOptions {
  storage?: StorageLike;
  initialState?: UIState;
}

export function createUIStore(options: CreateUIStoreOptions = {}): UIStore {
  const { storage, initialState } = options;
  let state = initialState ?? createInitialUIState(storage);

  return {
    getState() {
      return state;
    },
    dispatch(action: UIAction) {
      state = uiReducer(state, action);
      persistUIState(state, storage);
      return state;
    },
  };
}
