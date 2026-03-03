import type { CreateQualityProfileInput, QualityProfile } from '@/types/qualityProfile';
interface AddProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: CreateQualityProfileInput) => Promise<void> | void;
    editProfile?: QualityProfile;
    customFormatScores?: Array<{
        name: string;
        score: number;
    }>;
    isLoading?: boolean;
}
export declare function AddProfileModal({ isOpen, onClose, onSave, editProfile, customFormatScores, isLoading, }: AddProfileModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=AddProfileModal.d.ts.map