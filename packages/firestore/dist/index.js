import { logger, VistiqError, ERROR_CODES } from '@vistiq/shared';
export class FirestoreService {
    firestore;
    projectId;
    constructor(firestore, projectId) {
        this.firestore = firestore;
        this.projectId = projectId;
    }
    async connect() {
        await this.firestore.collection('__vistiq_test__').limit(1).get();
        logger.info('Firestore service connected', { projectId: this.projectId });
    }
    async disconnect() {
        logger.info('Firestore service disconnected', { projectId: this.projectId });
    }
    async listCollections() {
        try {
            const collections = await this.firestore.listCollections();
            return collections.map(col => ({
                id: col.id,
                path: col.path,
                parent: col.parent?.path,
            }));
        }
        catch (error) {
            logger.error('Failed to list collections', { error: error.message });
            throw this.handleError(error);
        }
    }
    async listDocuments(collectionPath, options) {
        try {
            let query = this.firestore.collection(collectionPath);
            if (options?.orderBy) {
                for (const ob of options.orderBy) {
                    query = query.orderBy(ob.field, ob.direction);
                }
            }
            if (options?.limit) {
                query = query.limit(options.limit);
            }
            if (options?.offset) {
                query = query.offset(options.offset);
            }
            if (options?.startAfter) {
                const doc = await this.firestore.doc(options.startAfter.documentPath).get();
                query = query.startAfter(doc);
            }
            if (options?.startAt) {
                const doc = await this.firestore.doc(options.startAt.documentPath).get();
                query = query.startAt(doc);
            }
            const snapshot = await query.get();
            const documents = snapshot.docs.map(doc => this.convertDocument(doc));
            let nextPageToken;
            if (snapshot.docs.length > 0 && options?.limit && snapshot.docs.length === options.limit) {
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                nextPageToken = lastDoc.id;
            }
            return {
                documents,
                nextPageToken,
                hasMore: !!nextPageToken,
            };
        }
        catch (error) {
            logger.error('Failed to list documents', { collectionPath, error: error.message });
            throw this.handleError(error);
        }
    }
    async getDocument(documentPath) {
        try {
            const doc = await this.firestore.doc(documentPath).get();
            if (!doc.exists)
                return null;
            return this.convertDocument(doc);
        }
        catch (error) {
            logger.error('Failed to get document', { documentPath, error: error.message });
            throw this.handleError(error);
        }
    }
    async createDocument(collectionPath, data, documentId) {
        try {
            const collectionRef = this.firestore.collection(collectionPath);
            let docRef;
            if (documentId) {
                docRef = collectionRef.doc(documentId);
                await docRef.set(this.convertToAdminData(data.data));
            }
            else {
                docRef = await collectionRef.add(this.convertToAdminData(data.data));
            }
            logger.info('Document created', { collectionPath, documentId: docRef.id });
            return docRef.id;
        }
        catch (error) {
            logger.error('Failed to create document', { collectionPath, error: error.message });
            throw this.handleError(error);
        }
    }
    async updateDocument(documentPath, data) {
        try {
            await this.firestore.doc(documentPath).update(this.convertToAdminData(data.data || {}));
            logger.info('Document updated', { documentPath });
        }
        catch (error) {
            logger.error('Failed to update document', { documentPath, error: error.message });
            throw this.handleError(error);
        }
    }
    async deleteDocument(documentPath) {
        try {
            await this.firestore.doc(documentPath).delete();
            logger.info('Document deleted', { documentPath });
        }
        catch (error) {
            logger.error('Failed to delete document', { documentPath, error: error.message });
            throw this.handleError(error);
        }
    }
    async runQuery(query) {
        try {
            let q = this.firestore.collection(query.collectionPath);
            for (const filter of query.filters) {
                q = q.where(filter.field, filter.operator, this.convertValue(filter.value));
            }
            for (const ob of query.orderBy) {
                q = q.orderBy(ob.field, ob.direction);
            }
            if (query.limit) {
                q = q.limit(query.limit);
            }
            if (query.offset) {
                q = q.offset(query.offset);
            }
            const snapshot = await q.get();
            const documents = snapshot.docs.map(doc => this.convertDocument(doc));
            let nextPageToken;
            if (snapshot.docs.length > 0 && query.limit && snapshot.docs.length === query.limit) {
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                nextPageToken = lastDoc.id;
            }
            return {
                documents,
                nextPageToken,
                hasMore: !!nextPageToken,
            };
        }
        catch (error) {
            logger.error('Failed to run query', { query, error: error.message });
            throw this.handleError(error);
        }
    }
    async runCollectionGroupQuery(query) {
        try {
            let q = this.firestore.collectionGroup(query.collectionPath);
            for (const filter of query.filters) {
                q = q.where(filter.field, filter.operator, this.convertValue(filter.value));
            }
            for (const ob of query.orderBy) {
                q = q.orderBy(ob.field, ob.direction);
            }
            if (query.limit) {
                q = q.limit(query.limit);
            }
            const snapshot = await q.get();
            const documents = snapshot.docs.map(doc => this.convertDocument(doc));
            let nextPageToken;
            if (snapshot.docs.length > 0 && query.limit && snapshot.docs.length === query.limit) {
                const lastDoc = snapshot.docs[snapshot.docs.length - 1];
                nextPageToken = lastDoc.id;
            }
            return {
                documents,
                nextPageToken,
                hasMore: !!nextPageToken,
            };
        }
        catch (error) {
            logger.error('Failed to run collection group query', { query, error: error.message });
            throw this.handleError(error);
        }
    }
    convertDocument(doc) {
        const data = doc.data() || {};
        return {
            id: doc.id,
            path: doc.ref.path,
            data: this.convertFromAdminData(data),
            createTime: doc.createTime?.toDate().toISOString(),
            updateTime: doc.updateTime?.toDate().toISOString(),
        };
    }
    convertToAdminData(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = this.convertValue(value);
        }
        return result;
    }
    convertValue(value) {
        if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(v => this.convertValue(v));
        }
        if (typeof value === 'object' && value !== null) {
            const obj = value;
            if ('__type__' in obj) {
                switch (obj.__type__) {
                    case 'timestamp':
                        return new Date(obj.value);
                    case 'reference':
                        return this.firestore.doc(obj.value);
                    case 'geopoint': {
                        const gp = obj.value;
                        return new (require('firebase-admin/firestore').GeoPoint)(gp.latitude, gp.longitude);
                    }
                    case 'bytes':
                        return Buffer.from(obj.value, 'base64');
                    case 'array':
                        return { __type__: 'array', value: obj.value.map(v => this.convertValue(v)) };
                    case 'map': {
                        const mapResult = {};
                        for (const [k, v] of Object.entries(obj.value)) {
                            mapResult[k] = this.convertValue(v);
                        }
                        return { __type__: 'map', value: mapResult };
                    }
                }
            }
            const mapResult = {};
            for (const [k, v] of Object.entries(obj)) {
                mapResult[k] = this.convertValue(v);
            }
            return mapResult;
        }
        return value;
    }
    convertFromAdminData(data) {
        const result = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = this.convertFromAdminValue(value);
        }
        return result;
    }
    convertFromAdminValue(value) {
        if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }
        if (value instanceof Date) {
            return { __type__: 'timestamp', value: value.toISOString() };
        }
        if (value && typeof value === 'object') {
            const obj = value;
            if ('_delegate' in obj && '_firestore' in obj) {
                return { __type__: 'reference', value: value.path };
            }
            if ('latitude' in obj && 'longitude' in obj) {
                return { __type__: 'geopoint', value: { latitude: obj.latitude, longitude: obj.longitude } };
            }
            if (Buffer.isBuffer(value)) {
                return { __type__: 'bytes', value: value.toString('base64') };
            }
            if (Array.isArray(value)) {
                return { __type__: 'array', value: value.map(v => this.convertFromAdminValue(v)) };
            }
            const mapResult = {};
            for (const [k, v] of Object.entries(obj)) {
                mapResult[k] = this.convertFromAdminValue(v);
            }
            return { __type__: 'map', value: mapResult };
        }
        return value;
    }
    handleError(error) {
        if (error instanceof VistiqError)
            return error;
        const err = error;
        switch (err.code) {
            case 'permission-denied':
                return new VistiqError('Permission denied', ERROR_CODES.PERMISSION_DENIED, { originalError: error });
            case 'not-found':
                return new VistiqError('Resource not found', ERROR_CODES.PROJECT_NOT_FOUND, { originalError: error });
            case 'resource-exhausted':
                return new VistiqError('Quota exceeded', ERROR_CODES.QUOTA_EXCEEDED, { originalError: error });
            case 'unavailable':
                return new VistiqError('Service unavailable', ERROR_CODES.NETWORK_ERROR, { originalError: error });
            case 'deadline-exceeded':
                return new VistiqError('Request timeout', ERROR_CODES.TIMEOUT, { originalError: error });
            default:
                return new VistiqError(err.message || 'Unknown error', ERROR_CODES.VALIDATION_ERROR, { originalError: error });
        }
    }
}
export function createFirestoreService(firestore, projectId) {
    return new FirestoreService(firestore, projectId);
}
//# sourceMappingURL=index.js.map