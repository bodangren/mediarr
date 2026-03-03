import type { DetectedSeries } from './types';
interface ImportSeriesRowProps {
    series: DetectedSeries;
    isSelected: boolean;
    onSelect: (id: number) => void;
    onManualMatch: (series: DetectedSeries) => void;
    onImport: (series: DetectedSeries) => void;
    backendSupported: boolean | null;
}
export declare function ImportSeriesRow({ series, isSelected, onSelect, onManualMatch, onImport, backendSupported }: ImportSeriesRowProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ImportSeriesRow.d.ts.map