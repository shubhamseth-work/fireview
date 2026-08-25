import React from 'react';
import { FirestoreDocument, FirestoreQuery } from '@vistiq/core';
interface DocumentTableProps {
    documents: FirestoreDocument[];
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        hasMore: boolean;
        nextToken: string;
    };
    onRowClick: (doc: FirestoreDocument) => void;
    onRunQuery: (query: FirestoreQuery) => void;
}
export declare const DocumentTable: React.FC<DocumentTableProps>;
export {};
//# sourceMappingURL=DocumentTable.d.ts.map