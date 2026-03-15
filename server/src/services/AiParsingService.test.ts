import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoisted mock variables
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('openai', () => {
  return {
    default: vi.fn(function () {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
  };
});

import { AiParsingService } from './AiParsingService';

// Create a fresh instance per test so the OpenAI mock is captured at construction time
let service: AiParsingService;

describe('AiParsingService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    service = new AiParsingService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('parse()', () => {
    it('returns parsed JSON of type T on successful call', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{"title":"The Matrix","year":1999}' } }],
      });

      const result = await service.parse<{ title: string; year: number }>(
        'You are a filename parser.',
        'The.Matrix.1999.mkv',
        ['title']
      );

      expect(result).toEqual({ title: 'The Matrix', year: 1999 });
    });

    it('returns null for malformed JSON response', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'not valid json at all' } }],
      });

      const result = await service.parse<{ title: string }>(
        'You are a filename parser.',
        'test.mkv',
        ['title']
      );

      expect(result).toBeNull();
    });

    it('returns null when response is missing required fields', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '{"year":1999}' } }],
      });

      const result = await service.parse<{ title: string; year: number }>(
        'You are a filename parser.',
        'test.mkv',
        ['title']
      );

      expect(result).toBeNull();
    });

    it('retries on network error and succeeds on 2nd attempt', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"title":"Inception"}' } }],
        });

      const resultPromise = service.parse<{ title: string }>(
        'You are a filename parser.',
        'Inception.2010.mkv',
        ['title']
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toEqual({ title: 'Inception' });
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('returns null after all 3 attempts fail', async () => {
      mockCreate
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const resultPromise = service.parse<{ title: string }>(
        'You are a filename parser.',
        'test.mkv',
        ['title']
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBeNull();
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('retries on AbortError (timeout) and falls back to null after all 3 fail', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockCreate
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError);

      const resultPromise = service.parse<{ title: string }>(
        'You are a filename parser.',
        'test.mkv',
        ['title']
      );
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result).toBeNull();
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it('handles JSON embedded in markdown code fences', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '```json\n{"title":"Fight Club","year":1999}\n```' } }],
      });

      const result = await service.parse<{ title: string; year: number }>(
        'You are a filename parser.',
        'Fight.Club.1999.mkv',
        ['title']
      );

      expect(result).toEqual({ title: 'Fight Club', year: 1999 });
    });

    it('returns null when choices array is empty', async () => {
      mockCreate.mockResolvedValueOnce({ choices: [] });

      const result = await service.parse<{ title: string }>(
        'You are a filename parser.',
        'test.mkv',
        ['title']
      );

      expect(result).toBeNull();
    });

    it('returns null when message content is null', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const result = await service.parse<{ title: string }>(
        'You are a filename parser.',
        'test.mkv',
        ['title']
      );

      expect(result).toBeNull();
    });
  });
});
