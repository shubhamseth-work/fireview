export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const ENVIRONMENT_LABELS = ['development', 'staging', 'production', 'custom'] as const;
export type EnvironmentLabel = (typeof ENVIRONMENT_LABELS)[number];

export const AUTH_METHODS = ['service-account', 'oauth', 'emulator'] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const QUERY_OPERATORS = [
  '==', '!=', '<', '<=', '>', '>=',
  'array-contains', 'array-contains-any', 'in', 'not-in'
] as const;
export type QueryOperator = (typeof QUERY_OPERATORS)[number];

export const BATCH_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const MIGRATION_STEPS = [
  'select-source',
  'select-destination',
  'select-data',
  'preview',
  'review-changes',
  'confirm',
  'execute',
  'results'
] as const;
export type MigrationStep = (typeof MIGRATION_STEPS)[number];

export const MIGRATION_STATUSES = ['draft', 'in-progress', 'completed', 'failed', 'cancelled'] as const;
export type MigrationStatus = (typeof MIGRATION_STATUSES)[number];

export const AUDIT_OPERATIONS = [
  'connect', 'disconnect',
  'create-document', 'update-document', 'delete-document',
  'batch-delete', 'batch-update', 'batch-create',
  'export-collection', 'import-collection',
  'run-query', 'copy-documents', 'migrate',
  'compare-projects', 'diff-documents',
  'emulator-connect', 'emulator-disconnect'
] as const;
export type AuditOperation = (typeof AUDIT_OPERATIONS)[number];

export const EXPORT_FORMATS = ['json', 'csv'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const IMPORT_MODES = ['create', 'update', 'upsert'] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const QUERY_CODE_LANGUAGES = ['typescript', 'javascript', 'python'] as const;
export type QueryCodeLanguage = (typeof QUERY_CODE_LANGUAGES)[number];

export const FIRESTORE_VALUE_TYPES = [
  'string', 'number', 'boolean', 'null',
  'timestamp', 'reference', 'geopoint', 'bytes', 'array', 'map'
] as const;
export type FirestoreValueType = (typeof FIRESTORE_VALUE_TYPES)[number];

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
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class VistiqError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VistiqError';
  }
}

export function isVistiqError(error: unknown): error is VistiqError {
  return error instanceof VistiqError;
}