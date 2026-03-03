export interface EditIndexerSource {
    id: number;
    name: string;
    implementation: string;
    configContract: string;
    settings: string;
    protocol: string;
    appProfileId?: number | null;
    enabled: boolean;
    supportsRss: boolean;
    supportsSearch: boolean;
    priority: number;
}
export interface EditIndexerDraft {
    id: number;
    name: string;
    implementation: string;
    configContract: string;
    protocol: string;
    appProfileId?: number;
    enabled: boolean;
    supportsRss: boolean;
    supportsSearch: boolean;
    priority: number;
    settings: Record<string, unknown>;
}
interface EditIndexerModalProps {
    isOpen: boolean;
    indexer: EditIndexerSource;
    isSubmitting?: boolean;
    onClose: () => void;
    onSave: (draft: EditIndexerDraft) => void | Promise<void>;
    appProfiles?: Array<{
        id: number;
        name: string;
    }>;
}
export declare function EditIndexerModal({ isOpen, indexer, isSubmitting, onClose, onSave, appProfiles, }: EditIndexerModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=EditIndexerModal.d.ts.map