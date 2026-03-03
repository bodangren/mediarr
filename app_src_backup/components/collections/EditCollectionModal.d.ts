import type { MovieCollection, CollectionEditForm } from '@/types/collection';
interface EditCollectionModalProps {
    collection: MovieCollection;
    isOpen: boolean;
    onClose: () => void;
    onSave: (collectionId: number, data: CollectionEditForm) => void;
}
export declare function EditCollectionModal({ collection, isOpen, onClose, onSave }: EditCollectionModalProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=EditCollectionModal.d.ts.map