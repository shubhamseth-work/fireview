import { FirestoreQuery, QueryFilter, QueryOperator, OrderByClause, FirestoreValue } from '@vistiq/core';
import { ValidationResult } from '@vistiq/query-engine';
export interface QueryBuilderState {
    collectionPath: string;
    collectionGroup: boolean;
    filters: QueryFilter[];
    orderBy: OrderByClause[];
    limit?: number;
    offset?: number;
}
export interface QueryGroup {
    id: string;
    type: 'and' | 'or';
    filters: QueryFilter[];
    groups: QueryGroup[];
}
export declare class QueryBuilder {
    private engine;
    private state;
    constructor(initialState?: Partial<QueryBuilderState>);
    getState(): QueryBuilderState;
    setCollectionPath(path: string): void;
    setCollectionGroup(enabled: boolean): void;
    addFilter(field: string, operator: QueryOperator, value: FirestoreValue): void;
    removeFilter(index: number): void;
    updateFilter(index: number, filter: Partial<QueryFilter>): void;
    addOrderBy(field: string, direction: 'asc' | 'desc'): void;
    removeOrderBy(index: number): void;
    setLimit(limit: number | undefined): void;
    setOffset(offset: number | undefined): void;
    build(): FirestoreQuery;
    validate(): ValidationResult;
    generateCode(language: 'typescript' | 'javascript' | 'python'): string;
    reset(): void;
    loadFromQuery(query: FirestoreQuery): void;
}
export declare function createQueryBuilder(initialState?: Partial<QueryBuilderState>): QueryBuilder;
//# sourceMappingURL=index.d.ts.map