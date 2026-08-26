import React from 'react';
import { FirestoreDocument, FirestoreQuery } from '@vistiq/core';
import { Connection } from '@vistiq/core';
interface FirestoreViewProps {
    connection: Connection;
    collections: any[];
    documents: FirestoreDocument[];
    selectedDocument: FirestoreDocument | null;
    loading: boolean;
    error: string | null;
    pagination: {
        page: number;
        hasMore: boolean;
        nextToken: string;
        pageSize: number;
    };
    onLoadDocuments: (collectionPath: string, pageSize?: number) => void;
    onOpenDocument: (doc: FirestoreDocument) => void;
    onCloseDocument: () => void;
    onRunQuery: (query: FirestoreQuery) => void;
    onCreateDocument: (collectionPath: string, data: FirestoreDocument) => void;
    onUpdateDocument: (documentPath: string, data: Partial<FirestoreDocument>) => void;
    onDeleteDocument: (documentPath: string) => void;
    onExportCollection: (collectionPath: string, format: 'json' | 'csv', outputPath: string) => void;
    onImportCollection: (collectionPath: string, format: 'json' | 'csv', mode: 'create' | 'update' | 'upsert', inputPath: string) => void;
    onLoadMore: () => void;
    onPageSizeChange: (pageSize: number) => void;
    onCopyDocument: (doc: FirestoreDocument) => void;
    onCopyDocumentTo: (doc: FirestoreDocument, targetCollection: string) => void;
    onDuplicateDocument: (doc: FirestoreDocument) => void;
    onRenameDocument: (doc: FirestoreDocument, newId: string) => void;
    onMoveDocument: (doc: FirestoreDocument, targetCollection: string) => void;
    onShowGeopoints: (doc: FirestoreDocument) => void;
    onImportDocument: (doc: FirestoreDocument) => void;
    onExportDocument: (doc: FirestoreDocument) => void;
    onRevealInConsole: (doc: FirestoreDocument) => void;
}
export declare const FirestoreView: React.FC<FirestoreViewProps>;
export {};
//# sourceMappingURL=FirestoreView.d.ts.map