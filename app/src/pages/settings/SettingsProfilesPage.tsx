import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import { getApiClients } from '@/lib/api/client';
import type { CreateQualityProfileInput, QualityProfileItem } from '@/lib/api/qualityProfileApi';

export function SettingsProfilesPage() {
  const api = useMemo(() => getApiClients(), []);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [customFormats, setCustomFormats] = useState<Array<{ id: number; name: string; conditionCount: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [templateProfileId, setTemplateProfileId] = useState<number | null>(null);
  const [profileNameDrafts, setProfileNameDrafts] = useState<Record<number, string>>({});
  const [newFormatName, setNewFormatName] = useState('');
  const [editingProfile, setEditingProfile] = useState<QualityProfileItem | null>(null);
  const [isEditModalSaving, setIsEditModalSaving] = useState(false);

  const handleSaveEditProfile = async (input: CreateQualityProfileInput) => {
    if (!editingProfile) return;
    setIsEditModalSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.update(editingProfile.id, input);
      await load();
      setMessage(`Updated profile "${input.name}".`);
      setEditingProfile(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update quality profile');
    } finally {
      setIsEditModalSaving(false);
    }
  };

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profiles, formats] = await Promise.all([
        api.qualityProfileApi.list(),
        api.customFormatApi.list(),
      ]);
      setQualityProfiles(profiles);
      setCustomFormats(formats.map(format => ({
        id: format.id,
        name: format.name,
        conditionCount: format.conditions.length,
      })));
      setProfileNameDrafts(Object.fromEntries(profiles.map(profile => [profile.id, profile.name])));
      setTemplateProfileId(current => {
        if (profiles.length === 0) {
          return null;
        }
        if (current === null || !profiles.some(profile => profile.id === current)) {
          return profiles[0].id;
        }
        return current;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load quality settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const onCreateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newProfileName.trim();
    if (!name) {
      return;
    }

    const template = qualityProfiles.find(profile => profile.id === templateProfileId) ?? qualityProfiles[0];
    if (!template) {
      setError('Cannot create a profile until at least one template profile exists.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.create({
        name,
        cutoff: template.cutoff,
        items: template.items,
        languageProfileId: template.languageProfileId,
      });
      setNewProfileName('');
      await load();
      setMessage(`Created quality profile "${name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileName = async (profileId: number) => {
    const name = profileNameDrafts[profileId]?.trim();
    if (!name) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.update(profileId, { name });
      await load();
      setMessage(`Updated profile name to "${name}".`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProfile = async (profileId: number) => {
    const profile = qualityProfiles.find(item => item.id === profileId);
    if (!profile) {
      return;
    }

    const confirmed = window.confirm(`Delete quality profile "${profile.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.delete(profileId);
      await load();
      setMessage(`Deleted profile "${profile.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const onCreateCustomFormat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newFormatName.trim();
    if (!name) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.create({
        name,
        includeCustomFormatWhenRenaming: false,
        conditions: [
          {
            type: 'regex',
            field: 'title',
            operator: 'contains',
            value: name,
            negate: false,
            required: false,
          },
        ],
        scores: [],
      });
      setNewFormatName('');
      await load();
      setMessage(`Created custom format "${name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create custom format');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomFormat = async (formatId: number) => {
    const format = customFormats.find(item => item.id === formatId);
    if (!format) {
      return;
    }

    const confirmed = window.confirm(`Delete custom format "${format.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.delete(formatId);
      await load();
      setMessage(`Deleted custom format "${format.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete custom format');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Profiles & Quality" description="Unified quality definitions, profiles, and custom formats shared globally.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading quality settings...</p> : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Quality Profiles</h2>
          <form className="mt-3 grid gap-2 lg:grid-cols-5" onSubmit={event => { void onCreateProfile(event); }}>
            <input
              value={newProfileName}
              onChange={event => setNewProfileName(event.target.value)}
              placeholder="New profile name"
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm lg:col-span-2"
              required
            />
            <select
              value={templateProfileId ?? ''}
              onChange={event => setTemplateProfileId(Number(event.target.value))}
              className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm lg:col-span-2"
              disabled={qualityProfiles.length === 0}
            >
              {qualityProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>Template: {profile.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={isSaving || qualityProfiles.length === 0}>
              Add
            </button>
          </form>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {qualityProfiles.length === 0 ? <li>No quality profiles found.</li> : qualityProfiles.map(profile => (
              <li key={profile.id} className="rounded-sm border border-border-subtle bg-surface-0 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={profileNameDrafts[profile.id] ?? profile.name}
                    onChange={event => {
                      setProfileNameDrafts(current => ({ ...current, [profile.id]: event.target.value }));
                    }}
                    className="min-w-44 flex-1 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-sm text-text-primary"
                  />
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                    onClick={() => {
                      void saveProfileName(profile.id);
                    }}
                    disabled={isSaving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                    onClick={() => setEditingProfile(profile)}
                    disabled={isSaving}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                    onClick={() => {
                      void deleteProfile(profile.id);
                    }}
                    disabled={isSaving}
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-2 text-xs text-text-secondary">Allowed qualities: {profile.items.filter(item => item.allowed).length} | Cutoff quality id: {profile.cutoff}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Custom Formats</h2>
          <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => { void onCreateCustomFormat(event); }}>
            <input
              value={newFormatName}
              onChange={event => setNewFormatName(event.target.value)}
              placeholder="New custom format name"
              className="min-w-44 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
              required
            />
            <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={isSaving}>Add</button>
          </form>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {customFormats.length === 0 ? <li>No custom formats found.</li> : customFormats.map(format => (
              <li key={format.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle bg-surface-0 p-3">
                <div>
                  <p className="font-medium text-text-primary">{format.name}</p>
                  <p className="text-xs text-text-secondary">Conditions: {format.conditionCount}</p>
                </div>
                <button
                  type="button"
                  className="rounded-sm border border-status-error/60 px-2 py-1 text-xs text-status-error"
                  onClick={() => {
                    void deleteCustomFormat(format.id);
                  }}
                  disabled={isSaving}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </article>
      </section>
      {editingProfile ? (
        <AddProfileModal
          isOpen
          onClose={() => setEditingProfile(null)}
          onSave={handleSaveEditProfile}
          editProfile={editingProfile}
          isLoading={isEditModalSaving}
        />
      ) : null}
    </RouteScaffold>
  );
}
