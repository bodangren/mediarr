import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../errors/domainErrors';

export function parseIdParam(input: string, entityName = 'entity'): number {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`Invalid ${entityName} id`);
  }

  return parsed;
}

export function parseBoolean(value: unknown, fallback?: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new ValidationError('Expected boolean value');
}

export function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function sortByField<T extends Record<string, unknown>>(
  values: T[],
  field: string,
  direction: 'asc' | 'desc',
): T[] {
  const sign = direction === 'desc' ? -1 : 1;

  return [...values].sort((left, right) => {
    const a = left[field];
    const b = right[field];

    if (typeof a === 'number' && typeof b === 'number') {
      return (a - b) * sign;
    }

    const leftValue = a instanceof Date ? a.getTime() : String(a ?? '').toLowerCase();
    const rightValue =
      b instanceof Date ? b.getTime() : String(b ?? '').toLowerCase();

    if (leftValue > rightValue) {
      return 1 * sign;
    }

    if (leftValue < rightValue) {
      return -1 * sign;
    }

    return 0;
  });
}

export async function assertNoActiveTorrents(
  prisma: {
    torrent?: {
      count: (input: { where: { status: { in: string[] } } }) => Promise<number>;
    };
  },
  context: string,
): Promise<void> {
  if (!prisma.torrent?.count) {
    return;
  }

  const activeCount = await prisma.torrent.count({
    where: {
      status: {
        in: ['downloading', 'seeding'],
      },
    },
  });

  if (activeCount > 0) {
    throw new ConflictError('Active torrents exist', { context, activeCount });
  }
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (!value) {
    throw new NotFoundError(message);
  }

  return value;
}
