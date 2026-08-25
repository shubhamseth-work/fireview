import { ImportOptions, ImportPreview, ImportProgress } from '@vistiq/core';
import { FirestoreConnection } from '@vistiq/firestore';
export declare class ImportService {
    private firestore;
    private abortController;
    constructor(firestore: FirestoreConnection);
    preview(options: ImportOptions): Promise<ImportPreview>;
    import(options: ImportOptions, onProgress?: (progress: ImportProgress) => void): Promise<ImportProgress>;
    cancel(): void;
    private readDocuments;
    private parseJson;
    private parseCsv;
    private parseCsvLine;
    private parseValue;
    private findConflicts;
    private valuesEqual;
}
export declare function createImportService(firestore: FirestoreConnection): ImportService;
//# sourceMappingURL=index.d.ts.map