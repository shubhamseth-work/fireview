export const ENVIRONMENT_LABELS = ['development', 'staging', 'production', 'custom'];
export const AUTH_METHODS = ['service-account', 'oauth', 'emulator'];
export const QUERY_OPERATORS = [
    '==', '!=', '<', '<=', '>', '>=',
    'array-contains', 'array-contains-any', 'in', 'not-in'
];
export const BATCH_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];
export const MIGRATION_STEPS = [
    'select-source',
    'select-destination',
    'select-data',
    'preview',
    'review-changes',
    'confirm',
    'execute',
    'results'
];
export const MIGRATION_STATUSES = ['draft', 'in-progress', 'completed', 'failed', 'cancelled'];
export const AUDIT_OPERATIONS = [
    'connect', 'disconnect',
    'create-document', 'update-document', 'delete-document',
    'batch-delete', 'batch-update', 'batch-create',
    'export-collection', 'import-collection',
    'run-query', 'copy-documents', 'migrate',
    'compare-projects', 'diff-documents',
    'emulator-connect', 'emulator-disconnect'
];
export const EXPORT_FORMATS = ['json', 'csv'];
export const IMPORT_MODES = ['create', 'update', 'upsert'];
export const QUERY_CODE_LANGUAGES = ['typescript', 'javascript', 'python'];
export const FIRESTORE_VALUE_TYPES = [
    'string', 'number', 'boolean', 'null',
    'timestamp', 'reference', 'geopoint', 'bytes', 'array', 'map'
];
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_BATCH_SIZE = 500;
export const MAX_QUERY_LIMIT = 1000;
export const DEFAULT_QUERY_TIMEOUT = 30000;
export const SECRET_STORAGE_KEY_PREFIX = 'vistiq.';
export const ERROR_CODES = {
    AUTH_FAILED: 'AUTH_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
    COLLECTION_NOT_FOUND: 'COLLECTION_NOT_FOUND',
    DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
    INVALID_QUERY: 'INVALID_QUERY',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    EMULATOR_UNAVAILABLE: 'EMULATOR_UNAVAILABLE',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
};
export class VistiqError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'VistiqError';
    }
}
export function isVistiqError(error) {
    return error instanceof VistiqError;
}
//# sourceMappingURL=constants.js.map