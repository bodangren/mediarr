export type SeriesType = 'standard' | 'anime' | 'daily';
interface SeriesTypeConfig {
    value: SeriesType;
    label: string;
    description: string;
}
declare const SERIES_TYPE_OPTIONS: SeriesTypeConfig[];
interface SeriesTypePopoverProps {
    value: SeriesType;
    onChange: (value: SeriesType) => void;
    disabled?: boolean;
}
export declare function SeriesTypePopover({ value, onChange, disabled }: SeriesTypePopoverProps): import("react/jsx-runtime").JSX.Element;
export { SERIES_TYPE_OPTIONS };
//# sourceMappingURL=SeriesTypePopover.d.ts.map