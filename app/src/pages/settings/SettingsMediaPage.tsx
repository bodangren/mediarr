import { useCallback, useEffect, useMemo, useState } from 'react';
import { Folder } from 'lucide-react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';

export function SettingsMediaPage() {
  const api = useMemo(() => getApiClients(), []);
  const { pushToast } = useToast();
  const [movieRootFolder, setMovieRootFolder] = useState('');
  const [tvRootFolder, setTvRootFolder] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeBrowser, setActiveBrowser] = useState<'movie' | 'tv' | null>(null);
  const [movieFolderStatus, setMovieFolderStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);
  const [tvFolderStatus, setTvFolderStatus] = useState<'writable' | 'readonly' | 'notfound' | null>(null);

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
        setMovieRootFolder(settings.movieRootFolder);
        setTvRootFolder(settings.tvRootFolder);
      } finally {
        setIsLoaded(true);
      }
    };

    void load();
  }, [api]);

  const onSave = async () => {
    setIsSaving(true);
    try {
      const updated = await api.mediaManagementApi.save({ movieRootFolder, tvRootFolder });
      setMovieRootFolder(updated.movieRootFolder);
      setTvRootFolder(updated.tvRootFolder);
      pushToast({ title: 'Media settings saved.', variant: 'success' });
    } catch {
      pushToast({ title: 'Failed to save media settings.', variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold
      title="Media Management"
      description="Root folder settings for movies and TV series."
    >
      {isLoaded && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="text-sm text-text-secondary">
            <label>
              Movie Root Folder
              <p className="text-xs text-text-secondary">Default destination folder for new movies.</p>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="text"
                  value={movieRootFolder}
                  onChange={event => { setMovieRootFolder(event.target.value); setMovieFolderStatus(null); }}
                  className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                />
                <button
                  type="button"
                  aria-label="Browse movie root folder"
                  onClick={() => setActiveBrowser('movie')}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                >
                  <Folder size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Validate movie root folder"
                  onClick={() => { void validateDirectory(movieRootFolder, setMovieFolderStatus); }}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                >
                  Validate
                </button>
              </div>
            </label>
            {movieFolderStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">✓ Writable</span>}
            {movieFolderStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>}
            {movieFolderStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">✗ Not found</span>}
          </div>

          <div className="text-sm text-text-secondary">
            <label>
              TV Root Folder
              <p className="text-xs text-text-secondary">Default destination folder for new TV series.</p>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="text"
                  value={tvRootFolder}
                  onChange={event => { setTvRootFolder(event.target.value); setTvFolderStatus(null); }}
                  className="min-w-0 flex-1 rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
                />
                <button
                  type="button"
                  aria-label="Browse TV root folder"
                  onClick={() => setActiveBrowser('tv')}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 p-1 hover:bg-surface-2"
                >
                  <Folder size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Validate TV root folder"
                  onClick={() => { void validateDirectory(tvRootFolder, setTvFolderStatus); }}
                  className="flex-shrink-0 rounded-sm border border-border-subtle bg-surface-1 px-2 py-1 text-xs hover:bg-surface-2"
                >
                  Validate
                </button>
              </div>
            </label>
            {tvFolderStatus === 'writable' && <span className="mt-1 block text-xs text-green-500">✓ Writable</span>}
            {tvFolderStatus === 'readonly' && <span className="mt-1 block text-xs text-yellow-500">⚠ Read-only</span>}
            {tvFolderStatus === 'notfound' && <span className="mt-1 block text-xs text-red-500">✗ Not found</span>}
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => { void onSave(); }}
          disabled={!isLoaded || isSaving}
          className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm"
        >
          {isSaving ? 'Saving...' : 'Save Media Settings'}
        </button>
      </div>

      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'movie') {
            setMovieRootFolder(path);
            setMovieFolderStatus(null);
          } else if (activeBrowser === 'tv') {
            setTvRootFolder(path);
            setTvFolderStatus(null);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'movie' ? movieRootFolder : tvRootFolder}
      />
    </RouteScaffold>
  );
}
