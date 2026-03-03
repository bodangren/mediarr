import type { CalendarOptions } from '@/types/calendar';
interface CalendarOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    options: CalendarOptions;
    onOptionsChange: (options: CalendarOptions) => void;
}
export declare function CalendarOptionsModal({ isOpen, onClose, options, onOptionsChange, }: CalendarOptionsModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CalendarOptionsModal.d.ts.map