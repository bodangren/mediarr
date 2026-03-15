import { describe, expect, it } from 'vitest';
import {
  buildPaginatedEnvelope,
  buildSuccessEnvelope,
  parsePaginationParams,
} from '../server/src/api/contracts';
import { buildErrorEnvelope } from '../server/src/api/errors';
import { ConflictError } from '../server/src/errors/domainErrors';

describe('API contract harness', () => {
  it('buildSuccessEnvelope should return the canonical success shape', () => {
    expect(buildSuccessEnvelope({ id: 123, title: 'Movie' })).toEqual({
      ok: true,
      data: {
        id: 123,
        title: 'Movie',
      },
    });
  });

  it('buildPaginatedEnvelope should return list payload with pagination meta', () => {
    expect(
      buildPaginatedEnvelope(
        [{ id: 1 }, { id: 2 }],
        {
          page: 2,
          pageSize: 2,
          totalCount: 5,
        },
      ),
    ).toEqual({
      ok: true,
      data: [{ id: 1 }, { id: 2 }],
      meta: {
        page: 2,
        pageSize: 2,
        totalCount: 5,
        totalPages: 3,
      },
    });
  });

  it('buildErrorEnvelope should map domain errors to canonical shape', () => {
    const envelope = buildErrorEnvelope(
      new ConflictError('Active torrents exist', { entity: 'series:5' }),
      '/api/series/5',
    );

    expect(envelope.httpStatus).toBe(409);
    expect(envelope.body).toEqual({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'Active torrents exist',
        details: { entity: 'series:5' },
        retryable: false,
        path: '/api/series/5',
      },
    });
  });

  it('parsePaginationParams should apply defaults and bounds', () => {
    expect(
      parsePaginationParams({
        page: '0',
        pageSize: '300',
        sortBy: 'title',
        sortDir: 'DESC',
      }),
    ).toEqual({
      page: 1,
      pageSize: 300,
      sortBy: 'title',
      sortDir: 'desc',
    });

    expect(parsePaginationParams({})).toEqual({
      page: 1,
      pageSize: 25,
      sortBy: undefined,
      sortDir: undefined,
    });
  });
});
