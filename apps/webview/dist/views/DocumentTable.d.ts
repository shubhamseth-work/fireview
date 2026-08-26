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
        pageSize: number;
    };
    onRowClick: (doc: FirestoreDocument) => void;
    onRunQuery: (query: FirestoreQuery) => void;
    onLoadMore: () => void;
    onPageSizeChange: (pageSize: number) => void;
    onCopyDocument: (doc: FirestoreDocument) => void;
    onCopyDocumentTo: (doc: FirestoreDocument, targetCollection: string) => void;
    onOpenDocument: (doc: FirestoreDocument) => void;
    onDeleteDocument: (documentPath: string) => void;
    onDuplicateDocument: (doc: FirestoreDocument) => void;
    onRenameDocument: (doc: FirestoreDocument, newId: string) => void;
    onMoveDocument: (doc: FirestoreDocument, targetCollection: string) => void;
    onShowGeopoints: (doc: FirestoreDocument) => void;
    onImportDocument: (doc: FirestoreDocument) => void;
    onExportDocument: (doc: FirestoreDocument) => void;
    onRevealInConsole: (doc: FirestoreDocument) => void;
}
export declare const DocumentTable: React.FC<DocumentTableProps>;
export {};
//# sourceMappingURL=DocumentTable.d.ts.map