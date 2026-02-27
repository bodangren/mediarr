'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_UI_PREFERENCES,
  applyUIPreferences,
  loadUIPreferences,
  saveUIPreferences,
  type DateFormatPreference,
  type ThemePreference,
  type TimeFormatPreference,
  type UIPreferences,
} from '@/lib/uiPreferences';
import { addShortcutSaveListener } from '@/lib/shortcuts';

export default function UiSettingsPage() {
  const [preferences, setPreferences] = useState<UIPreferences>(() => loadUIPreferences());
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    applyUIPreferences(preferences);
  }, [preferences]);

  const previewTimestamp = useMemo(() => new Date('2026-02-15T13:30:00.000Z'), []);

  const previewDate = useMemo(() => {
    if (preferences.showRelativeDates && preferences.dateFormat === 'relative') {
      return '2 hours ago';
    }

    if (preferences.dateFormat === 'long') {
      return previewTimestamp.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return previewTimestamp.toLocaleDateString();
  }, [preferences.dateFormat, preferences.showRelativeDates, previewTimestamp]);

  const previewTime = useMemo(() => {
    return previewTimestamp.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: preferences.timeFormat === '12h',
    });
  }, [preferences.timeFormat, previewTimestamp]);

  const save = useCallback(() => {
    saveUIPreferences(preferences);
    applyUIPreferences(preferences);
    setSaveState('saved');
  }, [preferences]);

  useEffect(() => {
    return addShortcutSaveListener(save);
  }, [save]);

  const reset = useCallback(() => {
    setPreferences(DEFAULT_UI_PREFERENCES);
    saveUIPreferences(DEFAULT_UI_PREFERENCES);
    applyUIPreferences(DEFAULT_UI_PREFERENCES);
    setSaveState('saved');
  }, []);

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">UI Settings</h1>
        <p className="text-sm text-text-secondary">Theme, date/time format, and accessibility preferences.</p>
      </header>

      <section className="space-y-4 rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Appearance</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm" htmlFor="themePreference">
            <span>Theme</span>
            <select
              id="themePreference"
              value={preferences.theme}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              onChange={event => {
                const nextTheme = event.currentTarget.value as ThemePreference;
                setPreferences(current => ({ ...current, theme: nextTheme }));
                setSaveState('idle');
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto (system)</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm" htmlFor="colorImpairedMode">
            <span>Color Impaired Mode</span>
            <div className="flex h-full items-center gap-2 rounded-sm border border-border-subtle bg-surface-0 px-3 py-2">
              <input
                id="colorImpairedMode"
                type="checkbox"
                checked={preferences.colorImpairedMode}
                onChange={event => {
                  const nextChecked = event.currentTarget.checked;
                  setPreferences(current => ({ ...current, colorImpairedMode: nextChecked }));
                  setSaveState('idle');
                }}
              />
              <span>Enable accessibility-friendly status colors</span>
            </div>
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-md border border-border-subtle bg-surface-1 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Date & Time</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm" htmlFor="dateFormatPreference">
            <span>Date Format</span>
            <select
              id="dateFormatPreference"
              value={preferences.dateFormat}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              onChange={event => {
                const nextDateFormat = event.currentTarget.value as DateFormatPreference;
                setPreferences(current => ({ ...current, dateFormat: nextDateFormat }));
                setSaveState('idle');
              }}
            >
              <option value="relative">Relative</option>
              <option value="short">Short</option>
              <option value="long">Long</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm" htmlFor="timeFormatPreference">
            <span>Time Format</span>
            <select
              id="timeFormatPreference"
              value={preferences.timeFormat}
              className="rounded-sm border border-border-subtle bg-surface-0 px-3 py-2 text-sm"
              onChange={event => {
                const nextTimeFormat = event.currentTarget.value as TimeFormatPreference;
                setPreferences(current => ({ ...current, timeFormat: nextTimeFormat }));
                setSaveState('idle');
              }}
            >
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
          type="checkbox"
          checked={preferences.showRelativeDates}
          onChange={event => {
            const nextChecked = event.currentTarget.checked;
            setPreferences(current => ({ ...current, showRelativeDates: nextChecked }));
            setSaveState('idle');
          }}
        />
          Show relative dates where available
        </label>

        <div className="rounded-sm border border-border-subtle bg-surface-0 p-3 text-xs text-text-secondary">
          <p className="font-semibold text-text-primary">Preview</p>
          <p>
            Date: <span className="font-mono">{previewDate}</span>
          </p>
          <p>
            Time: <span className="font-mono">{previewTime}</span>
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-sm bg-accent-primary px-4 py-2 text-sm font-semibold text-text-inverse"
          onClick={save}
        >
          Save UI Settings
        </button>
        <button
          type="button"
          className="rounded-sm border border-border-subtle px-4 py-2 text-sm"
          onClick={reset}
        >
          Reset to Defaults
        </button>
        {saveState === 'saved' ? <span className="text-xs text-status-completed">Saved.</span> : null}
      </div>
    </section>
  );
}
