import type { SeriesOptionsState, SeriesViewMode } from '@/types/series';
import { type SeriesOptionsAction } from '@/lib/state/seriesOptionsStore';
export declare function useSeriesOptions(): [SeriesOptionsState, (action: SeriesOptionsAction) => void];
export declare function useSeriesViewMode(): [SeriesViewMode, (mode: SeriesViewMode) => void];
//# sourceMappingURL=useSeriesOptions.d.ts.map