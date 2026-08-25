import { AuditEntry, AuditOperation } from '@vistiq/core';
import { logger } from '@vistiq/shared';

const MAX_ENTRIES = 10000;

export class AuditService {
  private entries: AuditEntry[] = [];
  private persistencePath: string | null = null;

  constructor(persistencePath?: string) {
    this.persistencePath = persistencePath || null;
    this.load();
  }

  record(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
    const auditEntry: AuditEntry = {
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

  getEntries(options?: {
    projectId?: string;
    operation?: AuditOperation;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): AuditEntry[] {
    let filtered = [...this.entries];

    if (options?.projectId) {
      filtered = filtered.filter(e => e.projectId === options.projectId);
    }

    if (options?.operation) {
      filtered = filtered.filter(e => e.operation === options.operation);
    }

    if (options?.startDate) {
      filtered = filtered.filter(e => e.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter(e => e.timestamp <= options.endDate!);
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return filtered.slice(offset, offset + limit);
  }

  search(query: string): AuditEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.entries.filter(e =>
      e.projectId.toLowerCase().includes(lowerQuery) ||
      e.collectionPath?.toLowerCase().includes(lowerQuery) ||
      e.documentPath?.toLowerCase().includes(lowerQuery) ||
      e.operation.toLowerCase().includes(lowerQuery) ||
      e.error?.toLowerCase().includes(lowerQuery)
    );
  }

  clear(projectId?: string): number {
    const before = this.entries.length;
    if (projectId) {
      this.entries = this.entries.filter(e => e.projectId !== projectId);
    } else {
      this.entries = [];
    }
    this.persist();
    return before - this.entries.length;
  }

  export(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  getStats(): { total: number; byOperation: Record<string, number>; byProject: Record<string, number> } {
    const byOperation: Record<string, number> = {};
    const byProject: Record<string, number> = {};

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

  private load(): void {
    if (!this.persistencePath || !require('fs').existsSync(this.persistencePath)) return;

    try {
      const content = require('fs').readFileSync(this.persistencePath, 'utf8');
      this.entries = JSON.parse(content);
      logger.info('Audit history loaded', { count: this.entries.length });
    } catch (error) {
      logger.error('Failed to load audit history', { error: (error as Error).message });
    }
  }

  private persist(): void {
    if (!this.persistencePath) return;

    try {
      require('fs').writeFileSync(this.persistencePath, JSON.stringify(this.entries));
    } catch (error) {
      logger.error('Failed to persist audit history', { error: (error as Error).message });
    }
  }
}

export function createAuditService(persistencePath?: string): AuditService {
  return new AuditService(persistencePath);
}