'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal } from '@/components/primitives/Modal';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import type { QualityProfile } from '@/types/qualityProfile';
import { formatQuality, sortQualitiesByRank } from '@/types/qualityProfile';

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

export default function QualityProfilesPage() {
  const { pushToast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<QualityProfile | undefined>(undefined);
  const [deleteProfile, setDeleteProfile] = useState<QualityProfile | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const { data: profiles = [], isLoading, error, refetch } = useApiQuery<QualityProfile[]>({
    queryKey: queryKeys.qualityProfiles(),
    queryFn: () => getApiClients().qualityProfileApi.list(),
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
    </section>
  );
}
