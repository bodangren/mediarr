import type { LanguageProfile, LanguageProfileInput } from '@/lib/api/languageProfilesApi';
export interface ProfileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (input: LanguageProfileInput) => Promise<void>;
    profile?: LanguageProfile;
    isLoading?: boolean;
}
export declare function ProfileEditorModal({ isOpen, onClose, onSave, profile, isLoading, }: ProfileEditorModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ProfileEditorModal.d.ts.map