import { AuditEntry, AuditOperation } from '@vistiq/core';
export declare class AuditService {
    private entries;
    private persistencePath;
    constructor(persistencePath?: string);
    record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry;
    getEntries(options?: {
        projectId?: string;
        operation?: AuditOperation;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
    }): AuditEntry[];
    search(query: string): AuditEntry[];
    clear(projectId?: string): number;
    export(): string;
    getStats(): {
        total: number;
        byOperation: Record<string, number>;
        byProject: Record<string, number>;
    };
    private load;
    private persist;
}
export declare function createAuditService(persistencePath?: string): AuditService;
//# sourceMappingURL=index.d.ts.map