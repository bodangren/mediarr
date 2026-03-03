import type { FilterConditionsGroup, FilterTargetType } from '@/lib/api/filters';
type BuilderTargetType = FilterTargetType;
interface FilterBuilderProps {
    isOpen: boolean;
    targetType?: BuilderTargetType;
    activeFilter?: {
        id?: number;
        name: string;
        type?: BuilderTargetType;
        conditions: FilterConditionsGroup;
    } | null;
    onClose: () => void;
    onApply: (conditions: FilterConditionsGroup) => void;
    onSave: (input: {
        id?: number;
        name: string;
        conditions: FilterConditionsGroup;
    }) => Promise<void>;
    onDelete: (id: number) => Promise<void>;
}
export declare function FilterBuilder({ isOpen, targetType, activeFilter, onClose, onApply, onSave, onDelete, }: FilterBuilderProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=FilterBuilder.d.ts.map