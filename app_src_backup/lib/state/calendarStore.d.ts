import type { CalendarFilters, CalendarOptions } from '../../types/calendar';
export interface CalendarState {
    currentDate: string;
    viewMode: 'calendar' | 'agenda';
    contentType: 'all' | 'movies' | 'tv';
    dayCount: 3 | 5 | 7;
    filters: CalendarFilters;
    options: CalendarOptions;
}
export type CalendarAction = {
    type: 'calendar/currentDate/set';
    payload: string;
} | {
    type: 'calendar/currentDate/reset';
} | {
    type: 'calendar/viewMode/set';
    payload: 'calendar' | 'agenda';
} | {
    type: 'calendar/contentType/set';
    payload: 'all' | 'movies' | 'tv';
} | {
    type: 'calendar/dayCount/set';
    payload: 3 | 5 | 7;
} | {
    type: 'calendar/filters/set';
    payload: CalendarFilters;
} | {
    type: 'calendar/filters/reset';
} | {
    type: 'calendar/options/set';
    payload: CalendarOptions;
} | {
    type: 'calendar/options/reset';
};
export interface CalendarStorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
}
export interface CalendarStore {
    getState: () => CalendarState;
    dispatch: (action: CalendarAction) => CalendarState;
}
export declare const CALENDAR_STATE_STORAGE_KEY = "mediarr.calendar.state";
export declare function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState;
export declare function createInitialCalendarState(storage?: CalendarStorageLike): CalendarState;
export declare function persistCalendarState(state: CalendarState, storage?: CalendarStorageLike): void;
interface CreateCalendarStoreOptions {
    storage?: CalendarStorageLike;
    initialState?: CalendarState;
}
export declare function createCalendarStore(options?: CreateCalendarStoreOptions): CalendarStore;
export declare function getCalendarStore(): CalendarStore;
export {};
//# sourceMappingURL=calendarStore.d.ts.map