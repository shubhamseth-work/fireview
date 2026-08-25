export interface FirestoreConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listCollections(): Promise<CollectionInfo[]>;
  listDocuments(
    collectionPath: string,
    options?: QueryOptions
  ): Promise<DocumentPage>;
  getDocument(documentPath: string): Promise<FirestoreDocument | null>;
  createDocument(
    collectionPath: string,
    data: FirestoreDocument,
    documentId?: string
  ): Promise<string>;
  updateDocument(
    documentPath: string,
    data: Partial<FirestoreDocument>
  ): Promise<void>;
  deleteDocument(documentPath: string): Promise<void>;
  runQuery(query: FirestoreQuery): Promise<DocumentPage>;
  runCollectionGroupQuery(query: FirestoreQuery): Promise<DocumentPage>;
}

export interface CollectionInfo {
  id: string;
  path: string;
  parent?: string;
  documentCount?: number;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: OrderByClause[];
  startAfter?: DocumentSnapshot;
  startAt?: DocumentSnapshot;
  endBefore?: DocumentSnapshot;
  endAt?: DocumentSnapshot;
}

export interface OrderByClause {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FirestoreQuery {
  collectionPath: string;
  collectionGroup?: boolean;
  filters: QueryFilter[];
  orderBy: OrderByClause[];
  limit?: number;
  offset?: number;
  startAfter?: DocumentSnapshot;
  startAt?: DocumentSnapshot;
  endBefore?: DocumentSnapshot;
  endAt?: DocumentSnapshot;
}

export interface QueryFilter {
  field: string;
  operator: QueryOperator;
  value: FirestoreValue;
}

export type QueryOperator =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'array-contains'
  | 'array-contains-any'
  | 'in'
  | 'not-in';

export interface DocumentPage {
  documents: FirestoreDocument[];
  nextPageToken?: string;
  hasMore: boolean;
  totalCount?: number;
}

export interface DocumentSnapshot {
  documentPath: string;
  fields: Record<string, FirestoreValue>;
}

export interface FirestoreDocument {
  id: string;
  path: string;
  data: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

export type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | TimestampValue
  | ReferenceValue
  | GeoPointValue
  | BytesValue
  | ArrayValue
  | MapValue;

export interface TimestampValue {
  __type__: 'timestamp';
  value: string;
}

export interface ReferenceValue {
  __type__: 'reference';
  value: string;
}

export interface GeoPointValue {
  __type__: 'geopoint';
  value: { latitude: number; longitude: number };
}

export interface BytesValue {
  __type__: 'bytes';
  value: string;
}

export interface ArrayValue {
  __type__: 'array';
  value: FirestoreValue[];
}

export interface MapValue {
  __type__: 'map';
  value: Record<string, FirestoreValue>;
}

export function isFirestoreValue(value: unknown): value is FirestoreValue {
  if (value === null) return true;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isFirestoreValue);
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('__type__' in obj) {
      switch (obj.__type__) {
        case 'timestamp':
        case 'reference':
        case 'geopoint':
        case 'bytes':
          return true;
        case 'array':
          return Array.isArray(obj.value) && obj.value.every(isFirestoreValue);
        case 'map':
          return Object.values(obj.value).every(isFirestoreValue);
        default:
          return false;
      }
    }
    return Object.values(obj).every(isFirestoreValue);
  }
  return false;
}

export function serializeFirestoreValue(value: FirestoreValue): unknown {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('__type__' in obj) {
      return obj;
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = serializeFirestoreValue(v as FirestoreValue);
    }
    return result;
  }
  return undefined;
}

function isSpecialFirestoreValue(value: unknown): value is TimestampValue | ReferenceValue | GeoPointValue | BytesValue | ArrayValue | MapValue {
  return typeof value === 'object' && value !== null && '__type__' in (value as Record<string, unknown>);
}

export function deserializeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return { __type__: 'array', value: value.map(deserializeFirestoreValue) } as ArrayValue;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if ('__type__' in obj) {
      return obj as FirestoreValue;
    }
    const result: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = deserializeFirestoreValue(v);
    }
    return { __type__: 'map', value: result } as MapValue;
  }
  return null;
}

export interface AuthProvider {
  connect(config?: EmulatorConfig): Promise<Connection>;
  disconnect(): Promise<void>;
  getStatus(): Promise<AuthStatus>;
}

export interface Connection {
  projectId: string;
  displayName: string;
  environment: EnvironmentLabel;
  authMethod: AuthMethod;
  emulatorConfig?: EmulatorConfig;
  region?: string;
  connectedAt: string;
  lastUsedAt: string;
}

export interface AuthStatus {
  connected: boolean;
  projectId?: string;
  error?: string;
  expiresAt?: string;
}

export type EnvironmentLabel = 'development' | 'staging' | 'production' | 'custom';
export type AuthMethod = 'service-account' | 'oauth' | 'emulator';

export interface EmulatorConfig {
  host: string;
  firestorePort?: number;
  authPort?: number;
  functionsPort?: number;
  storagePort?: number;
  uiPort?: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  includeDocumentId: boolean;
  includeNestedFields: boolean;
  collectionPath: string;
  query?: FirestoreQuery;
  outputPath: string;
}

export interface ExportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  currentDocument?: string;
}

export interface ImportOptions {
  format: 'json' | 'csv';
  mode: 'create' | 'update' | 'upsert';
  collectionPath: string;
  inputPath: string;
  idField?: string;
}

export interface ImportPreview {
  total: number;
  newDocuments: number;
  existingDocuments: number;
  conflicts: number;
  conflictDetails?: ConflictDetail[];
}

export interface ConflictDetail {
  documentId: string;
  existingData: FirestoreDocument;
  incomingData: FirestoreDocument;
  conflictingFields: string[];
}

export interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  currentDocument?: string;
  errors: ImportError[];
}

export interface ImportError {
  documentId: string;
  error: string;
  data?: FirestoreDocument;
}

export interface BatchOperation {
  id: string;
  type: 'delete' | 'update' | 'create' | 'copy';
  projectId: string;
  collectionPath: string;
  documentIds?: string[];
  query?: FirestoreQuery;
  data?: Partial<FirestoreDocument>;
  destinationProjectId?: string;
  destinationCollectionPath?: string;
  status: BatchStatus;
  progress: BatchProgress;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface DocumentDiff {
  left: FirestoreDocument | null;
  right: FirestoreDocument | null;
  changes: DiffChange[];
}

export interface DiffChange {
  path: string;
  type: 'added' | 'removed' | 'changed';
  leftValue?: FirestoreValue;
  rightValue?: FirestoreValue;
}

export interface ProjectComparison {
  sourceProjectId: string;
  destinationProjectId: string;
  collections: CollectionComparison[];
  summary: ComparisonSummary;
}

export interface CollectionComparison {
  collectionId: string;
  sourceCount?: number;
  destinationCount?: number;
  sourceStructure?: Record<string, FieldInfo>;
  destinationStructure?: Record<string, FieldInfo>;
  status: 'match' | 'missing-in-source' | 'missing-in-destination' | 'structure-diff';
}

export interface FieldInfo {
  type: string;
  nullable: boolean;
  array: boolean;
}

export interface ComparisonSummary {
  totalCollections: number;
  matchingCollections: number;
  missingInSource: number;
  missingInDestination: number;
  structureDifferences: number;
}

export interface MigrationWorkflow {
  id: string;
  name: string;
  sourceProjectId: string;
  destinationProjectId: string;
  steps: MigrationStep[];
  currentStep: number;
  status: MigrationStatus;
  createdAt: string;
  updatedAt: string;
}

export type MigrationStep =
  | 'select-source'
  | 'select-destination'
  | 'select-data'
  | 'preview'
  | 'review-changes'
  | 'confirm'
  | 'execute'
  | 'results';

export type MigrationStatus = 'draft' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface MigrationDataSelection {
  type: 'collection' | 'query' | 'documents' | 'tree';
  collectionPath?: string;
  query?: FirestoreQuery;
  documentIds?: string[];
  includeSubcollections?: boolean;
}

export interface MigrationPreview {
  totalDocuments: number;
  estimatedWrites: number;
  estimatedCost?: string;
  conflicts: number;
  newDocuments: number;
  existingDocuments: number;
}

export interface MigrationResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: MigrationError[];
  duration: number;
}

export interface MigrationError {
  documentId: string;
  operation: string;
  error: string;
  retryable: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  operation: AuditOperation;
  projectId: string;
  collectionPath?: string;
  documentPath?: string;
  result: 'success' | 'failure' | 'partial';
  details?: Record<string, unknown>;
  error?: string;
}

export type AuditOperation =
  | 'connect'
  | 'disconnect'
  | 'create-document'
  | 'update-document'
  | 'delete-document'
  | 'batch-delete'
  | 'batch-update'
  | 'batch-create'
  | 'export-collection'
  | 'import-collection'
  | 'run-query'
  | 'copy-documents'
  | 'migrate'
  | 'compare-projects'
  | 'diff-documents'
  | 'emulator-connect'
  | 'emulator-disconnect';

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  collectionPath: string;
  query: FirestoreQuery;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

export interface QueryCodeGeneration {
  language: 'typescript' | 'javascript' | 'python';
  code: string;
}

export interface ProjectFileDetectionResult {
  projectId: string;
  firebaseJson: boolean;
  firebaserc: boolean;
  firestoreRules: boolean;
  firestoreIndexes: boolean;
  packageJson: boolean;
  emulatorConfig: boolean;
}

export interface StoredServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}