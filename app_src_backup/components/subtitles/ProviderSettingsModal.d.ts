import { type SubtitleProvider, type ProviderSettings, type ProviderTestResult } from '@/lib/api';
export interface ProviderSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider: SubtitleProvider | null;
    onSave: (providerId: string, settings: ProviderSettings) => Promise<void>;
    onTest: (providerId: string) => Promise<ProviderTestResult>;
    onReset: (providerId: string) => Promise<SubtitleProvider>;
    isSaving?: boolean;
}
export declare function ProviderSettingsModal({ isOpen, onClose, provider, onSave, onTest, onReset, isSaving, }: ProviderSettingsModalProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=ProviderSettingsModal.d.ts.map