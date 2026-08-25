import { logger } from '@vistiq/shared';
const MAX_ENTRIES = 10000;
export class AuditService {
    entries = [];
    persistencePath = null;
    constructor(persistencePath) {
        this.persistencePath = persistencePath || null;
        this.load();
    }
    record(entry) {
        const auditEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            ...entry,
        };
        this.entries.unshift(auditEntry);
        if (this.entries.length > MAX_ENTRIES) {
            this.entries = this.entries.slice(0, MAX_ENTRIES);
        }
        this.persist();
        return auditEntry;
    }
    getEntries(options) {
        let filtered = [...this.entries];
        if (options?.projectId) {
            filtered = filtered.filter(e => e.projectId === options.projectId);
        }
        if (options?.operation) {
            filtered = filtered.filter(e => e.operation === options.operation);
        }
        if (options?.startDate) {
            filtered = filtered.filter(e => e.timestamp >= options.startDate);
        }
        if (options?.endDate) {
            filtered = filtered.filter(e => e.timestamp <= options.endDate);
        }
        const offset = options?.offset || 0;
        const limit = options?.limit || 100;
        return filtered.slice(offset, offset + limit);
    }
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.entries.filter(e => e.projectId.toLowerCase().includes(lowerQuery) ||
            e.collectionPath?.toLowerCase().includes(lowerQuery) ||
            e.documentPath?.toLowerCase().includes(lowerQuery) ||
            e.operation.toLowerCase().includes(lowerQuery) ||
            e.error?.toLowerCase().includes(lowerQuery));
    }
    clear(projectId) {
        const before = this.entries.length;
        if (projectId) {
            this.entries = this.entries.filter(e => e.projectId !== projectId);
        }
        else {
            this.entries = [];
        }
        this.persist();
        return before - this.entries.length;
    }
    export() {
        return JSON.stringify(this.entries, null, 2);
    }
    getStats() {
        const byOperation = {};
        const byProject = {};
        for (const entry of this.entries) {
            byOperation[entry.operation] = (byOperation[entry.operation] || 0) + 1;
            byProject[entry.projectId] = (byProject[entry.projectId] || 0) + 1;
        }
        return {
            total: this.entries.length,
            byOperation,
            byProject,
        };
    }
    load() {
        if (!this.persistencePath || !require('fs').existsSync(this.persistencePath))
            return;
        try {
            const content = require('fs').readFileSync(this.persistencePath, 'utf8');
            this.entries = JSON.parse(content);
            logger.info('Audit history loaded', { count: this.entries.length });
        }
        catch (error) {
            logger.error('Failed to load audit history', { error: error.message });
        }
    }
    persist() {
        if (!this.persistencePath)
            return;
        try {
            require('fs').writeFileSync(this.persistencePath, JSON.stringify(this.entries));
        }
        catch (error) {
            logger.error('Failed to persist audit history', { error: error.message });
        }
    }
}
export function createAuditService(persistencePath) {
    return new AuditService(persistencePath);
}
//# sourceMappingURL=index.js.map