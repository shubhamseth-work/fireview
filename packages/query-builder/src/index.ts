import {
  FirestoreQuery,
  QueryFilter,
  QueryOperator,
  OrderByClause,
  FirestoreValue,
} from '@vistiq/core';
import { QueryEngine, ValidationResult, createQueryEngine } from '@vistiq/query-engine';

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

export class QueryBuilder {
  private engine: QueryEngine;
  private state: QueryBuilderState;

  constructor(initialState?: Partial<QueryBuilderState>) {
    this.engine = createQueryEngine();
    this.state = {
      collectionPath: initialState?.collectionPath || '',
      collectionGroup: initialState?.collectionGroup || false,
      filters: initialState?.filters || [],
      orderBy: initialState?.orderBy || [],
      limit: initialState?.limit,
      offset: initialState?.offset,
    };
  }

  getState(): QueryBuilderState {
    return { ...this.state };
  }

  setCollectionPath(path: string): void {
    this.state.collectionPath = path;
  }

  setCollectionGroup(enabled: boolean): void {
    this.state.collectionGroup = enabled;
  }

  addFilter(field: string, operator: QueryOperator, value: FirestoreValue): void {
    this.state.filters.push({ field, operator, value });
  }

  removeFilter(index: number): void {
    this.state.filters.splice(index, 1);
  }

  updateFilter(index: number, filter: Partial<QueryFilter>): void {
    this.state.filters[index] = { ...this.state.filters[index], ...filter };
  }

  addOrderBy(field: string, direction: 'asc' | 'desc'): void {
    this.state.orderBy.push({ field, direction });
  }

  removeOrderBy(index: number): void {
    this.state.orderBy.splice(index, 1);
  }

  setLimit(limit: number | undefined): void {
    this.state.limit = limit;
  }

  setOffset(offset: number | undefined): void {
    this.state.offset = offset;
  }

  build(): FirestoreQuery {
    return this.engine.buildQuery(
      this.state.collectionPath,
      this.state.filters,
      this.state.orderBy,
      this.state.limit
    );
  }

  validate(): ValidationResult {
    return this.engine.validateQuery(this.build());
  }

  generateCode(language: 'typescript' | 'javascript' | 'python'): string {
    return this.engine.generateCode(this.build(), language);
  }

  reset(): void {
    this.state = {
      collectionPath: '',
      collectionGroup: false,
      filters: [],
      orderBy: [],
    };
  }

  loadFromQuery(query: FirestoreQuery): void {
    this.state.collectionPath = query.collectionPath;
    this.state.collectionGroup = query.collectionGroup || false;
    this.state.filters = [...query.filters];
    this.state.orderBy = [...query.orderBy];
    this.state.limit = query.limit;
    this.state.offset = query.offset;
  }
}

export function createQueryBuilder(initialState?: Partial<QueryBuilderState>): QueryBuilder {
  return new QueryBuilder(initialState);
}