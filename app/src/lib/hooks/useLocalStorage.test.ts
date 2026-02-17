import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    expect(result.current[0]).toBe('initial');
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('initial'));
  });

  it('reads existing value from localStorage', () => {
    window.localStorage.setItem('test-key', JSON.stringify('existing'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));

    expect(result.current[0]).toBe('existing');
  });

  it('updates localStorage when value changes', async () => {
    const { result } = renderHook(() => useLocalStorage<string>('test-key', 'initial'));

    const [, setValue] = result.current;
    act(() => {
      setValue('new-value');
    });

    await waitFor(() => {
      expect(result.current[0]).toBe('new-value');
    });
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('supports functional updates', async () => {
    const { result } = renderHook(() => useLocalStorage<number>('test-key', 0));

    const [, setValue] = result.current;
    act(() => {
      setValue(prev => prev + 1);
    });

    await waitFor(() => {
      expect(result.current[0]).toBe(1);
    });
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify(1));
  });

  it('persists objects correctly', async () => {
    const initialValue = { name: 'Test', count: 0 };
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    const [, setValue] = result.current;
    act(() => {
      setValue({ name: 'Updated', count: 5 });
    });

    await waitFor(() => {
      expect(result.current[0]).toEqual({ name: 'Updated', count: 5 });
    });
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify({ name: 'Updated', count: 5 }));
  });

  it('persists arrays correctly', async () => {
    const initialValue = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue));

    expect(result.current[0]).toEqual(initialValue);

    const [, setValue] = result.current;
    act(() => {
      setValue(prev => [...prev, 4]);
    });

    await waitFor(() => {
      expect(result.current[0]).toEqual([1, 2, 3, 4]);
    });
    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify([1, 2, 3, 4]));
  });

  it('handles JSON parse errors gracefully', () => {
    window.localStorage.setItem('test-key', 'invalid-json{');

    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'));

    expect(result.current[0]).toBe('fallback');
  });
});
