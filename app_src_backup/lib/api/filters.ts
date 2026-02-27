import { z } from 'zod';
import { ApiHttpClient } from './httpClient';
import { routeMap } from './routeMap';

export const filterOperatorValues = [
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'greaterThan',
  'lessThan',
] as const;

export const filterFieldValues = [
  'monitored',
  'network',
  'genre',
  'tag',
  'rating',
  'status',
  'protocol',
  'enabled',
  'capability',
  'priority',
] as const;

export type FilterOperator = (typeof filterOperatorValues)[number];
export type FilterField = (typeof filterFieldValues)[number];
export type FilterTargetType = 'series' | 'indexer';

export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string | number | boolean;
}

export interface FilterConditionsGroup {
  operator: 'and' | 'or';
  conditions: FilterCondition[];
}

export interface CustomFilter {
  id: number;
  name: string;
  type: FilterTargetType;
  conditions: FilterConditionsGroup;
  createdAt: string;
  updatedAt: string;
}

const filterConditionSchema = z.object({
  field: z.enum(filterFieldValues),
  operator: z.enum(filterOperatorValues),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

const filterConditionsGroupSchema = z.object({
  operator: z.union([z.literal('and'), z.literal('or')]),
  conditions: z.array(filterConditionSchema),
});

const customFilterSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.union([z.literal('series'), z.literal('indexer')]),
  conditions: filterConditionsGroupSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export function createFiltersApi(client: ApiHttpClient) {
  return {
    list(type: FilterTargetType = 'series'): Promise<CustomFilter[]> {
      return client.request(
        {
          path: routeMap.filtersCustom,
          query: { type },
        },
        z.array(customFilterSchema),
      );
    },

    create(input: {
      name: string;
      type?: FilterTargetType;
      conditions: FilterConditionsGroup;
    }): Promise<CustomFilter> {
      return client.request(
        {
          path: routeMap.filtersCustom,
          method: 'POST',
          body: {
            name: input.name,
            type: input.type ?? 'series',
            conditions: input.conditions,
          },
        },
        customFilterSchema,
      );
    },

    update(id: number, input: { name?: string; conditions?: FilterConditionsGroup }): Promise<CustomFilter> {
      return client.request(
        {
          path: routeMap.filterCustomDetail(id),
          method: 'PUT',
          body: input,
        },
        customFilterSchema,
      );
    },

    delete(id: number): Promise<{ id: number; deleted: boolean }> {
      return client.request(
        {
          path: routeMap.filterCustomDetail(id),
          method: 'DELETE',
        },
        z.object({
          id: z.number(),
          deleted: z.boolean(),
        }),
      );
    },
  };
}
