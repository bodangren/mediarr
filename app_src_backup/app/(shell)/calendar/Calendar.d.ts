import type { CalendarEvent } from '@/types/calendar';
interface CalendarProps {
    events: CalendarEvent[];
    currentDate: string;
    dayCount: 3 | 5 | 7;
}
export declare function Calendar({ events, currentDate, dayCount }: CalendarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Calendar.d.ts.map