import {
  MigrationWorkflow,
  MigrationStep,
  MigrationStatus,
  MigrationDataSelection,
  MigrationPreview,
  MigrationResult,
  MigrationError,
  FirestoreQuery,
  FirestoreDocument,
} from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
import { BatchService, createBatchService } from '@vistiq/batch';
import { ProjectCompareService, createProjectCompareService } from '@vistiq/project-compare';
import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';

const MIGRATION_STEPS: MigrationStep[] = [
  'select-source',
  'select-destination',
  'select-data',
  'preview',
  'review-changes',
  'confirm',
  'execute',
  'results',
];

export class MigrationService {
  private sourceFirestore: FirestoreConnection;
  private destFirestore: FirestoreConnection;
  private batchService: BatchService;
  private compareService: ProjectCompareService;
  private workflows: Map<string, MigrationWorkflow> = new Map();

  constructor(
    sourceFirestore: FirestoreConnection,
    destFirestore: FirestoreConnection
  ) {
    this.sourceFirestore = sourceFirestore;
    this.destFirestore = destFirestore;
    this.batchService = createBatchService(destFirestore);
    this.compareService = createProjectCompareService(sourceFirestore, destFirestore);
  }

  createWorkflow(name: string, sourceProjectId: string, destinationProjectId: string): MigrationWorkflow {
    const workflow: MigrationWorkflow = {
      id: crypto.randomUUID(),
      name,
      sourceProjectId,
      destinationProjectId,
      steps: MIGRATION_STEPS,
      currentStep: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  getWorkflow(id: string): MigrationWorkflow | undefined {
    return this.workflows.get(id);
  }

  getAllWorkflows(): MigrationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  async setDataSelection(workflowId: string, selection: MigrationDataSelection): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new VistiqError('Workflow not found', ERROR_CODES.VALIDATION_ERROR);
    if (workflow.currentStep < 2) throw new VistiqError('Must complete previous steps first', ERROR_CODES.VALIDATION_ERROR);

    workflow.currentStep = 3;
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(workflowId, workflow);
  }

  async preview(workflowId: string): Promise<MigrationPreview> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new VistiqError('Workflow not found', ERROR_CODES.VALIDATION_ERROR);

    let documents: FirestoreDocument[] = [];

    if (workflow.currentStep < 3) {
      throw new VistiqError('Data selection required', ERROR_CODES.VALIDATION_ERROR);
    }

    const selection = (workflow as any).selection as MigrationDataSelection;
    documents = await this.fetchDocuments(selection);

    const preview = await this.generatePreview(documents);
    workflow.currentStep = 4;
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(workflowId, workflow);

    return preview;
  }

  async execute(
    workflowId: string,
    onProgress?: (progress: { processed: number; succeeded: number; failed: number }) => void
  ): Promise<MigrationResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new VistiqError('Workflow not found', ERROR_CODES.VALIDATION_ERROR);

    workflow.status = 'in-progress';
    workflow.currentStep = 6;
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(workflowId, workflow);

    const selection = (workflow as any).selection as MigrationDataSelection;
    const documents = await this.fetchDocuments(selection);

    const startTime = Date.now();
    const errors: MigrationError[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const doc of documents) {
      try {
        const docPath = `${workflow.destinationProjectId}/${selection.collectionPath}/${doc.id}`;
        await this.destFirestore.createDocument(
          selection.collectionPath || '',
          doc,
          doc.id
        );
        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          documentId: doc.id,
          operation: 'create',
          error: (error as Error).message,
          retryable: true,
        });
      }

      onProgress?.({ processed: succeeded + failed, succeeded, failed });
    }

    const result: MigrationResult = {
      success: failed === 0,
      processed: documents.length,
      succeeded,
      failed,
      errors,
      duration: Date.now() - startTime,
    };

    workflow.status = result.success ? 'completed' : 'failed';
    workflow.currentStep = 7;
    workflow.updatedAt = new Date().toISOString();
    this.workflows.set(workflowId, workflow);

    logger.info('Migration completed', { workflowId, ...result });
    return result;
  }

  cancel(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.status = 'cancelled';
      workflow.updatedAt = new Date().toISOString();
      this.workflows.set(workflowId, workflow);
    }
  }

  private async fetchDocuments(selection: MigrationDataSelection): Promise<FirestoreDocument[]> {
    const documents: FirestoreDocument[] = [];

    if (selection.type === 'documents' && selection.documentIds) {
      for (const docId of selection.documentIds) {
        const doc = await this.sourceFirestore.getDocument(
          `${selection.collectionPath}/${docId}`
        );
        if (doc) documents.push(doc);
      }
    } else if (selection.type === 'collection' || selection.type === 'tree') {
      let hasMore = true;
      let nextPageToken: string | undefined;
      while (hasMore) {
        const page = await this.sourceFirestore.listDocuments(
          selection.collectionPath || '',
          { limit: 500 }
        );
        documents.push(...page.documents);
        hasMore = page.hasMore;
        nextPageToken = page.nextPageToken;
      }
    } else if (selection.type === 'query' && selection.query) {
      let hasMore = true;
      let nextPageToken: string | undefined;
      while (hasMore) {
        const page = await this.sourceFirestore.runQuery({
          ...selection.query,
          collectionPath: selection.collectionPath || '',
        });
        documents.push(...page.documents);
        hasMore = page.hasMore;
        nextPageToken = page.nextPageToken;
      }
    }

    return documents;
  }

  private async generatePreview(documents: FirestoreDocument[]): Promise<MigrationPreview> {
    let conflicts = 0;
    let newDocuments = 0;
    let existingDocuments = 0;

    for (const doc of documents) {
      const existing = await this.destFirestore.getDocument(doc.path);
      if (!existing) {
        newDocuments++;
      } else {
        existingDocuments++;
        const hasConflicts = this.hasConflicts(doc.data, existing.data);
        if (hasConflicts) conflicts++;
      }
    }

    return {
      totalDocuments: documents.length,
      estimatedWrites: documents.length,
      conflicts,
      newDocuments,
      existingDocuments,
    };
  }

  private hasConflicts(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    for (const key of Object.keys(a)) {
      if (key in b && JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        return true;
      }
    }
    return false;
  }
}

export function createMigrationService(
  sourceFirestore: FirestoreConnection,
  destFirestore: FirestoreConnection
): MigrationService {
  return new MigrationService(sourceFirestore, destFirestore);
}