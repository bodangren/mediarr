import type { TestConnectionResult } from '@/components/settings/ConfigurableItemModal';
type DynamicFieldType = 'text' | 'password' | 'number' | 'boolean' | 'hidden';
interface DynamicFieldSchema {
    name: string;
    label: string;
    type: DynamicFieldType;
    required?: boolean;
    defaultValue?: string | number | boolean;
}
export interface IndexerPreset {
    id: string;
    name: string;
    description: string;
    protocol: string;
    implementation: string;
    configContract: string;
    privacy: 'Public' | 'SemiPrivate' | 'Private';
    fields: DynamicFieldSchema[];
}
export interface AddIndexerDraft {
    presetId: string;
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
interface AddIndexerModalProps {
    isOpen: boolean;
    presets: IndexerPreset[];
    isSubmitting?: boolean;
    onClose: () => void;
    onCreate: (draft: AddIndexerDraft) => void | Promise<void>;
    onTestConnection: (draft: AddIndexerDraft) => Promise<TestConnectionResult>;
    appProfiles?: Array<{
        id: number;
        name: string;
    }>;
}
export declare function AddIndexerModal({ isOpen, presets, isSubmitting, onClose, onCreate, onTestConnection, appProfiles, }: AddIndexerModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AddIndexerModal.d.ts.map