import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Folder } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

const mediaSettingsSchema = z.object({
  movieRootFolder: z.string().min(1, 'Movie root folder is required'),
  tvRootFolder: z.string().min(1, 'TV root folder is required'),
});

type MediaSettingsValues = z.infer<typeof mediaSettingsSchema>;

export function SettingsMediaPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeBrowser, setActiveBrowser] = useState<'movie' | 'tv' | null>(null);
  const [movieFolderStatus, setMovieFolderStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);
  const [tvFolderStatus, setTvFolderStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);

  const form = useForm<MediaSettingsValues>({
    resolver: zodResolver(mediaSettingsSchema),
    defaultValues: { movieRootFolder: '', tvRootFolder: '' },
  });

  const validateDirectory = useCallback(
    async (path: string, setStatus: (s: 'writable' | 'readonly' | 'notfound') => void) => {
      try {
        const result = await api.filesystemApi.list(path);
        setStatus(result.writable ? 'writable' : 'readonly');
      } catch {
        setStatus('notfound');
      }
    },
    [api.filesystemApi],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await api.mediaManagementApi.get();
        form.reset({
          movieRootFolder: settings.movieRootFolder,
          tvRootFolder: settings.tvRootFolder,
        });
      } finally {
        setIsLoaded(true);
      }
    };

    void load();
  }, [api, form]);

  const onSubmit = async (data: MediaSettingsValues) => {
    setIsSaving(true);
    try {
      const updated = await api.mediaManagementApi.save(data);
      form.reset({
        movieRootFolder: updated.movieRootFolder,
        tvRootFolder: updated.tvRootFolder,
      });
      pushToast({ title: 'Media settings saved.', variant: 'success' });
    } catch {
      pushToast({ title: 'Failed to save media settings.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const movieRootFolder = form.watch('movieRootFolder');
  const tvRootFolder = form.watch('tvRootFolder');

  return (
    <RouteScaffold
      title="Media Management"
      description="Root folder settings for movies and TV series."
    >
      {isLoaded && (
        <Form {...form}>
          <form onSubmit={event => { void form.handleSubmit(onSubmit)(event); }}>
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="movieRootFolder"
                render={({ field }) => (
                  <FormItem className="text-sm text-text-secondary">
                    <FormLabel>Movie Root Folder</FormLabel>
                    <p className="text-xs text-text-secondary">Default destination folder for new movies.</p>
                    <div className="mt-1 flex items-center gap-1">
                      <FormControl>
                        <Input
                          {...field}
                          onChange={event => { field.onChange(event); setMovieFolderStatus(null); }}
                          className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Browse movie root folder"
                        onClick={() => setActiveBrowser('movie')}
                      >
                        <Folder size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        aria-label="Validate movie root folder"
                        onClick={() => { void validateDirectory(field.value, setMovieFolderStatus); }}
                      >
                        Validate
                      </Button>
                    </div>
                    {movieFolderStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">Writable</span>}
                    {movieFolderStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">Read-only</span>}
                    {movieFolderStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">Not found</span>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tvRootFolder"
                render={({ field }) => (
                  <FormItem className="text-sm text-text-secondary">
                    <FormLabel>TV Root Folder</FormLabel>
                    <p className="text-xs text-text-secondary">Default destination folder for new TV series.</p>
                    <div className="mt-1 flex items-center gap-1">
                      <FormControl>
                        <Input
                          {...field}
                          onChange={event => { field.onChange(event); setTvFolderStatus(null); }}
                          className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label="Browse TV root folder"
                        onClick={() => setActiveBrowser('tv')}
                      >
                        <Folder size={16} />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        aria-label="Validate TV root folder"
                        onClick={() => { void validateDirectory(field.value, setTvFolderStatus); }}
                      >
                        Validate
                      </Button>
                    </div>
                    {tvFolderStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">Writable</span>}
                    {tvFolderStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">Read-only</span>}
                    {tvFolderStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">Not found</span>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4">
              <Button type="submit" variant="outline" size="sm" disabled={!isLoaded || isSaving}>
                {isSaving ? 'Saving...' : 'Save Media Settings'}
              </Button>
            </div>
          </form>
        </Form>
      )}

      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'movie') {
            form.setValue('movieRootFolder', path);
            setMovieFolderStatus(null);
          } else if (activeBrowser === 'tv') {
            form.setValue('tvRootFolder', path);
            setTvFolderStatus(null);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'movie' ? movieRootFolder : tvRootFolder}
      />
    </RouteScaffold>
  );
}
