import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { AddProfileModal } from '@/components/settings/AddProfileModal';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiClients } from '@/lib/api/client';
import type { CreateQualityProfileInput, QualityProfileItem } from '@/lib/api/qualityProfileApi';

const createProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required'),
  templateProfileId: z.coerce.number(),
});
type CreateProfileValues = z.infer<typeof createProfileSchema>;

const createFormatSchema = z.object({
  name: z.string().min(1, 'Format name is required'),
});
type CreateFormatValues = z.infer<typeof createFormatSchema>;

export function SettingsProfilesPage() {
  const api = useMemo(() => getApiClients(), []);
  const [qualityProfiles, setQualityProfiles] = useState<QualityProfileItem[]>([]);
  const [customFormats, setCustomFormats] = useState<Array<{ id: number; name: string; conditionCount: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileNameDrafts, setProfileNameDrafts] = useState<Record<number, string>>({});
  const [editingProfile, setEditingProfile] = useState<QualityProfileItem | null>(null);
  const [isEditModalSaving, setIsEditModalSaving] = useState(false);

  const createProfileForm = useForm<CreateProfileValues>({
    resolver: zodResolver(createProfileSchema),
    defaultValues: { name: '', templateProfileId: 0 },
  });

  const createFormatForm = useForm<CreateFormatValues>({
    resolver: zodResolver(createFormatSchema),
    defaultValues: { name: '' },
  });

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

      // Set template default to first profile if available
      const currentTemplate = createProfileForm.getValues('templateProfileId');
      if (profiles.length > 0 && (!currentTemplate || !profiles.some(p => p.id === currentTemplate))) {
        createProfileForm.setValue('templateProfileId', profiles[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load quality settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api]);

  const onCreateProfile = async (data: CreateProfileValues) => {
    const template = qualityProfiles.find(profile => profile.id === data.templateProfileId) ?? qualityProfiles[0];
    if (!template) {
      setError('Cannot create a profile until at least one template profile exists.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.qualityProfileApi.create({
        name: data.name,
        cutoff: template.cutoff,
        items: template.items,
        languageProfileId: template.languageProfileId,
      });
      createProfileForm.reset({ name: '', templateProfileId: data.templateProfileId });
      await load();
      setMessage(`Created quality profile "${data.name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create quality profile');
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileName = async (profileId: number) => {
    const name = profileNameDrafts[profileId]?.trim();
    if (!name) return;

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
    if (!profile) return;

    const confirmed = window.confirm(`Delete quality profile "${profile.name}"?`);
    if (!confirmed) return;

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

  const onCreateCustomFormat = async (data: CreateFormatValues) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.customFormatApi.create({
        name: data.name,
        includeCustomFormatWhenRenaming: false,
        conditions: [
          {
            type: 'regex',
            field: 'title',
            operator: 'contains',
            value: data.name,
            negate: false,
            required: false,
          },
        ],
        scores: [],
      });
      createFormatForm.reset({ name: '' });
      await load();
      setMessage(`Created custom format "${data.name}".`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create custom format');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustomFormat = async (formatId: number) => {
    const format = customFormats.find(item => item.id === formatId);
    if (!format) return;

    const confirmed = window.confirm(`Delete custom format "${format.name}"?`);
    if (!confirmed) return;

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
          <Form {...createProfileForm}>
            <form className="mt-3 grid gap-2 lg:grid-cols-5" onSubmit={event => { void createProfileForm.handleSubmit(onCreateProfile)(event); }}>
              <FormField
                control={createProfileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="New profile name"
                        className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createProfileForm.control}
                name="templateProfileId"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <Select
                      onValueChange={(v) => field.onChange(Number(v))}
                      value={String(field.value)}
                      disabled={qualityProfiles.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {qualityProfiles.map(profile => (
                          <SelectItem key={profile.id} value={String(profile.id)}>Template: {profile.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button type="submit" variant="outline" size="sm" disabled={isSaving || qualityProfiles.length === 0}>
                Add
              </Button>
            </form>
          </Form>
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
                  <Button type="button" variant="outline" size="xs" onClick={() => { void saveProfileName(profile.id); }} disabled={isSaving}>
                    Save
                  </Button>
                  <Button type="button" variant="outline" size="xs" onClick={() => setEditingProfile(profile)} disabled={isSaving}>
                    Edit
                  </Button>
                  <Button type="button" variant="destructive" size="xs" onClick={() => { void deleteProfile(profile.id); }} disabled={isSaving}>
                    Delete
                  </Button>
                </div>
                <p className="mt-2 text-xs text-text-secondary">Allowed qualities: {profile.items.filter(item => item.allowed).length} | Cutoff quality id: {profile.cutoff}</p>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
          <h2 className="font-medium">Custom Formats</h2>
          <Form {...createFormatForm}>
            <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => { void createFormatForm.handleSubmit(onCreateCustomFormat)(event); }}>
              <FormField
                control={createFormatForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="min-w-44 flex-1">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="New custom format name"
                        className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="outline" size="sm" disabled={isSaving}>Add</Button>
            </form>
          </Form>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {customFormats.length === 0 ? <li>No custom formats found.</li> : customFormats.map(format => (
              <li key={format.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border-subtle bg-surface-0 p-3">
                <div>
                  <p className="font-medium text-text-primary">{format.name}</p>
                  <p className="text-xs text-text-secondary">Conditions: {format.conditionCount}</p>
                </div>
                <Button type="button" variant="destructive" size="xs" onClick={() => { void deleteCustomFormat(format.id); }} disabled={isSaving}>
                  Delete
                </Button>
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
