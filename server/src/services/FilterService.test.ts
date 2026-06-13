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
      expect(result[0].name).toBe('Active Series');
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
      expect(result[0].id).toBe(1);
    });

    it('excludes items not matching conditions', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'monitored', operator: 'equals', value: false }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
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
      expect(result[0].id).toBe(1);
    });

    it('filters by genre (array field) with contains operator', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'genre', operator: 'contains', value: 'Drama' }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
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
      expect(result[0].id).toBe(1);
    });

    it('uses ratings.value when rating is an object', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'rating', operator: 'lessThan', value: 7 }],
      };
      const result = service.applyToSeries(items, group);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
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
      expect(result[0].id).toBe(1);
    });

    it('filters by protocol', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'protocol', operator: 'equals', value: 'torrent' }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('filters by derived capability from supportsRss', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'capability', operator: 'equals', value: 'rss' }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('filters by priority with greaterThan', () => {
      const group: FilterConditionsGroup = {
        operator: 'and',
        conditions: [{ field: 'priority', operator: 'greaterThan', value: 6 }],
      };
      const result = service.applyToIndexers(indexers, group);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
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
      expect(result[0].id).toBe(1);
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
  });
});
