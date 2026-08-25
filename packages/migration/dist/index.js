import { createBatchService } from '@vistiq/batch';
import { createProjectCompareService } from '@vistiq/project-compare';
import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';
const MIGRATION_STEPS = [
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
    sourceFirestore;
    destFirestore;
    batchService;
    compareService;
    workflows = new Map();
    constructor(sourceFirestore, destFirestore) {
        this.sourceFirestore = sourceFirestore;
        this.destFirestore = destFirestore;
        this.batchService = createBatchService(destFirestore);
        this.compareService = createProjectCompareService(sourceFirestore, destFirestore);
    }
    createWorkflow(name, sourceProjectId, destinationProjectId) {
        const workflow = {
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
    getWorkflow(id) {
        return this.workflows.get(id);
    }
    getAllWorkflows() {
        return Array.from(this.workflows.values());
    }
    async setDataSelection(workflowId, selection) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            throw new VistiqError('Workflow not found', ERROR_CODES.VALIDATION_ERROR);
        if (workflow.currentStep < 2)
            throw new VistiqError('Must complete previous steps first', ERROR_CODES.VALIDATION_ERROR);
        workflow.currentStep = 3;
        workflow.updatedAt = new Date().toISOString();
        this.workflows.set(workflowId, workflow);
    }
    async preview(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            throw new VistiqError('Workflow not found', ERROR_CODES.VALIDATION_ERROR);
        let documents = [];
        if (workflow.currentStep < 3) {
            throw new VistiqError('Data selection required', ERROR_CODES.VALIDATION_ERROR);
        }
        const selection = workflow.selection;
        documents = await this.fetchDocuments(selection);
        const preview = await this.generatePreview(documents);
        workflow.currentStep = 4;
        workflow.updatedAt = new Date().toISOString();
        this.workflows.set(workflowId, workflow);
        return preview;
    }
    async execute(workflowId, onProgress) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow)
            throw new VistiqError('Workflow not found', ERROR_CODES.VALIDATION_ERROR);
        workflow.status = 'in-progress';
        workflow.currentStep = 6;
        workflow.updatedAt = new Date().toISOString();
        this.workflows.set(workflowId, workflow);
        const selection = workflow.selection;
        const documents = await this.fetchDocuments(selection);
        const startTime = Date.now();
        const errors = [];
        let succeeded = 0;
        let failed = 0;
        for (const doc of documents) {
            try {
                const docPath = `${workflow.destinationProjectId}/${selection.collectionPath}/${doc.id}`;
                await this.destFirestore.createDocument(selection.collectionPath || '', doc, doc.id);
                succeeded++;
            }
            catch (error) {
                failed++;
                errors.push({
                    documentId: doc.id,
                    operation: 'create',
                    error: error.message,
                    retryable: true,
                });
            }
            onProgress?.({ processed: succeeded + failed, succeeded, failed });
        }
        const result = {
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
    cancel(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (workflow) {
            workflow.status = 'cancelled';
            workflow.updatedAt = new Date().toISOString();
            this.workflows.set(workflowId, workflow);
        }
    }
    async fetchDocuments(selection) {
        const documents = [];
        if (selection.type === 'documents' && selection.documentIds) {
            for (const docId of selection.documentIds) {
                const doc = await this.sourceFirestore.getDocument(`${selection.collectionPath}/${docId}`);
                if (doc)
                    documents.push(doc);
            }
        }
        else if (selection.type === 'collection' || selection.type === 'tree') {
            let hasMore = true;
            let nextPageToken;
            while (hasMore) {
                const page = await this.sourceFirestore.listDocuments(selection.collectionPath || '', { limit: 500 });
                documents.push(...page.documents);
                hasMore = page.hasMore;
                nextPageToken = page.nextPageToken;
            }
        }
        else if (selection.type === 'query' && selection.query) {
            let hasMore = true;
            let nextPageToken;
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
    async generatePreview(documents) {
        let conflicts = 0;
        let newDocuments = 0;
        let existingDocuments = 0;
        for (const doc of documents) {
            const existing = await this.destFirestore.getDocument(doc.path);
            if (!existing) {
                newDocuments++;
            }
            else {
                existingDocuments++;
                const hasConflicts = this.hasConflicts(doc.data, existing.data);
                if (hasConflicts)
                    conflicts++;
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
    hasConflicts(a, b) {
        for (const key of Object.keys(a)) {
            if (key in b && JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
                return true;
            }
        }
        return false;
    }
}
export function createMigrationService(sourceFirestore, destFirestore) {
    return new MigrationService(sourceFirestore, destFirestore);
}
//# sourceMappingURL=index.js.map