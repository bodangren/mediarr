import type { ImportList, CreateImportListInput, UpdateImportListInput } from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';
interface ImportListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (input: CreateImportListInput | UpdateImportListInput) => Promise<void> | void;
    editList?: ImportList | null;
    isLoading?: boolean;
    qualityProfiles: QualityProfile[];
}
export declare function ImportListModal({ isOpen, onClose, onSave, editList, isLoading, qualityProfiles, }: ImportListModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=ImportListModal.d.ts.map