import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';
import * as fs from 'fs';
import * as path from 'path';
export class ExportService {
    firestore;
    abortController = null;
    constructor(firestore) {
        this.firestore = firestore;
    }
    async export(options, onProgress) {
        this.abortController = new AbortController();
        const query = options.query || {
            collectionPath: options.collectionPath,
            filters: [],
            orderBy: [],
        };
        let total = 0;
        let processed = 0;
        let succeeded = 0;
        let failed = 0;
        const filePath = options.outputPath;
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });
        const isJson = options.format === 'json';
        if (isJson) {
            writeStream.write('[\n');
        }
        let first = true;
        try {
            let hasMore = true;
            let nextPageToken;
            while (hasMore && !this.abortController?.signal.aborted) {
                const page = await this.firestore.listDocuments(options.collectionPath, {
                    limit: 500,
                    orderBy: query.orderBy,
                    startAfter: nextPageToken ? { documentPath: '', fields: {} } : undefined,
                });
                if (page.documents.length === 0)
                    break;
                for (const doc of page.documents) {
                    if (this.abortController?.signal.aborted)
                        break;
                    const outputDoc = this.formatDocument(doc, options);
                    const line = JSON.stringify(outputDoc);
                    if (isJson) {
                        if (!first)
                            writeStream.write(',\n');
                        writeStream.write('  ' + line);
                        first = false;
                    }
                    else {
                        if (first) {
                            writeStream.write(this.csvHeader(outputDoc) + '\n');
                            first = false;
                        }
                        writeStream.write(this.csvRow(outputDoc) + '\n');
                    }
                    processed++;
                    succeeded++;
                    if (onProgress) {
                        onProgress({ total, processed, succeeded, failed, currentDocument: doc.id });
                    }
                }
                hasMore = page.hasMore;
                nextPageToken = page.nextPageToken;
            }
            if (isJson) {
                writeStream.write('\n]');
            }
            await new Promise((resolve, reject) => {
                writeStream.end();
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            logger.info('Export completed', { total: processed, succeeded, failed, path: filePath });
        }
        catch (error) {
            logger.error('Export failed', { error: error.message });
            throw new VistiqError(`Export failed: ${error.message}`, ERROR_CODES.VALIDATION_ERROR, { originalError: error });
        }
        finally {
            writeStream.destroy();
        }
    }
    cancel() {
        this.abortController?.abort();
    }
    formatDocument(doc, options) {
        const result = {};
        if (options.includeDocumentId) {
            result.id = doc.id;
        }
        if (options.includeNestedFields) {
            for (const [key, value] of Object.entries(doc.data)) {
                result[key] = this.serializeValue(value);
            }
        }
        else {
            for (const [key, value] of Object.entries(doc.data)) {
                if (!this.isNested(value)) {
                    result[key] = this.serializeValue(value);
                }
            }
        }
        return result;
    }
    serializeValue(value) {
        if (value === null)
            return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            return value;
        if (Array.isArray(value))
            return value.map(v => this.serializeValue(v));
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj) {
                switch (obj.__type__) {
                    case 'timestamp':
                        return obj.value;
                    case 'reference':
                        return obj.value;
                    case 'geopoint': {
                        const gp = obj.value;
                        return { latitude: gp.latitude, longitude: gp.longitude };
                    }
                    case 'bytes':
                        return `base64:${obj.value}`;
                    case 'array':
                        return obj.value.map(v => this.serializeValue(v));
                    case 'map': {
                        const mapResult = {};
                        for (const [k, v] of Object.entries(obj.value)) {
                            mapResult[k] = this.serializeValue(v);
                        }
                        return mapResult;
                    }
                }
            }
            const mapResult = {};
            for (const [k, v] of Object.entries(obj)) {
                mapResult[k] = this.serializeValue(v);
            }
            return mapResult;
        }
        return value;
    }
    isNested(value) {
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj) {
                return obj.__type__ === 'map' || obj.__type__ === 'array';
            }
            return true;
        }
        return false;
    }
    csvHeader(doc) {
        return Object.keys(doc).join(',');
    }
    csvRow(doc) {
        return Object.values(doc).map(v => this.csvEscape(v)).join(',');
    }
    csvEscape(value) {
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
}
export function createExportService(firestore) {
    return new ExportService(firestore);
}
//# sourceMappingURL=index.js.map