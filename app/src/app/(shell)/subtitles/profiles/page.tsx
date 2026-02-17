'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/Button';
import { Alert } from '@/components/primitives/Alert';
import { ConfirmModal } from '@/components/primitives/Modal';
import { ProfileEditorModal } from '@/components/subtitles/ProfileEditorModal';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useToast } from '@/components/providers/ToastProvider';
import type { LanguageProfile, LanguageProfileInput } from '@/lib/api/languageProfilesApi';
import { getLanguageName } from '@/lib/constants/languages';
import { LanguageBadge } from '@/components/subtitles/LanguageBadge';

export default function LanguageProfilesPage() {
  const { pushToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<LanguageProfile | undefined>(undefined);
  const [deleteProfile, setDeleteProfile] = useState<LanguageProfile | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const { data: profiles = [], isLoading, error, refetch } = useApiQuery<LanguageProfile[]>({
    queryKey: queryKeys.languageProfiles(),
    queryFn: () => getApiClients().languageProfilesApi.listProfiles(),
  });

  const handleCreateProfile = async (input: LanguageProfileInput) => {
    setIsSaving(true);
    try {
      await getApiClients().languageProfilesApi.createProfile(input);
      pushToast({
        title: 'Success',
        message: 'Language profile created successfully',
        variant: 'success',
      });
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: 'Failed to create language profile',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProfile = async (input: LanguageProfileInput) => {
    if (!editProfile) return;

    setIsSaving(true);
    try {
      await getApiClients().languageProfilesApi.updateProfile(editProfile.id, input);
      pushToast({
        title: 'Success',
        message: 'Language profile updated successfully',
        variant: 'success',
      });
      setIsModalOpen(false);
      setEditProfile(undefined);
      refetch();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: 'Failed to update language profile',
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
      await getApiClients().languageProfilesApi.deleteProfile(deleteProfile.id);
      pushToast({
        title: 'Success',
        message: 'Language profile deleted successfully',
        variant: 'success',
      });
      setDeleteProfile(undefined);
      refetch();
    } catch (err) {
      pushToast({
        title: 'Error',
        message: 'Failed to delete language profile',
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setEditProfile(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (profile: LanguageProfile) => {
    setEditProfile(profile);
    setIsModalOpen(true);
  };

  const closeModals = () => {
    setIsModalOpen(false);
    setEditProfile(undefined);
    setDeleteProfile(undefined);
  };

  const formatLanguages = (languages: typeof profiles[0]['languages']) => {
    return languages.map(lang => (
      <LanguageBadge
        key={lang.languageCode}
        languageCode={lang.languageCode}
        variant="available"
        isForced={lang.isForced}
        isHi={lang.isHi}
        className="mr-1"
      />
    ));
  };

  const formatCutoff = (profile: LanguageProfile) => {
    if (!profile.cutoff) return 'None';
    const lang = profile.languages.find(l => l.languageCode === profile.cutoff);
    if (!lang) return profile.cutoff;
    return `${getLanguageName(lang.languageCode)} (${lang.languageCode})`;
  };

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Language Profiles</h1>
        <p className="text-sm text-text-secondary">
          Manage language profiles for controlling subtitle download preferences and quality settings.
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
          <p>Failed to load language profiles. Please try again later.</p>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-sm border border-border-subtle bg-surface-1 p-4">
          <p className="text-sm text-text-secondary">Loading language profiles...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && profiles.length === 0 && (
        <Alert variant="info">
          <p>No language profiles configured. Click "Add New Profile" to create one.</p>
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
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex flex-wrap gap-y-1">
                      <span className="text-text-muted">Languages:</span>
                      <div className="ml-2 flex flex-wrap">
                        {formatLanguages(profile.languages)}
                      </div>
                    </div>
                    <div>
                      <span className="text-text-muted">Cutoff:</span>{' '}
                      <span className="font-medium text-accent-primary">{formatCutoff(profile)}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Upgrade Allowed:</span>{' '}
                      <span className={profile.upgradeAllowed ? 'text-accent-success' : 'text-text-muted'}>
                        {profile.upgradeAllowed ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {profile.mustContain.length > 0 && (
                      <div>
                        <span className="text-text-muted">Must Contain:</span>{' '}
                        <span className="text-text-secondary">{profile.mustContain.join(', ')}</span>
                      </div>
                    )}
                    {profile.mustNotContain.length > 0 && (
                      <div>
                        <span className="text-text-muted">Must Not Contain:</span>{' '}
                        <span className="text-text-secondary">{profile.mustNotContain.join(', ')}</span>
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
      <ProfileEditorModal
        isOpen={isModalOpen}
        onClose={closeModals}
        onSave={editProfile ? handleUpdateProfile : handleCreateProfile}
        profile={editProfile}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Modal */}
      {deleteProfile && (
        <ConfirmModal
          isOpen
          title="Delete Language Profile"
          description={
            <div className="space-y-2">
              <p>
                Are you sure you want to delete the language profile{' '}
                <strong>{deleteProfile.name}</strong>?
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
