import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';
import * as fs from 'fs';
import * as path from 'path';
export class ImportService {
    firestore;
    abortController = null;
    constructor(firestore) {
        this.firestore = firestore;
    }
    async preview(options) {
        const documents = await this.readDocuments(options);
        let newDocuments = 0;
        let existingDocuments = 0;
        let conflicts = 0;
        const conflictDetails = [];
        for (const doc of documents) {
            const existing = await this.firestore.getDocument(`${options.collectionPath}/${doc.id}`);
            if (!existing) {
                newDocuments++;
            }
            else {
                existingDocuments++;
                const conflictingFields = this.findConflicts(existing.data, doc.data);
                if (conflictingFields.length > 0) {
                    conflicts++;
                    conflictDetails.push({
                        documentId: doc.id,
                        existingData: existing,
                        incomingData: doc,
                        conflictingFields,
                    });
                }
            }
        }
        return {
            total: documents.length,
            newDocuments,
            existingDocuments,
            conflicts,
            conflictDetails: conflicts > 0 ? conflictDetails : undefined,
        };
    }
    async import(options, onProgress) {
        this.abortController = new AbortController();
        const documents = await this.readDocuments(options);
        const progress = {
            total: documents.length,
            processed: 0,
            succeeded: 0,
            failed: 0,
            skipped: 0,
            errors: [],
        };
        for (const doc of documents) {
            if (this.abortController?.signal.aborted)
                break;
            try {
                const docPath = `${options.collectionPath}/${doc.id}`;
                const existing = await this.firestore.getDocument(docPath);
                let shouldImport = false;
                switch (options.mode) {
                    case 'create':
                        shouldImport = !existing;
                        break;
                    case 'update':
                        shouldImport = !!existing;
                        break;
                    case 'upsert':
                        shouldImport = true;
                        break;
                }
                if (!shouldImport) {
                    progress.skipped++;
                    continue;
                }
                if (existing && options.mode === 'upsert') {
                    await this.firestore.updateDocument(docPath, doc);
                }
                else if (existing && options.mode === 'update') {
                    await this.firestore.updateDocument(docPath, doc);
                }
                else {
                    await this.firestore.createDocument(options.collectionPath, doc, doc.id);
                }
                progress.succeeded++;
            }
            catch (error) {
                progress.failed++;
                progress.errors.push({
                    documentId: doc.id,
                    error: error.message,
                    data: doc,
                });
                logger.error('Import document failed', { documentId: doc.id, error: error.message });
            }
            progress.processed++;
            progress.currentDocument = doc.id;
            if (onProgress) {
                onProgress({ ...progress });
            }
        }
        logger.info('Import completed', progress);
        return progress;
    }
    cancel() {
        this.abortController?.abort();
    }
    async readDocuments(options) {
        const content = fs.readFileSync(options.inputPath, 'utf8');
        const ext = path.extname(options.inputPath).toLowerCase();
        if (ext === '.json') {
            return this.parseJson(content, options.idField);
        }
        else if (ext === '.csv') {
            return this.parseCsv(content, options.idField);
        }
        throw new VistiqError(`Unsupported file format: ${ext}`, ERROR_CODES.VALIDATION_ERROR);
    }
    parseJson(content, idField) {
        const parsed = JSON.parse(content);
        const docs = Array.isArray(parsed) ? parsed : [parsed];
        return docs.map((doc) => ({
            id: doc[idField || 'id'] || doc.id || crypto.randomUUID(),
            path: '',
            data: doc,
        }));
    }
    parseCsv(content, idField) {
        const lines = content.trim().split('\n');
        if (lines.length < 2)
            return [];
        const headers = lines[0].split(',').map(h => h.trim());
        const docs = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCsvLine(lines[i]);
            if (values.length !== headers.length)
                continue;
            const data = {};
            let docId = crypto.randomUUID();
            for (let j = 0; j < headers.length; j++) {
                const key = headers[j];
                const value = values[j];
                if (key === (idField || 'id')) {
                    docId = value;
                }
                else {
                    data[key] = this.parseValue(value);
                }
            }
            docs.push({ id: docId, path: '', data });
        }
        return docs;
    }
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }
    parseValue(value) {
        if (value === 'true')
            return true;
        if (value === 'false')
            return false;
        if (value === 'null' || value === '')
            return null;
        if (!isNaN(Number(value)))
            return Number(value);
        return value;
    }
    findConflicts(existing, incoming) {
        const conflicts = [];
        for (const key of Object.keys(incoming)) {
            if (key in existing && !this.valuesEqual(existing[key], incoming[key])) {
                conflicts.push(key);
            }
        }
        return conflicts;
    }
    valuesEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }
}
export function createImportService(firestore) {
    return new ImportService(firestore);
}
//# sourceMappingURL=index.js.map