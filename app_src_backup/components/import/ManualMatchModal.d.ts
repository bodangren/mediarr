import type { DetectedSeries, SeriesSearchResult } from './types';
interface ManualMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    series: DetectedSeries | null;
    onMatch: (detectedSeriesId: number, matchedSeries: SeriesSearchResult) => void;
}
export declare function ManualMatchModal({ isOpen, onClose, series, onMatch }: ManualMatchModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=ManualMatchModal.d.ts.map