export type MonitoringOption = 'all' | 'future' | 'missing' | 'existing' | 'pilot' | 'firstSeason' | 'none';
interface MonitoringOptionConfig {
    value: MonitoringOption;
    label: string;
    description: string;
}
declare const MONITORING_OPTIONS: MonitoringOptionConfig[];
interface SeriesMonitoringOptionsPopoverProps {
    value: MonitoringOption;
    onChange: (value: MonitoringOption) => void;
    disabled?: boolean;
}
export declare function SeriesMonitoringOptionsPopover({ value, onChange, disabled, }: SeriesMonitoringOptionsPopoverProps): import("react/jsx-runtime").JSX.Element;
export { MONITORING_OPTIONS };
//# sourceMappingURL=SeriesMonitoringOptionsPopover.d.ts.map