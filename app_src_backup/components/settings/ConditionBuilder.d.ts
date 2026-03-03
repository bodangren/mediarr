import type { CustomFormatCondition } from '@/types/customFormat';
interface ConditionBuilderProps {
    conditions: CustomFormatCondition[];
    onChange: (conditions: CustomFormatCondition[]) => void;
    disabled?: boolean;
}
export declare function ConditionBuilder({ conditions, onChange, disabled, }: ConditionBuilderProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ConditionBuilder.d.ts.map