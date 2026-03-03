import type { ReactNode } from 'react';
import type { DetectedSeries } from './types';
interface ImportSeriesTableProps {
    detectedSeries: DetectedSeries[];
    onManualMatch: (series: DetectedSeries) => void;
    onImport: (series: DetectedSeries) => void;
    onBulkImport: (seriesIds: number[]) => void;
    backendSupported: boolean | null;
}
export declare function ImportSeriesTable(props: ImportSeriesTableProps): ReactNode;
export {};
//# sourceMappingURL=ImportSeriesTable.d.ts.map