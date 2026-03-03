export interface QueueRemoveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (options: QueueRemoveOptions) => void;
    itemTitle: string;
    isConfirming?: boolean;
}
export interface QueueRemoveOptions {
    blockRelease: boolean;
    addToImportExclusions: boolean;
    ignoreMovie: boolean;
    deleteFiles: boolean;
}
export declare function QueueRemoveModal({ isOpen, onClose, onConfirm, itemTitle, isConfirming, }: QueueRemoveModalProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=QueueRemoveModal.d.ts.map