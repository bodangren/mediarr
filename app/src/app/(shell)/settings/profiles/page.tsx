'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal, Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/primitives/Modal';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import type { QualityProfile } from '@/types/qualityProfile';
import { formatQuality, sortQualitiesByRank } from '@/types/qualityProfile';
import type { CustomFormat } from '@/types/customFormat';
import type { AppProfileItem, AppProfileInput } from '@/lib/api/appProfilesApi';
import { useQueryClient } from '@tanstack/react-query';

function formatCutoff(profile: QualityProfile): string {
  const cutoff = profile.qualities.find(q => q.id === profile.cutoffId);
  return cutoff ? formatQuality(cutoff) : 'None';
}

function getQualitySummary(profile: QualityProfile): string {
  if (profile.qualities.length === 0) {
    return 'No qualities';
  }

  const sorted = sortQualitiesByRank(profile.qualities);
  const qualities = sorted.map(formatQuality);

  if (qualities.length <= 3) {
    return qualities.join(', ');
  }

  return `${qualities.slice(0, 3).join(', ')} (+${qualities.length - 3} more)`;
}

function getCustomFormatScoresForProfile(
  profileId: number,
  customFormats: CustomFormat[],
): Array<{ name: string; score: number }> {
  return customFormats
    .map((format) => {
      const matchedScore = format.scores.find(score => score.qualityProfileId === profileId);
      return matchedScore ? { name: format.name, score: matchedScore.score } : null;
    })
    .filter((item): item is { name: string; score: number } => item !== null);
}

export default function QualityProfilesPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<QualityProfile | undefined>(undefined);
  const [deleteProfile, setDeleteProfile] = useState<QualityProfile | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isAppProfileModalOpen, setIsAppProfileModalOpen] = useState(false);
  const [editingAppProfile, setEditingAppProfile] = useState<AppProfileItem | null>(null);
  const [deletingAppProfile, setDeletingAppProfile] = useState<AppProfileItem | null>(null);
  const [appProfileDraft, setAppProfileDraft] = useState<AppProfileInput>({
    name: '',
    enableRss: true,
    enableInteractiveSearch: true,
    enableAutomaticSearch: true,
    minimumSeeders: 0,
  });

  const { data: profiles = [], isLoading, error, refetch } = useApiQuery<QualityProfile[]>({
    queryKey: queryKeys.qualityProfiles(),
    queryFn: () => getApiClients().qualityProfileApi.list(),
  });

  const { data: appProfiles = [], isLoading: isAppProfilesLoading } = useApiQuery<AppProfileItem[]>({
    queryKey: queryKeys.appProfiles(),
    queryFn: () => getApiClients().appProfilesApi.list(),
  });

  const { data: customFormats = [] } = useApiQuery<CustomFormat[]>({
    queryKey: queryKeys.customFormats(),
    queryFn: () => getApiClients().customFormatApi.list(),
  });

  const handleAddProfile = async (input: { name: string; cutoffId: number; qualities: Array<{ resolution: string; source: string }>; languageProfileId?: number }) => {
    setIsSaving(true);
    try {
      await getApiClients().qualityProfileApi.create(input);
      pushToast({
        title: 'Success',
        message: 'Quality profile created successfully',
        variant: 'success',
      });
      setIsAddModalOpen(false);
      refetch();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: 'Failed to create quality profile',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProfile = async (input: { name: string; cutoffId: number; qualities: Array<{ resolution: string; source: string }>; languageProfileId?: number }) => {
    if (!editProfile) return;

    setIsSaving(true);
    try {
      await getApiClients().qualityProfileApi.update(editProfile.id, input);
      pushToast({
        title: 'Success',
        message: 'Quality profile updated successfully',
        variant: 'success',
      });
      setIsAddModalOpen(false);
      setEditProfile(undefined);
      refetch();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: 'Failed to update quality profile',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!deleteProfile) return;

    setIsSaving(true);
    try {
      await getApiClients().qualityProfileApi.delete(deleteProfile.id);
      pushToast({
        title: 'Success',
        message: 'Quality profile deleted successfully',
        variant: 'success',
      });
      setDeleteProfile(undefined);
      refetch();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: 'Failed to delete quality profile',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setEditProfile(undefined);
    setIsAddModalOpen(true);
  };

  const openEditModal = (profile: QualityProfile) => {
    setEditProfile(profile);
    setIsAddModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setEditProfile(undefined);
    setDeleteProfile(undefined);
  };

  const openCreateAppProfile = () => {
    setEditingAppProfile(null);
    setAppProfileDraft({
      name: '',
      enableRss: true,
      enableInteractiveSearch: true,
      enableAutomaticSearch: true,
      minimumSeeders: 0,
    });
    setIsAppProfileModalOpen(true);
  };

  const openEditAppProfile = (profile: AppProfileItem) => {
    setEditingAppProfile(profile);
    setAppProfileDraft({
      name: profile.name,
      enableRss: profile.enableRss,
      enableInteractiveSearch: profile.enableInteractiveSearch,
      enableAutomaticSearch: profile.enableAutomaticSearch,
      minimumSeeders: profile.minimumSeeders,
    });
    setIsAppProfileModalOpen(true);
  };

  const saveAppProfile = async () => {
    if (!appProfileDraft.name?.trim()) {
      pushToast({ title: 'Validation failed', message: 'Name is required', variant: 'error' });
      return;
    }

    try {
      if (editingAppProfile) {
        await getApiClients().appProfilesApi.update(editingAppProfile.id, appProfileDraft);
        pushToast({ title: 'Profile updated', variant: 'success' });
      } else {
        await getApiClients().appProfilesApi.create(appProfileDraft);
        pushToast({ title: 'Profile created', variant: 'success' });
      }
      setIsAppProfileModalOpen(false);
      setEditingAppProfile(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.appProfiles() });
    } catch (err) {
      pushToast({ title: 'Save failed', message: 'Could not save app profile', variant: 'error' });
    }
  };

  const cloneAppProfile = async (profile: AppProfileItem) => {
    try {
      await getApiClients().appProfilesApi.clone(profile.id);
      pushToast({ title: 'Profile cloned', variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.appProfiles() });
    } catch {
      pushToast({ title: 'Clone failed', variant: 'error' });
    }
  };

  const deleteAppProfile = async () => {
    if (!deletingAppProfile) {
      return;
    }

    try {
      await getApiClients().appProfilesApi.remove(deletingAppProfile.id);
      setDeletingAppProfile(null);
      pushToast({ title: 'Profile deleted', variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.appProfiles() });
    } catch {
      pushToast({ title: 'Delete failed', variant: 'error' });
    }
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Quality Profiles</h1>
        <p className="text-sm text-text-secondary">
          Manage quality profiles for controlling download quality preferences.
        </p>
      </header>

      {/* Add Profile Button */}
      <div>
        <Button variant="primary" onClick={openAddModal}>
          Add New Profile
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="danger">
          <p>Failed to load quality profiles. Please try again later.</p>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Loading quality profiles...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && profiles.length === 0 && (
        <Alert variant="info">
          <p>No quality profiles configured. Click "Add New Profile" to create one.</p>
        </Alert>
      )}

      {/* Profiles List */}
      {!isLoading && !error && profiles.length > 0 && (
        <div className="space-y-3">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="rounded-sm border border-border-subtle bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-text-primary">{profile.name}</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <div>
                      <span className="text-text-muted">Cutoff:</span>{' '}
                      <span className="font-medium text-accent-primary">{formatCutoff(profile)}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Qualities:</span>{' '}
                      <span className="text-text-secondary">{getQualitySummary(profile)}</span>
                    </div>
                    {profile.languageProfileId && (
                      <div>
                        <span className="text-text-muted">Language Profile:</span>{' '}
                        <span className="text-text-secondary">ID {profile.languageProfileId}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => openEditModal(profile)}
                    className="text-sm"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => setDeleteProfile(profile)}
                    className="text-sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddProfileModal
        isOpen={isAddModalOpen}
        onClose={closeModals}
        onSave={editProfile ? handleEditProfile : handleAddProfile}
        editProfile={editProfile}
        customFormatScores={
          editProfile ? getCustomFormatScoresForProfile(editProfile.id, customFormats) : []
        }
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deleteProfile && (
        <ConfirmModal
          isOpen
          title="Delete Quality Profile"
          description={
            <div className="space-y-2">
              <p>
                Are you sure you want to delete the quality profile <strong>{deleteProfile.name}</strong>?
              </p>
              <p className="text-xs text-text-muted">
                This action cannot be undone. Make sure no series or movies are using this profile.
              </p>
            </div>
          }
          onCancel={() => setDeleteProfile(undefined)}
          onConfirm={handleDeleteProfile}
          cancelLabel="Cancel"
          confirmLabel="Delete Profile"
          confirmVariant="danger"
          isConfirming={isSaving}
        />
      )}

      <section className="space-y-3 rounded-sm border border-border-subtle bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">App Profiles</h2>
            <p className="text-xs text-text-secondary">Configure indexer-level RSS/search profile behavior.</p>
          </div>
          <Button onClick={openCreateAppProfile}>Add App Profile</Button>
        </div>

        {isAppProfilesLoading ? (
          <p className="text-sm text-text-secondary">Loading app profiles...</p>
        ) : null}

        {!isAppProfilesLoading && appProfiles.length === 0 ? (
          <Alert variant="info">
            <p>No app profiles configured yet.</p>
          </Alert>
        ) : null}

        {appProfiles.map((profile) => (
          <div key={profile.id} className="rounded-sm border border-border-subtle bg-surface-0 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{profile.name}</p>
                <p className="text-xs text-text-muted">
                  RSS: {profile.enableRss ? 'On' : 'Off'} | Interactive: {profile.enableInteractiveSearch ? 'On' : 'Off'} | Automatic: {profile.enableAutomaticSearch ? 'On' : 'Off'} | Min Seeders: {profile.minimumSeeders}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="text-xs" onClick={() => openEditAppProfile(profile)}>Edit</Button>
                <Button variant="secondary" className="text-xs" onClick={() => cloneAppProfile(profile)}>Clone</Button>
                <Button variant="danger" className="text-xs" onClick={() => setDeletingAppProfile(profile)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <Modal
        isOpen={isAppProfileModalOpen}
        ariaLabel="App profile modal"
        onClose={() => setIsAppProfileModalOpen(false)}
        maxWidthClassName="max-w-lg"
      >
        <ModalHeader
          title={editingAppProfile ? 'Edit App Profile' : 'Add App Profile'}
          onClose={() => setIsAppProfileModalOpen(false)}
        />
        <ModalBody>
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span>Name</span>
              <input
                type="text"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={appProfileDraft.name ?? ''}
                onChange={(event) => setAppProfileDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(appProfileDraft.enableRss)}
                onChange={(event) => setAppProfileDraft((current) => ({ ...current, enableRss: event.target.checked }))}
              />
              Enable RSS
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(appProfileDraft.enableInteractiveSearch)}
                onChange={(event) => setAppProfileDraft((current) => ({ ...current, enableInteractiveSearch: event.target.checked }))}
              />
              Enable Interactive Search
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(appProfileDraft.enableAutomaticSearch)}
                onChange={(event) => setAppProfileDraft((current) => ({ ...current, enableAutomaticSearch: event.target.checked }))}
              />
              Enable Automatic Search
            </label>
            <label className="grid gap-1 text-sm">
              <span>Minimum Seeders</span>
              <input
                type="number"
                className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
                value={appProfileDraft.minimumSeeders ?? 0}
                onChange={(event) => setAppProfileDraft((current) => ({
                  ...current,
                  minimumSeeders: Number.parseInt(event.target.value, 10) || 0,
                }))}
              />
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsAppProfileModalOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { void saveAppProfile(); }}>Save</Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        isOpen={deletingAppProfile !== null}
        title="Delete app profile"
        description={`Delete ${deletingAppProfile?.name ?? 'app profile'}?`}
        onCancel={() => setDeletingAppProfile(null)}
        onConfirm={() => { void deleteAppProfile(); }}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </section>
  );
}
