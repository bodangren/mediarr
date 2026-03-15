import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RouteScaffold } from '@/components/primitives/RouteScaffold';
import { getApiClients } from '@/lib/api/client';
import type { SubtitleProvider } from '@/lib/api/subtitleProvidersApi';
import { COMMON_LANGUAGES, getLanguageName } from '@/lib/constants/languages';
import { normalizeLanguageCodes } from '@/lib/subtitles/coverage';

export function SettingsSubtitlesPage() {
  const api = useMemo(() => getApiClients(), []);
  const [providers, setProviders] = useState<SubtitleProvider[]>([]);
  const [openSubtitlesApiKey, setOpenSubtitlesApiKey] = useState('');
  const [assrtApiToken, setAssrtApiToken] = useState('');
  const [subdlApiKey, setSubdlApiKey] = useState('');
  const [wantedLanguages, setWantedLanguages] = useState<string[]>([]);
  const [showDownloadPath, setShowDownloadPath] = useState(false);
  const [showMediaPath, setShowMediaPath] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const settings = await api.settingsApi.get();
        setOpenSubtitlesApiKey(settings.apiKeys?.openSubtitlesApiKey ?? '');
        setAssrtApiToken(settings.apiKeys?.assrtApiToken ?? '');
        setSubdlApiKey(settings.apiKeys?.subdlApiKey ?? '');
        setWantedLanguages(normalizeLanguageCodes(settings.wantedLanguages ?? []));
        setShowDownloadPath(settings.pathVisibility.showDownloadPath);
        setShowMediaPath(settings.pathVisibility.showMediaPath);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load subtitle settings');
      }

      try {
        const loadedProviders = await api.subtitleProvidersApi.listProviders();
        setProviders(loadedProviders);
        setProviderLoadError(null);
      } catch (providerError) {
        setProviders([]);
        setProviderLoadError(providerError instanceof Error ? providerError.message : 'Provider status endpoint unavailable');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [api]);

  const toggleWantedLanguage = (languageCode: string) => {
    setWantedLanguages(current => {
      const normalized = languageCode.trim().toLowerCase();
      if (current.includes(normalized)) {
        return current.filter(item => item !== normalized);
      }
      return normalizeLanguageCodes([...current, normalized]);
    });
  };

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.settingsApi.update({
        apiKeys: {
          openSubtitlesApiKey: openSubtitlesApiKey.trim() === '' ? null : openSubtitlesApiKey.trim(),
          assrtApiToken: assrtApiToken.trim() === '' ? null : assrtApiToken.trim(),
          subdlApiKey: subdlApiKey.trim() === '' ? null : subdlApiKey.trim(),
        },
        wantedLanguages: normalizeLanguageCodes(wantedLanguages),
        pathVisibility: {
          showDownloadPath,
          showMediaPath,
        },
      });
      setMessage('Subtitle settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save subtitle settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RouteScaffold title="Subtitles" description="Unified subtitle providers and global behavior controls.">
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
      {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
      {isLoading ? <p className="text-sm text-text-secondary">Loading subtitle settings...</p> : null}
      <section className="rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="font-medium">Provider Status</h2>
        {providerLoadError ? <p className="mt-2 text-xs text-status-error">{providerLoadError}</p> : null}
        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
          {providers.length === 0 ? <li>No provider status entries available.</li> : providers.map(provider => <li key={provider.id}>{provider.name} - {provider.status}</li>)}
        </ul>
      </section>

      <form className="rounded-md border border-border-subtle bg-surface-1 p-4" onSubmit={event => { void onSave(event); }}>
        <h2 className="font-medium">Provider Credentials and Visibility</h2>
        <label className="mt-3 block text-sm text-text-secondary">
          OpenSubtitles API Key
          <input
            type="text"
            value={openSubtitlesApiKey}
            onChange={event => setOpenSubtitlesApiKey(event.target.value)}
            placeholder="Paste OpenSubtitles API key"
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
        </label>
        <label className="mt-3 block text-sm text-text-secondary">
          ASSRT API Token
          <input
            type="text"
            value={assrtApiToken}
            onChange={event => setAssrtApiToken(event.target.value)}
            placeholder="Paste ASSRT token"
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
        </label>
        <label className="mt-3 block text-sm text-text-secondary">
          SubDL API Key
          <input
            type="text"
            value={subdlApiKey}
            onChange={event => setSubdlApiKey(event.target.value)}
            placeholder="Paste SubDL API key"
            className="mt-1 w-full rounded-sm border border-border-subtle bg-surface-0 px-2 py-1 text-sm text-text-primary"
          />
        </label>
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-text-primary">Wanted Languages</h3>
          <p className="text-xs text-text-secondary">
            Subtitles automation will prioritize these languages globally when no item-specific override exists.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
              onClick={() => setWantedLanguages(normalizeLanguageCodes([...wantedLanguages, 'en']))}
            >
              Add English
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
              onClick={() => setWantedLanguages(normalizeLanguageCodes([...wantedLanguages, 'zh']))}
            >
              Add Chinese
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
              onClick={() => setWantedLanguages(normalizeLanguageCodes([...wantedLanguages, 'th']))}
            >
              Add Thai
            </button>
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-surface-2"
              onClick={() => setWantedLanguages([])}
            >
              Clear
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-sm border border-border-subtle bg-surface-0 p-2">
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {COMMON_LANGUAGES.map(language => (
                <label key={language.code} className="flex items-center gap-2 rounded-sm px-2 py-1 text-xs text-text-secondary hover:bg-surface-1">
                  <input
                    type="checkbox"
                    aria-label={`Wanted language ${language.code}`}
                    checked={wantedLanguages.includes(language.code)}
                    onChange={() => toggleWantedLanguage(language.code)}
                  />
                  {language.name} ({language.code})
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {wantedLanguages.length === 0 ? (
              <span className="text-xs text-text-muted">No wanted languages selected.</span>
            ) : wantedLanguages.map(code => (
              <span key={code} className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">
                {getLanguageName(code)} ({code})
              </span>
            ))}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={showDownloadPath} onChange={event => setShowDownloadPath(event.target.checked)} />
          Show download paths in subtitle-related views
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={showMediaPath} onChange={event => setShowMediaPath(event.target.checked)} />
          Show media paths in subtitle-related views
        </label>
        <div className="mt-3">
          <button type="submit" className="rounded-sm border border-border-subtle bg-surface-2 px-3 py-2 text-sm" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Subtitle Settings'}
          </button>
        </div>
      </form>
    </RouteScaffold>
  );
}
