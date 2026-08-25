import { FirestoreConnection, CollectionInfo, QueryOptions, FirestoreQuery, DocumentPage, FirestoreDocument } from '@vistiq/core';
import { Firestore } from 'firebase-admin/firestore';
export declare class FirestoreService implements FirestoreConnection {
    private firestore;
    private projectId;
    constructor(firestore: Firestore, projectId: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    listCollections(): Promise<CollectionInfo[]>;
    listDocuments(collectionPath: string, options?: QueryOptions): Promise<DocumentPage>;
    getDocument(documentPath: string): Promise<FirestoreDocument | null>;
    createDocument(collectionPath: string, data: FirestoreDocument, documentId?: string): Promise<string>;
    updateDocument(documentPath: string, data: Partial<FirestoreDocument>): Promise<void>;
    deleteDocument(documentPath: string): Promise<void>;
    runQuery(query: FirestoreQuery): Promise<DocumentPage>;
    runCollectionGroupQuery(query: FirestoreQuery): Promise<DocumentPage>;
    private convertDocument;
    private convertToAdminData;
    private convertValue;
    private convertFromAdminData;
    private convertFromAdminValue;
    private handleError;
}
export declare function createFirestoreService(firestore: Firestore, projectId: string): FirestoreService;
export type { FirestoreConnection } from '@vistiq/core';
//# sourceMappingURL=index.d.ts.map