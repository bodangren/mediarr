import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COLOR_IMPAIRED_KEY,
  toggleColorImpairedMode,
  applyColorImpairedMode,
  loadColorImpairedMode,
} from './colorImpaired';

function createMockStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    clear: () => store.clear(),
  } as unknown as Storage;
}

describe('colorImpaired', () => {
  const mockLocalStorage = createMockStorage();

  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('document', {
      documentElement: {
        dataset: {},
      },
    });
    mockLocalStorage.clear();
  });

  describe('COLOR_IMPAIRED_KEY', () => {
    it('should have correct storage key', () => {
      expect(COLOR_IMPAIRED_KEY).toBe('mediarr.color-impaired');
    });
  });

  describe('loadColorImpairedMode', () => {
    it('should return false when no value is stored', () => {
      expect(loadColorImpairedMode()).toBe(false);
    });

    it('should return true when stored value is "true"', () => {
      mockLocalStorage.setItem(COLOR_IMPAIRED_KEY, 'true');
      expect(loadColorImpairedMode()).toBe(true);
    });

    it('should return false when stored value is "false"', () => {
      mockLocalStorage.setItem(COLOR_IMPAIRED_KEY, 'false');
      expect(loadColorImpairedMode()).toBe(false);
    });

    it('should return false for invalid values', () => {
      mockLocalStorage.setItem(COLOR_IMPAIRED_KEY, 'invalid');
      expect(loadColorImpairedMode()).toBe(false);
    });
  });

  describe('applyColorImpairedMode', () => {
    it('should set data-color-impaired to "true" when enabled', () => {
      applyColorImpairedMode(true);
      expect(document.documentElement.dataset.colorImpaired).toBe('true');
    });

    it('should set data-color-impaired to "false" when disabled', () => {
      applyColorImpairedMode(false);
      expect(document.documentElement.dataset.colorImpaired).toBe('false');
    });

    it('should not throw when document is undefined', () => {
      vi.stubGlobal('document', undefined);
      expect(() => applyColorImpairedMode(true)).not.toThrow();
    });
  });

  describe('toggleColorImpairedMode', () => {
    it('should toggle from false to true', () => {
      expect(loadColorImpairedMode()).toBe(false);
      const newValue = toggleColorImpairedMode();
      expect(newValue).toBe(true);
      expect(loadColorImpairedMode()).toBe(true);
      expect(document.documentElement.dataset.colorImpaired).toBe('true');
    });

    it('should toggle from true to false', () => {
      mockLocalStorage.setItem(COLOR_IMPAIRED_KEY, 'true');
      expect(loadColorImpairedMode()).toBe(true);
      const newValue = toggleColorImpairedMode();
      expect(newValue).toBe(false);
      expect(loadColorImpairedMode()).toBe(false);
      expect(document.documentElement.dataset.colorImpaired).toBe('false');
    });

    it('should persist to localStorage', () => {
      toggleColorImpairedMode();
      expect(mockLocalStorage.getItem(COLOR_IMPAIRED_KEY)).toBe('true');
    });
  });
});
