"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VistiqError = exports.ERROR_CODES = exports.SECRET_STORAGE_KEY_PREFIX = exports.DEFAULT_QUERY_TIMEOUT = exports.MAX_QUERY_LIMIT = exports.MAX_BATCH_SIZE = exports.DEFAULT_PAGE_SIZE = exports.FIRESTORE_VALUE_TYPES = exports.QUERY_CODE_LANGUAGES = exports.IMPORT_MODES = exports.EXPORT_FORMATS = exports.AUDIT_OPERATIONS = exports.MIGRATION_STATUSES = exports.MIGRATION_STEPS = exports.BATCH_STATUSES = exports.QUERY_OPERATORS = exports.AUTH_METHODS = exports.ENVIRONMENT_LABELS = void 0;
exports.isVistiqError = isVistiqError;
exports.ENVIRONMENT_LABELS = ['development', 'staging', 'production', 'custom'];
exports.AUTH_METHODS = ['service-account', 'oauth', 'emulator'];
exports.QUERY_OPERATORS = [
    '==', '!=', '<', '<=', '>', '>=',
    'array-contains', 'array-contains-any', 'in', 'not-in'
];
exports.BATCH_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];
exports.MIGRATION_STEPS = [
    'select-source',
    'select-destination',
    'select-data',
    'preview',
    'review-changes',
    'confirm',
    'execute',
    'results'
];
exports.MIGRATION_STATUSES = ['draft', 'in-progress', 'completed', 'failed', 'cancelled'];
exports.AUDIT_OPERATIONS = [
    'connect', 'disconnect',
    'create-document', 'update-document', 'delete-document',
    'batch-delete', 'batch-update', 'batch-create',
    'export-collection', 'import-collection',
    'run-query', 'copy-documents', 'migrate',
    'compare-projects', 'diff-documents',
    'emulator-connect', 'emulator-disconnect'
];
exports.EXPORT_FORMATS = ['json', 'csv'];
exports.IMPORT_MODES = ['create', 'update', 'upsert'];
exports.QUERY_CODE_LANGUAGES = ['typescript', 'javascript', 'python'];
exports.FIRESTORE_VALUE_TYPES = [
    'string', 'number', 'boolean', 'null',
    'timestamp', 'reference', 'geopoint', 'bytes', 'array', 'map'
];
exports.DEFAULT_PAGE_SIZE = 50;
exports.MAX_BATCH_SIZE = 500;
exports.MAX_QUERY_LIMIT = 1000;
exports.DEFAULT_QUERY_TIMEOUT = 30000;
exports.SECRET_STORAGE_KEY_PREFIX = 'vistiq.';
exports.ERROR_CODES = {
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
class VistiqError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'VistiqError';
    }
}
exports.VistiqError = VistiqError;
function isVistiqError(error) {
    return error instanceof VistiqError;
}
//# sourceMappingURL=constants.js.map