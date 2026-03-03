import { ApiHttpClient } from './httpClient';
export declare const filterOperatorValues: readonly ["equals", "notEquals", "contains", "notContains", "greaterThan", "lessThan"];
export declare const filterFieldValues: readonly ["monitored", "network", "genre", "tag", "rating", "status", "protocol", "enabled", "capability", "priority"];
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
export declare function createFiltersApi(client: ApiHttpClient): {
    list(type?: FilterTargetType): Promise<CustomFilter[]>;
    create(input: {
        name: string;
        type?: FilterTargetType;
        conditions: FilterConditionsGroup;
    }): Promise<CustomFilter>;
    update(id: number, input: {
        name?: string;
        conditions?: FilterConditionsGroup;
    }): Promise<CustomFilter>;
    delete(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
};
//# sourceMappingURL=filters.d.ts.map