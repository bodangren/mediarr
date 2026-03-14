
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/primitives/Alert';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import type {
  ImportList,
  CreateImportListInput,
  UpdateImportListInput,
  TMDBPopularConfig,
  TMDBListConfig,
} from '@/lib/api/importListsApi';
import type { QualityProfile } from '@/types/qualityProfile';

interface ImportListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateImportListInput | UpdateImportListInput) => Promise<void> | void;
  editList?: ImportList | null;
  isLoading?: boolean;
  qualityProfiles: QualityProfile[];
}

const PROVIDER_TYPES = [
  { value: 'tmdb-popular', label: 'TMDB Popular' },
  { value: 'tmdb-list', label: 'TMDB List' },
];

const MEDIA_TYPES = [
  { value: 'movie', label: 'Movies' },
  { value: 'series', label: 'TV Series' },
  { value: 'both', label: 'Both' },
];

const MONITOR_TYPES = [
  { value: 'movie', label: 'Movie Only' },
  { value: 'collection', label: 'Collection' },
  { value: 'none', label: 'None' },
];

const DEFAULT_TMDB_POPULAR_CONFIG: TMDBPopularConfig = {
  mediaType: 'movie',
  limit: 20,
};

const DEFAULT_TMDB_LIST_CONFIG: TMDBListConfig = {
  listId: '',
};

export function ImportListModal({
  isOpen,
  onClose,
  onSave,
  editList,
  isLoading = false,
  qualityProfiles,
}: ImportListModalProps) {
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState('tmdb-popular');
  const [enabled, setEnabled] = useState(true);
  const [rootFolderPath, setRootFolderPath] = useState('');
  const [qualityProfileId, setQualityProfileId] = useState<number | undefined>();
  const [monitorType, setMonitorType] = useState('movie');
  const [syncInterval, setSyncInterval] = useState(24);

  // TMDB Popular config
  const [tmdbPopularMediaType, setTmdbPopularMediaType] = useState<TMDBPopularConfig['mediaType']>('movie');
  const [tmdbPopularLimit, setTmdbPopularLimit] = useState(20);

  // TMDB List config
  const [tmdbListId, setTmdbListId] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editList) {
        setName(editList.name);
        setProviderType(editList.providerType);
        setEnabled(editList.enabled);
        setRootFolderPath(editList.rootFolderPath);
        setQualityProfileId(editList.qualityProfileId);
        setMonitorType(editList.monitorType);
        setSyncInterval(editList.syncInterval);

        // Parse provider-specific config
        const config = editList.config as Record<string, unknown>;
        if (editList.providerType === 'tmdb-popular') {
          setTmdbPopularMediaType((config.mediaType as TMDBPopularConfig['mediaType']) ?? 'movie');
          setTmdbPopularLimit((config.limit as number) ?? 20);
        } else if (editList.providerType === 'tmdb-list') {
          setTmdbListId((config.listId as string) ?? '');
        }
      } else {
        // Reset to defaults
        setName('');
        setProviderType('tmdb-popular');
        setEnabled(true);
        setRootFolderPath('');
        setQualityProfileId(qualityProfiles[0]?.id);
        setMonitorType('movie');
        setSyncInterval(24);
        setTmdbPopularMediaType('movie');
        setTmdbPopularLimit(20);
        setTmdbListId('');
      }
    }
  }, [isOpen, editList, qualityProfiles]);

  const handleSave = async () => {
    if (!name.trim() || !rootFolderPath.trim() || !qualityProfileId) {
      return;
    }

    // Build provider-specific config
    let config: Record<string, unknown>;
    if (providerType === 'tmdb-popular') {
      config = {
        mediaType: tmdbPopularMediaType,
        limit: tmdbPopularLimit,
      };
    } else if (providerType === 'tmdb-list') {
      config = {
        listId: tmdbListId,
      };
    } else {
      config = {};
    }

    const input: CreateImportListInput = {
      name: name.trim(),
      providerType,
      config,
      rootFolderPath: rootFolderPath.trim(),
      qualityProfileId,
      monitorType,
      enabled,
      syncInterval,
    };

    await onSave(input);
  };

  const canSave = name.trim() !== '' && rootFolderPath.trim() !== '' && qualityProfileId !== undefined;

  const renderProviderConfig = () => {
    if (providerType === 'tmdb-popular') {
      return (
        <div className="space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-3">
          <h4 className="text-sm font-medium">TMDB Popular Settings</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span>Media Type</span>
              <select
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                value={tmdbPopularMediaType}
                onChange={(e) => setTmdbPopularMediaType(e.target.value as TMDBPopularConfig['mediaType'])}
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span>Limit</span>
              <input
                type="number"
                min={1}
                max={100}
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
                value={tmdbPopularLimit}
                onChange={(e) => setTmdbPopularLimit(parseInt(e.target.value, 10) || 20)}
              />
              <span className="text-xs text-text-muted">Max items to import (1-100)</span>
            </label>
          </div>
        </div>
      );
    }

    if (providerType === 'tmdb-list') {
      return (
        <div className="space-y-3 rounded-sm border border-border-subtle bg-surface-0 p-3">
          <h4 className="text-sm font-medium">TMDB List Settings</h4>
          <label className="grid gap-1 text-sm">
            <span>List ID</span>
            <input
              type="text"
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              placeholder="e.g., 1, 706, or list slug"
              value={tmdbListId}
              onChange={(e) => setTmdbListId(e.target.value)}
            />
            <span className="text-xs text-text-muted">
              Enter the TMDB list ID or slug from the list URL
            </span>
          </label>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      ariaLabel={editList ? 'Edit Import List' : 'Add Import List'}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
    >
      <ModalHeader title={editList ? 'Edit Import List' : 'Add Import List'} onClose={onClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="list-name" className="block text-sm font-medium text-text-primary">
              Name <span className="text-accent-danger">*</span>
            </label>
            <input
              id="list-name"
              type="text"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              placeholder="e.g., TMDB Top Movies"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Provider Type */}
          <div>
            <label htmlFor="provider-type" className="block text-sm font-medium text-text-primary">
              Provider Type <span className="text-accent-danger">*</span>
            </label>
            <select
              id="provider-type"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value)}
            >
              {PROVIDER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Provider-specific config */}
          {renderProviderConfig()}

          {/* Root Folder Path */}
          <div>
            <label htmlFor="root-folder" className="block text-sm font-medium text-text-primary">
              Root Folder Path <span className="text-accent-danger">*</span>
            </label>
            <input
              id="root-folder"
              type="text"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              placeholder="e.g., /movies"
              value={rootFolderPath}
              onChange={(e) => setRootFolderPath(e.target.value)}
            />
          </div>

          {/* Quality Profile */}
          <div>
            <label htmlFor="quality-profile" className="block text-sm font-medium text-text-primary">
              Quality Profile <span className="text-accent-danger">*</span>
            </label>
            <select
              id="quality-profile"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={qualityProfileId ?? ''}
              onChange={(e) => setQualityProfileId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
            >
              <option value="">Select a profile</option>
              {qualityProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monitor Type */}
          <div>
            <label htmlFor="monitor-type" className="block text-sm font-medium text-text-primary">
              Monitor Type
            </label>
            <select
              id="monitor-type"
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={monitorType}
              onChange={(e) => setMonitorType(e.target.value)}
            >
              {MONITOR_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-muted">
              Determines how items from this list are monitored
            </p>
          </div>

          {/* Sync Interval */}
          <div>
            <label htmlFor="sync-interval" className="block text-sm font-medium text-text-primary">
              Sync Interval (hours)
            </label>
            <input
              id="sync-interval"
              type="number"
              min={1}
              max={168}
              className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm outline-none focus:border-accent-primary"
              value={syncInterval}
              onChange={(e) => setSyncInterval(parseInt(e.target.value, 10) || 24)}
            />
            <p className="mt-1 text-xs text-text-muted">
              How often to sync this list (1-168 hours)
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center gap-2">
            <input
              id="enabled"
              type="checkbox"
              className="h-4 w-4 rounded border-border-subtle"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <label htmlFor="enabled" className="text-sm text-text-primary">
              Enable this import list
            </label>
          </div>

          {!canSave && (
            <Alert variant="warning">
              Please fill in all required fields (Name, Root Folder Path, Quality Profile).
            </Alert>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleSave} disabled={!canSave || isLoading}>
          {isLoading ? 'Saving...' : editList ? 'Save Changes' : 'Add Import List'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
