import type { CreateExclusionInput, ImportListExclusion } from '@/lib/api/importListsApi';
interface AddExclusionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (input: CreateExclusionInput) => Promise<void> | void;
    existingExclusions: ImportListExclusion[];
    isLoading?: boolean;
}
export declare function AddExclusionModal({ isOpen, onClose, onAdd, existingExclusions, isLoading, }: AddExclusionModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AddExclusionModal.d.ts.map