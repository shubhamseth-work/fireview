import React from 'react';
import { FirestoreDocument } from '@vistiq/core';
import { Connection } from '@vistiq/core';
interface DocumentViewerProps {
    document: FirestoreDocument;
    connection: Connection;
    onClose: () => void;
    onUpdate: (documentPath: string, data: Partial<FirestoreDocument>) => void;
    onCreateDocument: (collectionPath: string, data: FirestoreDocument) => void;
    onDelete: (documentPath: string) => void;
}
export declare const DocumentViewer: React.FC<DocumentViewerProps>;
export {};
//# sourceMappingURL=DocumentViewer.d.ts.map