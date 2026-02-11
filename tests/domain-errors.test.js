import { describe, it, expect } from 'vitest';
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ProviderUnavailableError,
  TorrentRejectedError,
  ImportFailedError,
  InternalError,
  mapDomainErrorToHttp,
} from '../server/src/errors/domainErrors';

describe('domain error taxonomy', () => {
  it('should expose typed metadata for every domain error class', () => {
    const cases = [
      new NotFoundError('missing'),
      new ValidationError('bad input'),
      new ConflictError('duplicate'),
      new ProviderUnavailableError('provider down'),
      new TorrentRejectedError('magnet rejected'),
      new ImportFailedError('import failed'),
      new InternalError('unexpected'),
    ];

    expect(cases.map(item => item.code)).toEqual([
      'NOT_FOUND',
      'VALIDATION_ERROR',
      'CONFLICT',
      'PROVIDER_UNAVAILABLE',
      'TORRENT_REJECTED',
      'IMPORT_FAILED',
      'INTERNAL_ERROR',
    ]);

    expect(cases.map(item => item.httpStatus)).toEqual([404, 422, 409, 502, 422, 500, 500]);
    expect(cases.map(item => item.retryable)).toEqual([false, false, false, true, false, false, false]);
  });

  it('should map domain errors into canonical API error envelope', () => {
    const error = new ProviderUnavailableError('timeout', { provider: 'opensubtitles' });
    const envelope = mapDomainErrorToHttp(error, '/api/subtitles/search');

    expect(envelope.httpStatus).toBe(502);
    expect(envelope.error.code).toBe('PROVIDER_UNAVAILABLE');
    expect(envelope.error.message).toBe('timeout');
    expect(envelope.error.retryable).toBe(true);
    expect(envelope.error.path).toBe('/api/subtitles/search');
    expect(envelope.error.details).toEqual({ provider: 'opensubtitles' });
  });

  it('should safely coerce unknown errors into INTERNAL_ERROR envelopes', () => {
    const envelope = mapDomainErrorToHttp(new Error('boom'));

    expect(envelope.httpStatus).toBe(500);
    expect(envelope.error.code).toBe('INTERNAL_ERROR');
    expect(envelope.error.message).toBe('boom');
    expect(envelope.error.retryable).toBe(false);
  });

  it('DomainError should preserve details payload', () => {
    const err = new DomainError({
      code: 'VALIDATION_ERROR',
      message: 'invalid',
      httpStatus: 422,
      retryable: false,
      details: { field: 'title' },
    });

    expect(err.details).toEqual({ field: 'title' });
  });
});
