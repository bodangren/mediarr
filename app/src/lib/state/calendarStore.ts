import type { CalendarFilters, CalendarOptions } from '../../types/calendar';

export interface CalendarState {
  currentDate: string; // ISO date
  viewMode: 'calendar' | 'agenda';
  contentType: 'all' | 'movies' | 'tv';
  dayCount: 3 | 5 | 7;
  filters: CalendarFilters;
  options: CalendarOptions;
}

export type CalendarAction =
  | { type: 'calendar/currentDate/set'; payload: string }
  | { type: 'calendar/currentDate/reset' }
  | { type: 'calendar/viewMode/set'; payload: 'calendar' | 'agenda' }
  | { type: 'calendar/contentType/set'; payload: 'all' | 'movies' | 'tv' }
  | { type: 'calendar/dayCount/set'; payload: 3 | 5 | 7 }
  | { type: 'calendar/filters/set'; payload: CalendarFilters }
  | { type: 'calendar/filters/reset' }
  | { type: 'calendar/options/set'; payload: CalendarOptions }
  | { type: 'calendar/options/reset' };

export interface CalendarStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface CalendarStore {
  getState: () => CalendarState;
  dispatch: (action: CalendarAction) => CalendarState;
}

export const CALENDAR_STATE_STORAGE_KEY = 'mediarr.calendar.state';

const DEFAULT_CALENDAR_OPTIONS: CalendarOptions = {
  showDayNumbers: true,
  showWeekNumbers: false,
  showMonitored: true,
  showUnmonitored: true,
  showCinemaReleases: true,
  showDigitalReleases: true,
  showPhysicalReleases: true,
};

const DEFAULT_CALENDAR_STATE: CalendarState = {
  currentDate: new Date().toISOString().split('T')[0]!,
  viewMode: 'calendar',
  contentType: 'all',
  dayCount: 7,
  filters: {},
  options: DEFAULT_CALENDAR_OPTIONS,
};

export function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  if (action.type === 'calendar/currentDate/set') {
    return {
      ...state,
      currentDate: action.payload,
    };
  }

  if (action.type === 'calendar/currentDate/reset') {
    return {
      ...state,
      currentDate: new Date().toISOString().split('T')[0]!,
    };
  }

  if (action.type === 'calendar/viewMode/set') {
    return {
      ...state,
      viewMode: action.payload,
    };
  }

  if (action.type === 'calendar/contentType/set') {
    return {
      ...state,
      contentType: action.payload,
    };
  }

  if (action.type === 'calendar/dayCount/set') {
    return {
      ...state,
      dayCount: action.payload,
    };
  }

  if (action.type === 'calendar/filters/set') {
    return {
      ...state,
      filters: action.payload,
    };
  }

  if (action.type === 'calendar/filters/reset') {
    return {
      ...state,
      filters: {},
    };
  }

  if (action.type === 'calendar/options/set') {
    return {
      ...state,
      options: action.payload,
    };
  }

  if (action.type === 'calendar/options/reset') {
    return {
      ...state,
      options: DEFAULT_CALENDAR_OPTIONS,
    };
  }

  return state;
}

export function createInitialCalendarState(storage?: CalendarStorageLike): CalendarState {
  if (!storage) {
    return DEFAULT_CALENDAR_STATE;
  }

  const raw = storage.getItem(CALENDAR_STATE_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_CALENDAR_STATE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CalendarState>;
    return {
      currentDate: parsed.currentDate ?? DEFAULT_CALENDAR_STATE.currentDate,
      viewMode: parsed.viewMode ?? DEFAULT_CALENDAR_STATE.viewMode,
      contentType: parsed.contentType ?? DEFAULT_CALENDAR_STATE.contentType,
      dayCount: parsed.dayCount ?? DEFAULT_CALENDAR_STATE.dayCount,
      filters: parsed.filters ?? DEFAULT_CALENDAR_STATE.filters,
      options: parsed.options ?? DEFAULT_CALENDAR_OPTIONS,
    };
  } catch {
    return DEFAULT_CALENDAR_STATE;
  }
}

export function persistCalendarState(state: CalendarState, storage?: CalendarStorageLike): void {
  if (!storage) {
    return;
  }

  storage.setItem(CALENDAR_STATE_STORAGE_KEY, JSON.stringify(state));
}

interface CreateCalendarStoreOptions {
  storage?: CalendarStorageLike;
  initialState?: CalendarState;
}

export function createCalendarStore(options: CreateCalendarStoreOptions = {}): CalendarStore {
  const { storage, initialState } = options;
  let state = initialState ?? createInitialCalendarState(storage);

  return {
    getState() {
      return state;
    },
    dispatch(action: CalendarAction) {
      state = calendarReducer(state, action);
      persistCalendarState(state, storage);
      return state;
    },
  };
}

// Global singleton instance
let globalCalendarStore: CalendarStore | undefined;

export function getCalendarStore(): CalendarStore {
  if (!globalCalendarStore) {
    globalCalendarStore = createCalendarStore({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    });
  }
  return globalCalendarStore;
}
