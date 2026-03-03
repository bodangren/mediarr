import type { CalendarEvent as CalendarEventItem } from '@/types/calendar';
interface CalendarDayProps {
    date: string;
    events: CalendarEventItem[];
    isToday: boolean;
}
export declare function CalendarDay({ date, events, isToday }: CalendarDayProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CalendarDay.d.ts.map