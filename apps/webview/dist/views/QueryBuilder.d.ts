import React from 'react';
import { QueryFilter, OrderByClause } from '@vistiq/core';
interface QueryBuilderProps {
    collections: any[];
    onRunQuery: (query: FirestoreQuery) => void;
    onClose: () => void;
}
interface FirestoreQuery {
    collectionPath: string;
    collectionGroup?: boolean;
    filters: QueryFilter[];
    orderBy: OrderByClause[];
    limit?: number;
    offset?: number;
}
export declare const QueryBuilder: React.FC<QueryBuilderProps>;
export {};
//# sourceMappingURL=QueryBuilder.d.ts.map