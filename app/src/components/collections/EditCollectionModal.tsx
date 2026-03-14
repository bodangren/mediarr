
import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/primitives/Modal';
import type { MovieCollection, CollectionEditForm } from '@/types/collection';

interface EditCollectionModalProps {
  collection: MovieCollection;
  qualityProfiles: { id: number; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (collectionId: number, data: CollectionEditForm) => void;
}

export function EditCollectionModal({ collection, qualityProfiles, isOpen, onClose, onSave }: EditCollectionModalProps) {
  const [formData, setFormData] = useState<CollectionEditForm>({
    name: collection.name,
    overview: collection.overview ?? '',
    monitored: collection.monitored,
    minimumAvailability: collection.minimumAvailability ?? 'released',
    qualityProfileId: collection.qualityProfileId ?? 0,
    rootFolder: collection.rootFolderPath ?? '',
    searchOnAdd: collection.searchOnAdd ?? true,
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(collection.id, formData);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} ariaLabel="Edit Collection" onClose={onClose} maxWidthClassName="max-w-lg">
      <ModalHeader title="Edit Collection" onClose={onClose} />
      <ModalBody>
        <form id="edit-collection-form" onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Collection Name</span>
            <input
              type="text"
              value={formData.name}
              onChange={event => { const value = event.currentTarget.value; setFormData(current => ({ ...current, name: value })); }}
              required
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              placeholder="Enter collection name"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Overview</span>
            <textarea
              value={formData.overview}
              onChange={event => { const value = event.currentTarget.value; setFormData(current => ({ ...current, overview: value })); }}
              rows={3}
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 resize-y"
              placeholder="Enter collection overview"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Minimum Availability</span>
              <select
                value={formData.minimumAvailability}
                onChange={event => {
                  const value = event.currentTarget.value;
                  setFormData(current => ({ ...current, minimumAvailability: value }));
                }}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              >
                <option value="announced">Announced</option>
                <option value="inCinemas">In Cinemas</option>
                <option value="released">Released</option>
                <option value="preDB">PreDB</option>
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">Quality Profile</span>
              <select
                value={formData.qualityProfileId}
                onChange={event => {
                  const value = Number.parseInt(event.currentTarget.value, 10);
                  setFormData(current => ({ ...current, qualityProfileId: value }));
                }}
                className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              >
                {qualityProfiles.map(profile => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Root Folder</span>
            <input
              type="text"
              value={formData.rootFolder}
              onChange={event => { const value = event.currentTarget.value; setFormData(current => ({ ...current, rootFolder: value })); }}
              required
              className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
              placeholder="/path/to/movies"
            />
          </label>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="searchOnAdd"
              checked={formData.searchOnAdd}
              onChange={event => { const checked = event.currentTarget.checked; setFormData(current => ({ ...current, searchOnAdd: checked })); }}
              className="rounded-sm border-border-subtle bg-surface-0"
            />
            <label htmlFor="searchOnAdd" className="text-sm text-text-primary">
              Search for missing movies when adding collection
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="monitored"
              checked={formData.monitored}
              onChange={event => { const checked = event.currentTarget.checked; setFormData(current => ({ ...current, monitored: checked })); }}
              className="rounded-sm border-border-subtle bg-surface-0"
            />
            <label htmlFor="monitored" className="text-sm text-text-primary">
              Monitored
            </label>
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-border-subtle px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="edit-collection-form"
          className="rounded-sm bg-accent-primary px-3 py-1.5 text-sm text-text-on-accent hover:bg-accent-primary/90"
        >
          Save Changes
        </button>
      </ModalFooter>
    </Modal>
  );
}
