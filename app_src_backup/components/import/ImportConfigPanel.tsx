'use client';

import type { ImportConfig } from './types';

interface ImportConfigPanelProps {
  config: ImportConfig;
  onChange: (config: ImportConfig) => void;
  rootFolders: string[];
}

export function ImportConfigPanel({ config, onChange, rootFolders }: ImportConfigPanelProps) {
  const updateConfig = <K extends keyof ImportConfig>(key: K, value: ImportConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
      <h3 className="text-base font-semibold">Import Configuration</h3>
      <p className="mt-1 text-sm text-text-secondary">
        These settings will be applied to all imported series.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Quality Profile */}
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-text-primary">Quality Profile</span>
          <select
            value={config.qualityProfileId}
            onChange={e => updateConfig('qualityProfileId', Number(e.target.value))}
            className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
          >
            <option value={1}>HD-1080p</option>
            <option value={2}>UltraHD-4K</option>
            <option value={3}>Any</option>
          </select>
        </label>

        {/* Root Folder */}
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-text-primary">Root Folder</span>
          <select
            value={config.rootFolder}
            onChange={e => updateConfig('rootFolder', e.target.value)}
            className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
          >
            {rootFolders.length === 0 ? (
              <option value="/media/tv">/media/tv (default)</option>
            ) : (
              rootFolders.map(folder => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))
            )}
          </select>
        </label>

        {/* Series Type */}
        <label className="space-y-1.5 text-sm">
          <span className="font-medium text-text-primary">Series Type</span>
          <select
            value={config.seriesType}
            onChange={e => updateConfig('seriesType', e.target.value as ImportConfig['seriesType'])}
            className="w-full rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
          >
            <option value="standard">Standard</option>
            <option value="anime">Anime</option>
            <option value="daily">Daily</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-6">
        {/* Monitored */}
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.monitored}
            onChange={e => updateConfig('monitored', e.target.checked)}
          />
          <span className="text-text-primary">Monitor Series</span>
        </label>

        {/* Season Folder */}
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.seasonFolder}
            onChange={e => updateConfig('seasonFolder', e.target.checked)}
          />
          <span className="text-text-primary">Use Season Folders</span>
        </label>
      </div>

      {/* Monitor New Items */}
      <div className="mt-4 space-y-1.5 text-sm">
        <span className="font-medium text-text-primary">Monitor New Items</span>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All Episodes' },
            { value: 'future', label: 'Future Episodes' },
            { value: 'none', label: 'None' },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateConfig('monitorNewItems', option.value as ImportConfig['monitorNewItems'])}
              className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${
                config.monitorNewItems === option.value
                  ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                  : 'border-border-subtle text-text-secondary hover:border-accent-primary/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
