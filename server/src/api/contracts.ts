import type { FastifyReply } from 'fastify';
import { serializeApiPayload } from '../utils/serialization';

export type SortDirection = 'asc' | 'desc';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginationInput {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ParsedPaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: SortDirection;
}

export interface SuccessEnvelope<T> {
  ok: true;
  data: T;
}

export interface PaginatedSuccessEnvelope<T> {
  ok: true;
  data: T[];
  meta: PaginationMeta;
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseSortDirection(value: unknown): SortDirection | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'asc' || normalized === 'desc') {
    return normalized;
  }

  return undefined;
}

export function parsePaginationParams(
  query: Record<string, unknown>,
): ParsedPaginationParams {
  const rawPage = parseInteger(query.page);
  const rawPageSize = parseInteger(query.pageSize);

  const page = rawPage !== undefined ? Math.max(rawPage, 1) : 1;
  const pageSize = rawPageSize !== undefined ? clamp(rawPageSize, 1, 10_000) : 25;

  const sortBy =
    typeof query.sortBy === 'string' && query.sortBy.trim().length > 0
      ? query.sortBy
      : undefined;

  return {
    page,
    pageSize,
    sortBy,
    sortDir: parseSortDirection(query.sortDir),
  };
}

export function buildSuccessEnvelope<T>(data: T): SuccessEnvelope<T> {
  return {
    ok: true,
    data,
  };
}

export function buildPaginatedEnvelope<T>(
  data: T[],
  input: PaginationInput,
): PaginatedSuccessEnvelope<T> {
  const totalPages =
    input.totalCount > 0
      ? Math.ceil(input.totalCount / Math.max(input.pageSize, 1))
      : 0;

  return {
    ok: true,
    data,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      totalCount: input.totalCount,
      totalPages,
    },
  };
}

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200,
): FastifyReply {
  return reply.code(statusCode).send(buildSuccessEnvelope(serializeApiPayload(data) as T));
}

export function sendPaginatedSuccess<T>(
  reply: FastifyReply,
  data: T[],
  input: PaginationInput,
  statusCode = 200,
): FastifyReply {
  return reply
    .code(statusCode)
    .send(
      buildPaginatedEnvelope(
        serializeApiPayload(data) as T[],
        input,
      ),
    );
}

export function paginateArray<T>(
  data: T[],
  page: number,
  pageSize: number,
): { items: T[]; totalCount: number } {
  const totalCount = data.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: data.slice(start, end),
    totalCount,
  };
}
