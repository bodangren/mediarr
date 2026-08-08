import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder } from 'lucide-react';
import { FilesystemBrowser } from '@/components/primitives/FilesystemBrowser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiClients } from '@/lib/api/client';
import { indexerPresets } from '@/lib/indexer/indexerPresets';

const DEFAULT_MOVIE_ROOT = '/data/media/movies';
const DEFAULT_TV_ROOT = '/data/media/tv';
const DEFAULT_COMPLETE_DOWNLOAD_PATH = '/data/downloads/complete';
const DEFAULT_INCOMPLETE_DOWNLOAD_PATH = '/data/downloads/incomplete';
const MOVIE_MEDIA_SUFFIX = '/media/movies';
const TV_MEDIA_SUFFIX = '/media/tv';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface CuratedIndexer {
  id: string;
  name: string;
  definitionId: string;
}

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Welcome',
  2: 'Root Folders',
  3: 'Indexers',
  4: 'Quality Profile',
  5: 'Done',
};
const STEP_SEQUENCE: WizardStep[] = [1, 2, 3, 4, 5];

function deriveDownloadDirectories(movieRootFolder: string, tvRootFolder: string) {
  const movieRoot = movieRootFolder.trim().replace(/\/+$/, '');
  const tvRoot = tvRootFolder.trim().replace(/\/+$/, '');
  const movieBase = movieRoot.endsWith(MOVIE_MEDIA_SUFFIX)
    ? movieRoot.slice(0, -MOVIE_MEDIA_SUFFIX.length)
    : null;
  const tvBase = tvRoot.endsWith(TV_MEDIA_SUFFIX)
    ? tvRoot.slice(0, -TV_MEDIA_SUFFIX.length)
    : null;

  if (movieBase && movieBase === tvBase) {
    return {
      completeDirectory: `${movieBase}/downloads/complete`,
      incompleteDirectory: `${movieBase}/downloads/incomplete`,
    };
  }

  return {
    completeDirectory: DEFAULT_COMPLETE_DOWNLOAD_PATH,
    incompleteDirectory: DEFAULT_INCOMPLETE_DOWNLOAD_PATH,
  };
}

const CURATED_INDEXERS: CuratedIndexer[] = indexerPresets
  .filter(preset => preset.implementation === 'Cardigann' && preset.privacy === 'Public')
  .slice(0, 5)
  .map((preset) => {
    const definitionField = preset.fields.find(field => field.name === 'definitionId');
    const definitionId =
      typeof definitionField?.defaultValue === 'string'
        ? definitionField.defaultValue
        : preset.id;

    return {
      id: preset.id,
      name: preset.name,
      definitionId,
    };
  });

export interface SetupWizardPageProps {
  onCompleted?: () => void;
}

export function SetupWizardPage({ onCompleted }: SetupWizardPageProps) {
  const api = useMemo(() => getApiClients(), []);
  const navigate = useNavigate();

  const [step, setStep] = useState<WizardStep>(1);
  const [movieRootFolder, setMovieRootFolder] = useState(DEFAULT_MOVIE_ROOT);
  const [tvRootFolder, setTvRootFolder] = useState(DEFAULT_TV_ROOT);
  const [activeBrowser, setActiveBrowser] = useState<'movie' | 'tv' | null>(null);

  const [qualityProfiles, setQualityProfiles] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedQualityProfileId, setSelectedQualityProfileId] = useState<number | null>(null);

  const [selectedIndexers, setSelectedIndexers] = useState<Record<string, boolean>>({});
  const [indexerApiKeys, setIndexerApiKeys] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadProfiles = async () => {
      setIsLoadingProfiles(true);
      try {
        const profiles = await api.qualityProfileApi.list();
        if (cancelled) {
          return;
        }

        setQualityProfiles(profiles.map(profile => ({ id: profile.id, name: profile.name })));
        setSelectedQualityProfileId((current) => current ?? profiles[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load quality profiles');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfiles(false);
        }
      }
    };

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [api]);

  const selectedIndexerCount = Object.values(selectedIndexers).filter(Boolean).length;
  const downloadDirectories = deriveDownloadDirectories(movieRootFolder, tvRootFolder);

  const canContinueFromStep2 = movieRootFolder.trim().length > 0 && tvRootFolder.trim().length > 0;
  const canContinueFromStep4 = qualityProfiles.length === 0 || selectedQualityProfileId !== null;

  const goToStep = (target: WizardStep) => {
    setStep(target);
    setError(null);
  };

  const nextStep = () => {
    if (step === 1) {
      return goToStep(2);
    }

    if (step === 2) {
      if (!canContinueFromStep2) {
        setError('Please set both movie and TV root folders before continuing.');
        return;
      }
      return goToStep(3);
    }

    if (step === 3) {
      return goToStep(4);
    }

    if (step === 4) {
      if (!canContinueFromStep4) {
        setError('Please select a quality profile before continuing.');
        return;
      }
      return goToStep(5);
    }
  };

  const previousStep = () => {
    if (step === 5) {
      return goToStep(4);
    }
    if (step === 4) {
      return goToStep(3);
    }
    if (step === 3) {
      return goToStep(2);
    }
    if (step === 2) {
      return goToStep(1);
    }
  };

  const applyRootFoldersAndDefaults = async () => {
    await api.mediaManagementApi.save({
      movieRootFolder,
      tvRootFolder,
    });

    const currentSettings = await api.settingsApi.get();
    await api.settingsApi.update({
      torrentLimits: {
        ...currentSettings.torrentLimits,
        ...downloadDirectories,
      },
    });
  };

  const maybeCreateSelectedIndexers = async (): Promise<string[]> => {
    const selected = CURATED_INDEXERS.filter(indexer => Boolean(selectedIndexers[indexer.id]));
    if (selected.length === 0) {
      return [];
    }

    const existing = await api.indexerApi.list();
    const existingNames = new Set(existing.map(item => item.name.toLowerCase()));

    const errors: string[] = [];

    for (const indexer of selected) {
      if (existingNames.has(indexer.name.toLowerCase())) {
        continue;
      }

      const apiKey = indexerApiKeys[indexer.id]?.trim();
      try {
        await api.indexerApi.create({
          name: indexer.name,
          implementation: 'Cardigann',
          configContract: 'CardigannSettings',
          settings: JSON.stringify({
            definitionId: indexer.definitionId,
            ...(apiKey ? { apiKey } : {}),
          }),
          protocol: 'torrent',
          supportedMediaTypes: JSON.stringify(['movie', 'series']),
          enabled: true,
          supportsRss: true,
          supportsSearch: true,
          priority: 25,
        });
      } catch (createError) {
        const message = createError instanceof Error ? createError.message : 'unknown error';
        errors.push(`${indexer.name}: ${message}`);
      }
    }

    return errors;
  };

  const finalizeSetup = async (includeSelectedIndexers: boolean) => {
    setIsSubmitting(true);
    setError(null);
    setWarnings([]);

    try {
      await applyRootFoldersAndDefaults();

      const indexerWarnings = includeSelectedIndexers
        ? await maybeCreateSelectedIndexers()
        : [];

      await api.setupApi.complete();

      if (indexerWarnings.length > 0) {
        setWarnings(indexerWarnings);
      }

      onCompleted?.();
      navigate('/dashboard', { replace: true });
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : 'Failed to complete setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJustWork = () => {
    void finalizeSetup(false);
  };

  const toggleIndexer = (id: string) => {
    setSelectedIndexers((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 text-text-primary">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Setup Wizard</h1>
        <p className="text-sm text-text-secondary">
          Welcome to Mediarr. Let&apos;s get your media server running.
        </p>
      </header>

      <ol className="grid gap-2 text-xs text-text-secondary sm:grid-cols-5">
        {STEP_SEQUENCE.map((stepNumber) => (
          <li
            key={stepNumber}
            className={`rounded border px-2 py-1 ${
              step === stepNumber
                ? 'border-brand-accent bg-brand-accent/10 text-text-primary'
                : 'border-border-subtle'
            }`}
          >
            {stepNumber}. {STEP_LABELS[stepNumber]}
          </li>
        ))}
      </ol>

      {error ? <p className="rounded border border-status-error/30 bg-status-error/10 p-2 text-sm text-status-error">{error}</p> : null}
      {warnings.length > 0 ? (
        <div className="rounded border border-status-warning/30 bg-status-warning/10 p-2 text-sm text-status-warning">
          <p className="font-medium">Some indexers were not added:</p>
          <ul className="list-disc pl-5">
            {warnings.map(warning => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Choose guided setup or use Just Work to apply safe defaults in one click.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleJustWork} disabled={isSubmitting}>
                {isSubmitting ? 'Applying Defaults...' : 'Just Work'}
              </Button>
              <Button type="button" variant="outline" onClick={nextStep} disabled={isSubmitting}>
                Continue Guided Setup
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Root Folders</h2>
            <p className="text-sm text-text-secondary">
              Add at least one root folder for movies and TV.
            </p>

            <label className="block text-sm">
              <span className="mb-1 block text-text-secondary">Movie Root Folder</span>
              <div className="flex gap-2">
                <Input
                  value={movieRootFolder}
                  onChange={event => setMovieRootFolder(event.currentTarget.value)}
                  placeholder={DEFAULT_MOVIE_ROOT}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Browse movie root folder"
                  onClick={() => setActiveBrowser('movie')}
                >
                  <Folder size={16} />
                </Button>
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-text-secondary">TV Root Folder</span>
              <div className="flex gap-2">
                <Input
                  value={tvRootFolder}
                  onChange={event => setTvRootFolder(event.currentTarget.value)}
                  placeholder={DEFAULT_TV_ROOT}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Browse TV root folder"
                  onClick={() => setActiveBrowser('tv')}
                >
                  <Folder size={16} />
                </Button>
              </div>
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Indexers</h2>
            <p className="text-sm text-text-secondary">
              Select from curated public indexers. API keys are optional.
            </p>

            <div className="space-y-3">
              {CURATED_INDEXERS.map(indexer => (
                <div key={indexer.id} className="rounded border border-border-subtle p-3">
                  <label className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIndexers[indexer.id])}
                      onChange={() => toggleIndexer(indexer.id)}
                    />
                    {indexer.name}
                  </label>
                  <Input
                    className="mt-2"
                    type="password"
                    placeholder="Optional API key"
                    value={indexerApiKeys[indexer.id] ?? ''}
                    onChange={event => {
                      const value = event.currentTarget.value;
                      setIndexerApiKeys(current => ({
                        ...current,
                        [indexer.id]: value,
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Quality Profile</h2>
            <p className="text-sm text-text-secondary">
              Select the default quality profile for new media.
            </p>

            {isLoadingProfiles ? (
              <p className="text-sm text-text-secondary">Loading quality profiles...</p>
            ) : qualityProfiles.length === 0 ? (
              <p className="text-sm text-text-secondary">No quality profiles found. Mediarr will use existing defaults.</p>
            ) : (
              <div className="space-y-2">
                {qualityProfiles.map(profile => (
                  <label key={profile.id} className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="radio"
                      name="quality-profile"
                      checked={selectedQualityProfileId === profile.id}
                      onChange={() => setSelectedQualityProfileId(profile.id)}
                    />
                    {profile.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Mediarr is ready</h2>
            <p className="text-sm text-text-secondary">
              Setup summary:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
              <li>Movie root: {movieRootFolder}</li>
              <li>TV root: {tvRootFolder}</li>
              <li>Selected indexers: {selectedIndexerCount}</li>
              <li>
                Quality profile: {
                  qualityProfiles.find(profile => profile.id === selectedQualityProfileId)?.name
                  ?? 'Default'
                }
              </li>
              <li>Download path: {downloadDirectories.completeDirectory}</li>
            </ul>

            <Button type="button" onClick={() => { void finalizeSetup(true); }} disabled={isSubmitting}>
              {isSubmitting ? 'Finishing...' : 'Go to Dashboard'}
            </Button>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={previousStep}
          disabled={isSubmitting || step === 1}
        >
          Back
        </Button>

        {step >= 1 && step <= 4 ? (
          <Button
            type="button"
            onClick={nextStep}
            disabled={
              isSubmitting
              || (step === 2 && !canContinueFromStep2)
              || (step === 4 && !canContinueFromStep4)
            }
          >
            Next
          </Button>
        ) : null}
      </div>

      <FilesystemBrowser
        isOpen={activeBrowser !== null}
        onClose={() => setActiveBrowser(null)}
        onSelect={(path) => {
          if (activeBrowser === 'movie') {
            setMovieRootFolder(path);
          } else if (activeBrowser === 'tv') {
            setTvRootFolder(path);
          }
          setActiveBrowser(null);
        }}
        initialPath={activeBrowser === 'movie' ? movieRootFolder : tvRootFolder}
      />
    </div>
  );
}
