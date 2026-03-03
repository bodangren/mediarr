export type FilterConditionOperator = 'contains' | 'equals' | 'gt';
export interface FilterFieldOption {
    key: string;
    label: string;
}
export interface FilterConditionInput {
    field: string;
    operator: FilterConditionOperator;
    value: string;
}
export interface FilterBuilderResult {
    operator: 'and' | 'or';
    conditions: FilterConditionInput[];
}
interface FilterBuilderProps {
    fields: FilterFieldOption[];
    onApply: (result: FilterBuilderResult) => void;
}
export declare function FilterBuilder({ fields, onApply }: FilterBuilderProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=FilterBuilder.d.ts.map