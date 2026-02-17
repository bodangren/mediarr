import { describe, expect, it } from 'vitest';
import { COMMON_LANGUAGES, getLanguageName, getLanguage, isValidLanguageCode } from './languages';

describe('languages constants', () => {
  it('contains all expected languages', () => {
    expect(COMMON_LANGUAGES.length).toBeGreaterThan(0);
    expect(COMMON_LANGUAGES.some(lang => lang.code === 'en')).toBe(true);
    expect(COMMON_LANGUAGES.some(lang => lang.code === 'es')).toBe(true);
    expect(COMMON_LANGUAGES.some(lang => lang.code === 'fr')).toBe(true);
  });

  it('has language codes and names', () => {
    const english = COMMON_LANGUAGES.find(lang => lang.code === 'en');
    expect(english).toBeDefined();
    expect(english?.name).toBe('English');
  });

  it('getLanguageName returns correct name for valid code', () => {
    expect(getLanguageName('en')).toBe('English');
    expect(getLanguageName('es')).toBe('Spanish');
    expect(getLanguageName('fr')).toBe('French');
  });

  it('getLanguageName returns code for invalid code', () => {
    expect(getLanguageName('xx')).toBe('xx');
  });

  it('getLanguage returns language object for valid code', () => {
    const english = getLanguage('en');
    expect(english).toBeDefined();
    expect(english?.code).toBe('en');
    expect(english?.name).toBe('English');
  });

  it('getLanguage returns undefined for invalid code', () => {
    expect(getLanguage('xx')).toBeUndefined();
  });

  it('isValidLanguageCode returns true for valid codes', () => {
    expect(isValidLanguageCode('en')).toBe(true);
    expect(isValidLanguageCode('es')).toBe(true);
    expect(isValidLanguageCode('fr')).toBe(true);
  });

  it('isValidLanguageCode returns false for invalid codes', () => {
    expect(isValidLanguageCode('xx')).toBe(false);
    expect(isValidLanguageCode('')).toBe(false);
    expect(isValidLanguageCode('xyz')).toBe(false);
  });
});
