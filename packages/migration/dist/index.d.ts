import { MigrationWorkflow, MigrationDataSelection, MigrationPreview, MigrationResult } from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
export declare class MigrationService {
    private sourceFirestore;
    private destFirestore;
    private batchService;
    private compareService;
    private workflows;
    constructor(sourceFirestore: FirestoreConnection, destFirestore: FirestoreConnection);
    createWorkflow(name: string, sourceProjectId: string, destinationProjectId: string): MigrationWorkflow;
    getWorkflow(id: string): MigrationWorkflow | undefined;
    getAllWorkflows(): MigrationWorkflow[];
    setDataSelection(workflowId: string, selection: MigrationDataSelection): Promise<void>;
    preview(workflowId: string): Promise<MigrationPreview>;
    execute(workflowId: string, onProgress?: (progress: {
        processed: number;
        succeeded: number;
        failed: number;
    }) => void): Promise<MigrationResult>;
    cancel(workflowId: string): void;
    private fetchDocuments;
    private generatePreview;
    private hasConflicts;
}
export declare function createMigrationService(sourceFirestore: FirestoreConnection, destFirestore: FirestoreConnection): MigrationService;
//# sourceMappingURL=index.d.ts.map