interface MetricCardProps {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'flat';
    onAction?: () => void;
}
export declare function MetricCard({ label, value, trend, onAction }: MetricCardProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=MetricCard.d.ts.map