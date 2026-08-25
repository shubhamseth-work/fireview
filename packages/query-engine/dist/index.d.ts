import { FirestoreQuery, QueryFilter, QueryOperator, OrderByClause } from '@vistiq/core';
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    code: string;
    message: string;
    field?: string;
    operator?: QueryOperator;
}
export interface ValidationWarning {
    code: string;
    message: string;
    field?: string;
}
export declare class QueryEngine {
    validateQuery(query: FirestoreQuery): ValidationResult;
    buildQuery(collectionPath: string, filters: QueryFilter[], orderBy: OrderByClause[], limit?: number): FirestoreQuery;
    generateCode(query: FirestoreQuery, language: 'typescript' | 'javascript' | 'python'): string;
    private serializeValue;
}
export declare function createQueryEngine(): QueryEngine;
//# sourceMappingURL=index.d.ts.map