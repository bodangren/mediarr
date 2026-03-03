import type { CustomFormat, CreateCustomFormatInput, UpdateCustomFormatInput } from '@/types/customFormat';
interface CustomFormatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (format: CreateCustomFormatInput | UpdateCustomFormatInput) => Promise<void> | void;
    editFormat?: CustomFormat;
    isLoading?: boolean;
}
export declare function CustomFormatModal({ isOpen, onClose, onSave, editFormat, isLoading, }: CustomFormatModalProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=CustomFormatModal.d.ts.map