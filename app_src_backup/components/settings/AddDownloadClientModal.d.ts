import type { TestConnectionResult } from '@/components/settings/ConfigurableItemModal';
import type { DownloadClientDraft, DownloadClientType } from '@/types/downloadClient';
export interface DownloadClientPreset {
    id: DownloadClientType;
    name: string;
    description: string;
    implementation: string;
    configContract: string;
    protocol: string;
    defaultPort: number;
    requiresAuth: boolean;
}
export interface AddDownloadClientProps {
    isOpen: boolean;
    presets?: DownloadClientPreset[];
    isSubmitting?: boolean;
    onClose: () => void;
    onCreate: (draft: DownloadClientDraft) => void | Promise<void>;
    onTestConnection: (draft: DownloadClientDraft) => Promise<TestConnectionResult>;
}
export declare function AddDownloadClientModal({ isOpen, presets, isSubmitting, onClose, onCreate, onTestConnection, }: AddDownloadClientProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AddDownloadClientModal.d.ts.map