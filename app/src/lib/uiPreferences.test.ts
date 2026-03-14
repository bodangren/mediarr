// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCES_STORAGE_KEY,
  applyUIPreferences,
  loadUIPreferences,
  saveUIPreferences,
} from './uiPreferences';

describe('uiPreferences', () => {
  it('loads default preferences when storage is empty', () => {
    window.localStorage.clear();
    expect(loadUIPreferences(window.localStorage)).toEqual(DEFAULT_UI_PREFERENCES);
  });

  it('saves and loads preferences from storage', () => {
    window.localStorage.clear();

    const next = {
      ...DEFAULT_UI_PREFERENCES,
      theme: 'light' as const,
      colorImpairedMode: true,
    };

    saveUIPreferences(next, window.localStorage);

    expect(window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)).toBe(JSON.stringify(next));
    expect(loadUIPreferences(window.localStorage)).toEqual(next);
  });

  it('applies theme and color impaired attributes to document root', () => {
    const next = {
      ...DEFAULT_UI_PREFERENCES,
      theme: 'light' as const,
      colorImpairedMode: true,
    };

    applyUIPreferences(next, document);

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.dataset.colorImpaired).toBe('true');
  });
});
