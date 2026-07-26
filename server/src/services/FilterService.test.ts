import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FilterService,
  type FilterConditionsGroup,
  type CreateCustomFilterInput,
} from './FilterService';
import { NotFoundError, ValidationError } from '../errors/domainErrors';

function makePrismaMock() {
  return {
    customFilter: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

const validSeriesGroup: FilterConditionsGroup = {
  operator: 'and',
  conditions: [{ field: 'monitored', operator: 'equals', value: true }],
};

const validIndexerGroup: FilterConditionsGroup = {
  operator: 'and',
  conditions: [{ field: 'enabled', operator: 'equals', value: true }],
};

describe('FilterService', () => {
  let prisma: ReturnType<typeof makePrismaMock>;
  let service: FilterService;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new FilterService(prisma as unknown as Record<string, any>);
  });

  describe('list', () => {
    it('returns mapped records from prisma', async () => {
      const rows = [
        {
          id: 1,
          name: 'Active Series',
          type: 'series',
          conditions: validSeriesGroup,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.customFilter.findMany.mockResolvedValue(rows);

      const result = await service.list('series');

      expect(prisma.customFilter.findMany).toHaveBeenCalledWith({
        where: { type: 'series' },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('Active Series');
    });

    it('throws ValidationError when stored conditions are invalid', async () => {
      prisma.customFilter.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Bad',
          type: 'series',
          conditions: { operator: 'bad', conditions: [] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      await expect(service.list('series')).rejects.toThrow(ValidationError);
    });
  });

  describe('create', () => {
    it('trims name and delegates to prisma', async () => {
      const input: CreateCustomFilterInput = {
        name: '  My Filter  ',
        type: 'series',
        conditions: validSeriesGroup,
      };
      prisma.customFilter.create.mockResolvedValue({
        id: 1,
        name: 'My Filter',
        type: 'series',
        conditions: validSeriesGroup,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(input);

      expect(prisma.customFilter.create).toHaveBeenCalledWith({
        data: {
          name: 'My Filter',
          type: 'series',
          conditions: validSeriesGroup,
        },
      });
      expect(result.name).toBe('My Filter');
    });

    it('throws ValidationError when name is whitespace only', async () => {
      await expect(
        service.create({ name: '   ', type: 'series', conditions: validSeriesGroup }),
      ).rejects.toThrow('name is required');
    });

    it('throws ValidationError when conditions are invalid', async () => {
      await expect(
        service.create({
          name: 'test',
          type: 'series',
          conditions: { operator: 'and', conditions: [] },
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('updates name and conditions on an existing filter', async () => {
      prisma.customFilter.findUnique.mockResolvedValue({
        id: 1,
        name: 'Old',
        type: 'series',
        conditions: validSeriesGroup,
      });
      prisma.customFilter.update.mockResolvedValue({
        id: 1,
        name: 'New',
        type: 'series',
        conditions: validSeriesGroup,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(1, { name: 'New' });

      expect(prisma.customFilter.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'New' },
      });
      expect(result.name).toBe('New');
    });

    it('throws NotFoundError when filter does not exist', async () => {
      prisma.customFilter.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { name: 'X' })).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when name is empty string', async () => {
      prisma.customFilter.findUnique.mockResolvedValue({
        id: 1,
        type: 'series',
        conditions: validSeriesGroup,
      });

      await expect(service.update(1, { name: '' })).rejects.toThrow(
        'name cannot be empty',
      );
    });

    it('throws ValidationError when updated conditions are invalid', async () => {
      prisma.customFilter.findUnique.mockResolvedValue({
        id: 1,
        type: 'series',
        conditions: validSeriesGroup,
      });

      await expect(
        service.update(1, {
          conditions: { operator: 'and', conditions: [] },
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('updates conditions only when name is not provided', async () => {
      const newConditions: FilterConditionsGroup = {
        operator: 'or',
        conditions: [{ field: 'network', operator: 'equals', value: 'HBO' }],
      };
      prisma.customFilter.findUnique.mockResolvedValue({
        id: 1,
        type: 'series',
        conditions: validSeriesGroup,
      });
      prisma.customFilter.update.mockResolvedValue({
        id: 1,
        name: 'Old',
        type: 'series',
        conditions: newConditions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.update(1, { conditions: newConditions });

      expect(prisma.customFilter.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { conditions: newConditions },
      });
      expect(result.conditions).toEqual(newConditions);
    });
  });

  describe('validateConditionsGroup (via create)', () => {
    it('throws ValidationError when conditions is not an object', async () => {
      await expect(
        service.create({ name: 'x', type: 'series', conditions: 'nope' as unknown as FilterConditionsGroup }),
      ).rejects.toThrow('conditions must be an object');
    });

    it('throws ValidationError when conditions is null', async () => {
      await expect(
        service.create({ name: 'x', type: 'series', conditions: null as unknown as FilterConditionsGroup }),
      ).rejects.toThrow('conditions must be an object');
    });

    it('throws ValidationError when a condition entry is not an object', async () => {
      await expect(
        service.create({
          name: 'x',
          type: 'series',
          conditions: { operator: 'and', conditions: [null] } as unknown as FilterConditionsGroup,
        }),
      ).rejects.toThrow('condition 1 must be an object');
    });

    it('throws ValidationError when a condition has an invalid field', async () => {
      await expect(
        service.create({
          name: 'x',
          type: 'series',
          conditions: {
            operator: 'and',
            conditions: [{ field: 'bogus', operator: 'equals', value: 'x' }],
          } as unknown as FilterConditionsGroup,
        }),
      ).rejects.toThrow('condition 1 has invalid field');
    });

    it('throws ValidationError when a condition has an invalid operator', async () => {
      await expect(
        service.create({
          name: 'x',
          type: 'series',
          conditions: {
            operator: 'and',
            conditions: [{ field: 'monitored', operator: 'bogus', value: true }],
          } as unknown as FilterConditionsGroup,
        }),
      ).rejects.toThrow('condition 1 has invalid operator');
    });

    it('throws ValidationError when a condition value is missing (empty string)', async () => {
      await expect(
        service.create({
          name: 'x',
          type: 'series',
          conditions: {
            operator: 'and',
            conditions: [{ field: 'monitored', operator: 'equals', value: '' }],
          },
        }),
      ).rejects.toThrow('condition 1 is missing a value');
    });

    it('throws ValidationError when a condition value is null', async () => {
      await expect(
        service.create({
          name: 'x',
          type: 'series',
          conditions: {
            operator: 'and',
            conditions: [{ field: 'monitored', operator: 'equals', value: null }],
          } as unknown as FilterConditionsGroup,
        }),
      ).rejects.toThrow('condition 1 is missing a value');
    });
  });

  describe('delete', () => {
    it('deletes and returns confirmation', async () => {
      prisma.customFilter.findUnique.mockResolvedValue({ id: 1 });
      prisma.customFilter.delete.mockResolvedValue({});

      const result = await service.delete(1);

      expect(prisma.customFilter.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ id: 1, deleted: true });
    });

    it('throws NotFoundError when filter does not exist', async () => {
      prisma.customFilter.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('applyToSeries', () => {
    const items = [
      { id: 1, monitored: true, genres: ['Drama'], status: 'continuing', ratings: { value: 8.5 } },
      { id: 2, monitored: false, genres: ['Comedy'], status: 'ended', ratings: { value: 6.0 } },
    ];

    it('includes items matching "and" conditions', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'monitored', operator: 'equals', value: true }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('excludes items not matching conditions', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'monitored', operator: 'equals', value: false }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('applies "or" operator across conditions', () => {
      const group: FilterConditionsGroup = {
        operator: 'or',
        conditions: [
          { field: 'status', operator: 'equals', value: 'ended' },
          { field: 'monitored', operator: 'equals', value: true },
        ],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(2);
    });

    it('returns all items when conditions array is empty', () => {
      const group: FilterConditionsGroup = { operator: 'and', conditions: [] };
      const result = service.applyToSeries(items, group);
      expect(result).toEqual(items);
    });

    it('filters by rating with greaterThan operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'greaterThan', value: 7 }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('filters by genre (array field) with contains operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'genre', operator: 'contains', value: 'Drama' }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('filters by network (string field) with equals operator', () => {
      const networkItems = [
        { id: 1, network: 'HBO' },
        { id: 2, network: 'Netflix' },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'network', operator: 'equals', value: 'hbo' }],
      };
      const result = service.applyToSeries(networkItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('uses ratings.value when rating is an object', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'lessThan', value: 7 }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('matches monitored with notEquals operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'monitored', operator: 'notEquals', value: true }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('normalizes string and numeric monitored values', () => {
      const stringItems = [
        { id: 1, monitored: 'yes' },
        { id: 2, monitored: 0 },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'monitored', operator: 'equals', value: 'true' }],
      };
      const result = service.applyToSeries(stringItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('returns false for monitored with an unsupported operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'monitored', operator: 'contains', value: true }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(0);
    });

    it('matches rating with equals and notEquals operators', () => {
      const equalsGroup: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'equals', value: 8.5 }],
      };
      expect(service.applyToSeries(items, equalsGroup)).toHaveLength(1);

      const notEqualsGroup: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'notEquals', value: 8.5 }],
      };
      expect(service.applyToSeries(items, notEqualsGroup)).toHaveLength(1);
    });

    it('reads a numeric rating stored directly on the item', () => {
      const directRatingItems = [{ id: 1, rating: 9 }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'equals', value: 9 }],
      };
      const result = service.applyToSeries(directRatingItems, group);
      expect(result).toHaveLength(1);
    });

    it('returns false for rating when actual or expected value is not finite', () => {
      const badRatingItems = [{ id: 1, rating: 'not-a-number' }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'equals', value: 5 }],
      };
      const result = service.applyToSeries(badRatingItems, group);
      expect(result).toHaveLength(0);
    });

    it('returns false for rating with an unsupported operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'contains', value: 8.5 }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(0);
    });

    it('treats a missing rating as undefined', () => {
      const noRatingItems = [{ id: 1 }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'equals', value: 5 }],
      };
      const result = service.applyToSeries(noRatingItems, group);
      expect(result).toHaveLength(0);
    });

    it('filters by tag field', () => {
      const tagItems = [
        { id: 1, tags: ['favorite', 'hd'] },
        { id: 2, tags: ['archived'] },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: 'favorite' }],
      };
      const result = service.applyToSeries(tagItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('matches string fields with notEquals operator', () => {
      const networkItems = [
        { id: 1, network: 'HBO' },
        { id: 2, network: 'Netflix' },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'network', operator: 'notEquals', value: 'hbo' }],
      };
      const result = service.applyToSeries(networkItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('matches string fields with contains operator', () => {
      const statusItems = [
        { id: 1, status: 'continuing' },
        { id: 2, status: 'ended' },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'status', operator: 'contains', value: 'end' }],
      };
      const result = service.applyToSeries(statusItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('matches string fields with notContains operator', () => {
      const networkItems = [
        { id: 1, network: 'HBO' },
        { id: 2, network: 'Netflix' },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'network', operator: 'notContains', value: 'hbo' }],
      };
      const result = service.applyToSeries(networkItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('returns false for string fields with an unsupported operator', () => {
      const networkItems = [{ id: 1, network: 'HBO' }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'network', operator: 'greaterThan', value: 'hbo' }],
      };
      const result = service.applyToSeries(networkItems, group);
      expect(result).toHaveLength(0);
    });

    it('matches array fields with notEquals and notContains operators', () => {
      const notEqualsGroup: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'genre', operator: 'notEquals', value: 'Drama' }],
      };
      expect(service.applyToSeries(items, notEqualsGroup)).toHaveLength(1);

      const notContainsGroup: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'genre', operator: 'notContains', value: 'Drama' }],
      };
      expect(service.applyToSeries(items, notContainsGroup)).toHaveLength(1);
    });

    it('returns false for array fields with an unsupported operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'genre', operator: 'greaterThan', value: 'Drama' }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(0);
    });

    it('excludes all items for an unknown/unsupported field', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'bogusField' as unknown as 'network', operator: 'equals', value: 'x' }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(0);
    });

    it('treats a nullish condition value as an empty string on generic fields', () => {
      // applyToSeries does not re-validate conditions, so a caller bypassing
      // validateConditionsGroup could still supply a nullish value here.
      const statusItems = [{ id: 1, status: '' }, { id: 2, status: 'ended' }];
      const group = {
        operator: 'and' as const,
        conditions: [{ field: 'status', operator: 'equals', value: undefined }],
      } as unknown as FilterConditionsGroup;
      const result = service.applyToSeries(statusItems, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });
  });

  describe('applyToIndexers', () => {
    const indexers = [
      { id: 1, enabled: true, protocol: 'torrent', supportsRss: true, priority: 5 },
      { id: 2, enabled: false, protocol: 'usenet', supportsRss: false, priority: 10 },
    ];

    it('includes indexers matching enabled condition', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'enabled', operator: 'equals', value: true }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('filters by protocol', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'protocol', operator: 'equals', value: 'torrent' }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('filters by derived capability from supportsRss', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'capability', operator: 'equals', value: 'rss' }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('filters by priority with greaterThan', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'priority', operator: 'greaterThan', value: 6 }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('filters by tag from settings JSON', () => {
      const tagIndexers = [
        { id: 1, settings: '{"tags":["movies","4k"]}' },
        { id: 2, settings: '{"tag":"tv"}' },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: 'movies' }],
      };
      const result = service.applyToIndexers(tagIndexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('returns all indexers when conditions array is empty', () => {
      const group: FilterConditionsGroup = { operator: 'and', conditions: [] };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toEqual(indexers);
    });

    it('handles malformed settings JSON gracefully', () => {
      const tagIndexers = [{ id: 1, settings: 'not-json' }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: 'anything' }],
      };
      const result = service.applyToIndexers(tagIndexers, group);
      expect(result).toHaveLength(0);
    });

    it('applies "or" operator across indexer conditions', () => {
      const group: FilterConditionsGroup = {
        operator: 'or',
        conditions: [
          { field: 'protocol', operator: 'equals', value: 'usenet' },
          { field: 'priority', operator: 'greaterThan', value: 100 },
        ],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('matches enabled with notEquals operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'enabled', operator: 'notEquals', value: true }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(2);
    });

    it('returns false for enabled with an unsupported operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'enabled', operator: 'contains', value: true }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(0);
    });

    it('matches priority with equals, notEquals, and lessThan operators', () => {
      expect(
        service.applyToIndexers(indexers, {
          operator: 'and',
          conditions: [{ field: 'priority', operator: 'equals', value: 5 }],
        }),
      ).toHaveLength(1);

      expect(
        service.applyToIndexers(indexers, {
          operator: 'and',
          conditions: [{ field: 'priority', operator: 'notEquals', value: 5 }],
        }),
      ).toHaveLength(1);

      const lessThanResult = service.applyToIndexers(indexers, {
        operator: 'and',
        conditions: [{ field: 'priority', operator: 'lessThan', value: 6 }],
      });
      expect(lessThanResult).toHaveLength(1);
      expect(lessThanResult[0]!.id).toBe(1);
    });

    it('returns false for priority when value is not finite', () => {
      const badPriorityIndexers = [{ id: 1, priority: 'not-a-number' }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'priority', operator: 'equals', value: 5 }],
      };
      const result = service.applyToIndexers(badPriorityIndexers, group);
      expect(result).toHaveLength(0);
    });

    it('returns false for priority with an unsupported operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'priority', operator: 'contains', value: 5 }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(0);
    });

    it('filters by capability using an explicit capabilities array', () => {
      const capIndexers = [
        { id: 1, capabilities: ['RSS', 'Search'] },
        { id: 2, capabilities: ['search'] },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'capability', operator: 'equals', value: 'rss' }],
      };
      const result = service.applyToIndexers(capIndexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('derives the "search" capability from supportsSearch', () => {
      const searchIndexers = [
        { id: 1, supportsSearch: true },
        { id: 2, supportsSearch: false },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'capability', operator: 'equals', value: 'search' }],
      };
      const result = service.applyToIndexers(searchIndexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('filters by tag using a direct tags array on the item', () => {
      const tagIndexers = [
        { id: 1, tags: ['Movies', '4K'] },
        { id: 2, tags: ['tv'] },
      ];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: 'movies' }],
      };
      const result = service.applyToIndexers(tagIndexers, group);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it('returns no tags when there are no direct tags and no settings', () => {
      const tagIndexers = [{ id: 1 }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: 'movies' }],
      };
      const result = service.applyToIndexers(tagIndexers, group);
      expect(result).toHaveLength(0);
    });

    it('returns no tags when settings JSON has neither tags nor tag properties', () => {
      const tagIndexers = [{ id: 1, settings: '{"other":1}' }];
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: 'movies' }],
      };
      const result = service.applyToIndexers(tagIndexers, group);
      expect(result).toHaveLength(0);
    });

    it('excludes all indexers for an unknown/unsupported field', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'bogusField' as unknown as 'protocol', operator: 'equals', value: 'x' }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(0);
    });

    it('treats a nullish condition value as an empty string for capability/tag/protocol', () => {
      // applyToIndexers does not re-validate conditions, so a caller bypassing
      // validateConditionsGroup could still supply a nullish value here.
      const bareIndexer = [{ id: 1 }];

      // capabilities/tags derive to an empty array with no source data, so
      // `.some(...)` over an empty array is always false regardless of the
      // (nullish-coalesced) expected value.
      const capabilityResult = service.applyToIndexers(bareIndexer, {
        operator: 'and',
        conditions: [{ field: 'capability', operator: 'equals', value: undefined }],
      } as unknown as FilterConditionsGroup);
      expect(capabilityResult).toHaveLength(0);

      const tagResult = service.applyToIndexers(bareIndexer, {
        operator: 'and',
        conditions: [{ field: 'tag', operator: 'equals', value: undefined }],
      } as unknown as FilterConditionsGroup);
      expect(tagResult).toHaveLength(0);

      const protocolResult = service.applyToIndexers(bareIndexer, {
        operator: 'and',
        conditions: [{ field: 'protocol', operator: 'equals', value: undefined }],
      } as unknown as FilterConditionsGroup);
      expect(protocolResult).toHaveLength(1);
    });
  });
});
