import {
  BatchOperation,
  BatchStatus,
  BatchProgress,
  FirestoreDocument,
  FirestoreQuery,
  FirestoreValue,
} from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';

export class BatchService {
  private firestore: FirestoreConnection;
  private operations: Map<string, BatchOperation> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(firestore: FirestoreConnection) {
    this.firestore = firestore;
  }

  async createOperation(
    type: BatchOperation['type'],
    projectId: string,
    collectionPath: string,
    options: {
      documentIds?: string[];
      query?: FirestoreQuery;
      data?: Partial<FirestoreDocument>;
      destinationProjectId?: string;
      destinationCollectionPath?: string;
    }
  ): Promise<BatchOperation> {
    const id = crypto.randomUUID();
    const operation: BatchOperation = {
      id,
      type,
      projectId,
      collectionPath,
      documentIds: options.documentIds,
      query: options.query,
      data: options.data,
      destinationProjectId: options.destinationProjectId,
      destinationCollectionPath: options.destinationCollectionPath,
      status: 'pending',
      progress: {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      },
      createdAt: new Date().toISOString(),
    };

    this.operations.set(id, operation);
    return operation;
  }

  async execute(
    operationId: string,
    onProgress?: (progress: BatchProgress) => void
  ): Promise<BatchOperation> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new VistiqError('Operation not found', ERROR_CODES.VALIDATION_ERROR);
    }

    if (operation.status === 'running') {
      throw new VistiqError('Operation already running', ERROR_CODES.VALIDATION_ERROR);
    }

    const controller = new AbortController();
    this.abortControllers.set(operationId, controller);

    operation.status = 'running';
    operation.startedAt = new Date().toISOString();

    try {
      let documents: FirestoreDocument[] = [];

      if (operation.documentIds && operation.documentIds.length > 0) {
        for (const docId of operation.documentIds) {
          const doc = await this.firestore.getDocument(`${operation.collectionPath}/${docId}`);
          if (doc) documents.push(doc);
        }
      } else if (operation.query) {
        let hasMore = true;
        let nextPageToken: string | undefined;
        while (hasMore && !controller.signal.aborted) {
          const page = await this.firestore.runQuery({
            ...operation.query,
            collectionPath: operation.collectionPath,
          });
          documents.push(...page.documents);
          hasMore = page.hasMore;
          nextPageToken = page.nextPageToken;
        }
      }

      operation.progress.total = documents.length;
      this.updateOperation(operation);

      for (const doc of documents) {
        if (controller.signal.aborted) break;

        try {
          await this.executeDocumentOperation(operation, doc);
          operation.progress.succeeded++;
        } catch (error) {
          operation.progress.failed++;
          logger.error('Batch document operation failed', {
            operationId,
            documentId: doc.id,
            error: (error as Error).message,
          });
        }

        operation.progress.processed++;
        this.updateOperation(operation);
        onProgress?.({ ...operation.progress });
      }

      operation.status = operation.progress.failed > 0 && operation.progress.succeeded === 0
        ? 'failed'
        : 'completed';
      operation.completedAt = new Date().toISOString();
      this.updateOperation(operation);

      logger.info('Batch operation completed', { operationId, ...operation.progress });
      return operation;
    } catch (error) {
      operation.status = 'failed';
      operation.completedAt = new Date().toISOString();
      this.updateOperation(operation);
      throw error;
    } finally {
      this.abortControllers.delete(operationId);
    }
  }

  async cancel(operationId: string): Promise<void> {
    const controller = this.abortControllers.get(operationId);
    if (controller) {
      controller.abort();
    }
    const operation = this.operations.get(operationId);
    if (operation && operation.status === 'running') {
      operation.status = 'cancelled';
      operation.completedAt = new Date().toISOString();
      this.updateOperation(operation);
    }
  }

  async retryFailed(operationId: string): Promise<BatchOperation> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new VistiqError('Operation not found', ERROR_CODES.VALIDATION_ERROR);
    }

    operation.status = 'pending';
    operation.progress.failed = 0;
    operation.progress.processed = 0;
    operation.progress.succeeded = 0;
    this.updateOperation(operation);

    return this.execute(operationId);
  }

  getOperation(operationId: string): BatchOperation | undefined {
    return this.operations.get(operationId);
  }

  getAllOperations(): BatchOperation[] {
    return Array.from(this.operations.values());
  }

  private async executeDocumentOperation(
    operation: BatchOperation,
    doc: FirestoreDocument
  ): Promise<void> {
    switch (operation.type) {
      case 'delete':
        await this.firestore.deleteDocument(`${operation.collectionPath}/${doc.id}`);
        break;
      case 'update':
        if (operation.data) {
          await this.firestore.updateDocument(`${operation.collectionPath}/${doc.id}`, operation.data);
        }
        break;
      case 'create':
        if (operation.data) {
          await this.firestore.createDocument(operation.collectionPath, {
            ...doc,
            data: { ...doc.data, ...operation.data.data },
          } as FirestoreDocument, doc.id);
        }
        break;
      case 'copy':
        if (operation.destinationProjectId && operation.destinationCollectionPath) {
        }
        break;
    }
  }

  private updateOperation(operation: BatchOperation): void {
    this.operations.set(operation.id, operation);
  }
}

export function createBatchService(firestore: FirestoreConnection): BatchService {
  return new BatchService(firestore);
}