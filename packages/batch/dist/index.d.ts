import { BatchOperation, BatchProgress, FirestoreDocument, FirestoreQuery } from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
export declare class BatchService {
    private firestore;
    private operations;
    private abortControllers;
    constructor(firestore: FirestoreConnection);
    createOperation(type: BatchOperation['type'], projectId: string, collectionPath: string, options: {
        documentIds?: string[];
        query?: FirestoreQuery;
        data?: Partial<FirestoreDocument>;
        destinationProjectId?: string;
        destinationCollectionPath?: string;
    }): Promise<BatchOperation>;
    execute(operationId: string, onProgress?: (progress: BatchProgress) => void): Promise<BatchOperation>;
    cancel(operationId: string): Promise<void>;
    retryFailed(operationId: string): Promise<BatchOperation>;
    getOperation(operationId: string): BatchOperation | undefined;
    getAllOperations(): BatchOperation[];
    private executeDocumentOperation;
    private updateOperation;
}
export declare function createBatchService(firestore: FirestoreConnection): BatchService;
//# sourceMappingURL=index.d.ts.map