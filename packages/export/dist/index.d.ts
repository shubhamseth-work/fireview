import { ExportOptions, ExportProgress } from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
export declare class ExportService {
    private firestore;
    private abortController;
    constructor(firestore: FirestoreConnection);
    export(options: ExportOptions, onProgress?: (progress: ExportProgress) => void): Promise<void>;
    cancel(): void;
    private formatDocument;
    private serializeValue;
    private isNested;
    private csvHeader;
    private csvRow;
    private csvEscape;
}
export declare function createExportService(firestore: FirestoreConnection): ExportService;
//# sourceMappingURL=index.d.ts.map