import type {
  Connection,
  FirestoreDocument,
  FirestoreQuery,
} from '@fireview/core';
import {
  FirestoreValue,
  OrderByClause,
  QueryFilter,
  QueryOperator,
} from '@fireview/core';
import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { useVSCode } from '../context/VSCodeContext';
import { CollectionTree } from './CollectionTree';
import { DocumentTable } from './DocumentTable';
import { DocumentViewer } from './DocumentViewer';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { NewDocumentModal } from './NewDocumentModal';
import { AddCollectionModal } from './AddCollectionModal';
import { QueryBuilder } from './QueryBuilder';

type ViewType =
  | 'firestore'
  | 'collection'
  | 'query'
  | 'compare'
  | 'project-compare'
  | 'migration'
  | 'audit';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface FirestoreViewProps {
  connection: Connection;
  collections: any[];
  documents: FirestoreDocument[];
  selectedDocument: FirestoreDocument | null;
  loading: boolean;
  error: string | null;
  pagination: { page: number; hasMore: boolean; nextToken: string; pageSize: number };
  onLoadDocuments: (collectionPath: string, pageSize?: number, projectId?: string) => void;
  onOpenDocument: (doc: FirestoreDocument) => void;
  onOpenDocumentByPath?: (documentPath: string) => void;
  onCloseDocument: () => void;
  onRunQuery: (query: FirestoreQuery) => void;
  onCreateDocument: (collectionPath: string, data: FirestoreDocument) => void;
  onCreateCollection: (collectionId: string) => void;
  onUpdateDocument: (documentPath: string, data: Partial<FirestoreDocument>) => void;
  onDeleteDocument: (documentPath: string) => void;
  onExportCollection: (collectionPath: string, format: 'json' | 'csv', outputPath: string) => void;
  onImportCollection: (
    collectionPath: string,
    format: 'json' | 'csv',
    mode: 'create' | 'update' | 'upsert',
    inputPath: string
  ) => void;
  onLoadMore: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onCopyDocument: (doc: FirestoreDocument) => void;
  onCopyDocumentTo: (doc: FirestoreDocument, targetCollection: string) => void;
  onDuplicateDocument: (doc: FirestoreDocument) => void;
  onRenameDocument: (doc: FirestoreDocument, newId: string) => void;
  onMoveDocument: (doc: FirestoreDocument, targetCollection: string) => void;
  onShowGeopoints: (doc: FirestoreDocument) => void;
  onImportDocument: (doc: FirestoreDocument) => void;
  onExportDocument: (doc: FirestoreDocument) => void;
  onRevealInConsole: (doc: FirestoreDocument) => void;
  onExportSelectedDocuments: (documents: FirestoreDocument[], format: 'json' | 'csv') => void;
  connections: Array<{ projectId: string; displayName: string }>;
  activeProjectId: string | null;
  readOnlyCollections: Set<string>;
  setReadOnlyCollections: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  firebaseConfig?: FirebaseConfig;
  onConfigImport: (config: FirebaseConfig) => void;
  initialView?: 'firestore' | 'collection' | 'query';
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface FirestoreViewRef {
  handleAddCollection: () => void;
}

// Logger for FirestoreView
const log = {
  debug: (msg: string, meta?: Record<string, unknown>) =>
    console.debug(`[FirestoreView] ${msg}`, meta || ''),
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.info(`[FirestoreView] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[FirestoreView] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[FirestoreView] ${msg}`, meta || ''),
};

export const FirestoreView = forwardRef<FirestoreViewRef, FirestoreViewProps>(
  (props, ref) => {
  const {
    connection,
    collections = [],
    documents = [],
    selectedDocument,
    loading,
    error,
    pagination,
    onLoadDocuments,
    onOpenDocument,
    onOpenDocumentByPath,
    onCloseDocument,
    onRunQuery,
    onCreateDocument,
    onCreateCollection,
    onUpdateDocument,
    onDeleteDocument,
    onExportCollection,
    onImportCollection,
    onLoadMore,
    onPageSizeChange,
    onCopyDocument,
    onCopyDocumentTo,
    onDuplicateDocument,
    onRenameDocument,
    onMoveDocument,
    onShowGeopoints,
    onImportDocument,
    onExportDocument,
    onRevealInConsole,
    connections = [],
    activeProjectId,
    readOnlyCollections = new Set(),
    setReadOnlyCollections,
    firebaseConfig,
    onConfigImport,
    initialView = 'firestore',
    view,
    onViewChange,
  } = props;

// Destructure authMethod from connection
  const authMethod = connection?.authMethod;
  const vscode = useVSCode();
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [showQueryBuilder, setShowQueryBuilder] = useState(initialView === 'query');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [renderError, setRenderError] = useState<Error | null>(null);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState<{
    isOpen: boolean;
    selectedProjectId: string;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    handleAddCollection,
  }));

  // Log props on render for debugging
  log.info('FirestoreView render', {
    hasConnection: !!connection,
    collectionsCount: collections.length,
    documentsCount: documents.length,
    hasSelectedDocument: !!selectedDocument,
    loading,
    error,
    view,
    activeProjectId,
    connectionsCount: connections.length,
    showQueryBuilder,
    isSidebarCollapsed,
  });

  const handleCollectionClick = (collectionPath: string) => {
    setSelectedCollection(collectionPath);
    setShowQueryBuilder(false);
    onLoadDocuments(collectionPath);
  };

  const handleOpenDocumentByPath = (documentPath: string) => {
    if (onOpenDocumentByPath) {
      onOpenDocumentByPath(documentPath);
    }
  };

  const handleProjectChange = (projectId: string) => {
    if (projectId !== activeProjectId) {
      vscode.postMessage({ type: 'setActiveProject', payload: { projectId } });
    }
  };

  const handleNewDocument = () => {
    if (!selectedCollection) return;
    setShowNewDocumentModal(true);
  };

  const handleNewDocumentConfirm = (docId: string, data: Record<string, any>) => {
    const newDoc: FirestoreDocument = {
      id: docId,
      path: '',
      data,
    };
    onOpenDocument(newDoc);
    setShowNewDocumentModal(false);
  };

  const handleAddDocumentFromTree = (
    collectionPath: string,
    docId: string,
    data: Record<string, any>
  ) => {
    console.log('[FirestoreView] handleAddDocumentFromTree called', {
      collectionPath,
      docId,
      dataKeys: Object.keys(data),
    });
    const newDoc: FirestoreDocument = {
      id: docId,
      path: '',
      data,
    };
    console.log('[FirestoreView] Calling onCreateDocument');
    onCreateDocument(collectionPath, newDoc);
  };

  const handleNewDocumentCancel = () => {
    setShowNewDocumentModal(false);
  };

  const handleAddCollection = () => {
    // Open modal with current active project pre-selected
    setShowNewCollectionModal({
      isOpen: true,
      selectedProjectId: activeProjectId || connections[0]?.projectId || '',
    });
  };

  const handleNewCollectionConfirm = (collectionId: string, projectId: string, docId: string, data: Record<string, any>) => {
    // If project is different from active, switch first
    const createCollectionAndDoc = () => {
      onCreateCollection(collectionId);
      // Create the initial document if data is provided and not just empty object
      if (data && Object.keys(data).length > 0) {
        onCreateDocument(collectionId, {
          id: docId,
          path: '',
          data,
        });
      }
    };

    if (projectId !== activeProjectId) {
      vscode.postMessage({ type: 'setActiveProject', payload: { projectId } });
      // Wait for project switch then create collection and document
      setTimeout(() => {
        createCollectionAndDoc();
      }, 500);
    } else {
      createCollectionAndDoc();
    }
    setShowNewCollectionModal(null);
  };

  const handleNewCollectionCancel = () => {
    setShowNewCollectionModal(null);
  };

  const handleRunQuery = (query: FirestoreQuery) => {
    onRunQuery(query);
    setShowQueryBuilder(false);
  };

  const handleExport = () => {
    if (!selectedCollection) return;
    setShowExportModal(true);
  };

  const handleImport = () => {
    if (!selectedCollection) return;
    setShowImportModal(true);
  };

  const handleToggleReadOnly = (collectionPath: string) => {
    setReadOnlyCollections((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(collectionPath)) {
        next.delete(collectionPath);
      } else {
        next.add(collectionPath);
      }
      return next;
    });
  };

  const handleCollectionExport = (collectionPath: string) => {
    onExportCollection(collectionPath, 'json', '');
  };

  const handleCollectionImport = (collectionPath: string) => {
    onImportCollection(collectionPath, 'json', 'upsert', '');
  };

  const handleExportSelectedDocuments = (documents: FirestoreDocument[], format: 'json' | 'csv') => {
    // Delegate to the App-level handler which has access to the sendMessage function
    // This will be passed down from App.tsx
    (window as any).__FIRESTORE_EXPORT_SELECTED_DOCS__?.(documents, format);
  };

  // Safe render wrapper
  const renderSection = (name: string, children: React.ReactNode) => {
    try {
      return children;
    } catch (err) {
      log.error(`Error rendering ${name}`, { error: err, stack: (err as Error).stack });
      setRenderError(err as Error);
      return (
        <div
          style={{
            padding: 16,
            color: 'var(--vscode-errorForeground)',
            backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
            border: '1px solid var(--vscode-inputValidation-errorBorder)',
            borderRadius: 4,
            margin: 8,
          }}
        >
          <strong>Error in {name}:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, marginTop: 8 }}>
            {(err as Error).message}
          </pre>
          <button
            onClick={() => setRenderError(null)}
            style={{
              marginTop: 8,
              padding: '4px 8px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: 2,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
  };

  if (renderError) {
    return (
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--vscode-errorForeground)', textAlign: 'center' }}>
          <h3>FirestoreView Error</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, backgroundColor: 'var(--vscode-textBlockQuote-background)', padding: 16, borderRadius: 4 }}>
            {renderError.message}
            {renderError.stack && `\n\nStack:\n${renderError.stack}`}
          </pre>
          <button
            onClick={() => setRenderError(null)}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {!isSidebarCollapsed && renderSection('Sidebar', (
        <div
          style={{
            width: sidebarWidth,
            minWidth: 200,
            maxWidth: 500,
            borderRight: '1px solid var(--vscode-border)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--vscode-sidebar-bg)',
            flexShrink: 0,
          }}
        >
          {/* SECTION 1: Project/Query Toolbar */}
          <div
            className="toolbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              borderBottom: '1px solid var(--vscode-border)',
              flexShrink: 0,
            }}
          >
            <select
              value={activeProjectId || ''}
              onChange={e => handleProjectChange(e.target.value)}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: 12,
                backgroundColor: 'var(--vscode-dropdown-background)',
                color: 'var(--vscode-dropdown-foreground)',
                border: '1px solid var(--vscode-dropdown-border)',
                borderRadius: 2,
              }}
            >
              {connections.map(conn => (
                <option key={conn.projectId} value={conn.projectId}>
                  {conn.displayName !== conn.projectId ? `${conn.displayName} (${conn.projectId})` : conn.displayName}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowQueryBuilder(!showQueryBuilder)}
              title="Query Builder"
              style={{ padding: '4px 8px' }}
            >
              🔍 Query
            </button>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              title="Collapse sidebar"
              style={{ marginLeft: 'auto', padding: '4px 8px' }}
            >
              ◀
            </button>
          </div>

          {/* SECTION 3: Collections - Scrollable, fills remaining height */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {showQueryBuilder ? (
              <QueryBuilder
                collections={collections}
                onRunQuery={handleRunQuery}
                onClose={() => setShowQueryBuilder(false)}
              />
            ) : (
              <CollectionTree
                collections={collections}
                selectedCollection={selectedCollection}
                onSelect={handleCollectionClick}
                loading={loading}
                readOnlyCollections={readOnlyCollections}
                onToggleReadOnly={handleToggleReadOnly}
                onExportCollection={handleCollectionExport}
                onImportCollection={handleCollectionImport}
                onAddDocument={handleAddDocumentFromTree}
              />
            )}
          </div>
        </div>
      ))}

      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          style={{
            width: 32,
            height: '100%',
            borderRight: '1px solid var(--vscode-border)',
            backgroundColor: 'var(--vscode-sidebar-bg)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
          }}
          title="Expand sidebar"
        >
          ▶
        </button>
      )}

      {!isSidebarCollapsed && (
        <div
          style={{
            width: 6,
            cursor: 'col-resize',
            backgroundColor: 'transparent',
          }}
          onMouseDown={e => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMouseMove = (e: MouseEvent) => {
              setSidebarWidth(Math.max(200, Math.min(500, startWidth + e.clientX - startX)));
            };
            const onMouseUp = () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          }}
        />
      )}

      {renderSection('MainContent', (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedDocument ? (
            <DocumentViewer
              document={selectedDocument}
              connection={connection}
              onClose={onCloseDocument}
              onUpdate={onUpdateDocument}
              onCreateDocument={onCreateDocument}
              onDelete={onDeleteDocument}
              onOpenDocument={handleOpenDocumentByPath}
            />
          ) : (
            <DocumentTable
              documents={documents}
              loading={loading}
              error={error}
              pagination={pagination}
              onRowClick={onOpenDocument}
              onRunQuery={onRunQuery}
              onLoadMore={onLoadMore}
              onPageSizeChange={onPageSizeChange}
              onCopyDocument={onCopyDocument}
              onCopyDocumentTo={onCopyDocumentTo}
              onOpenDocument={onOpenDocument}
              onDeleteDocument={onDeleteDocument}
              onDuplicateDocument={onDuplicateDocument}
              onRenameDocument={onRenameDocument}
              onMoveDocument={onMoveDocument}
              onShowGeopoints={onShowGeopoints}
              onImportDocument={onImportDocument}
              onExportDocument={onExportDocument}
              onRevealInConsole={onRevealInConsole}
              onExportSelectedDocuments={handleExportSelectedDocuments}
              connections={connections}
              activeProjectId={activeProjectId}
              collections={collections.map(c => c.id)}
              selectedCollection={selectedCollection}
              readOnlyCollections={readOnlyCollections}
            />
          )}
        </div>
      ))}

      {showExportModal && (
        <ExportModal
          collectionPath={selectedCollection}
          onClose={() => setShowExportModal(false)}
          onExport={onExportCollection}
        />
      )}

      {showImportModal && (
        <ImportModal
          collectionPath={selectedCollection}
          onClose={() => setShowImportModal(false)}
          onImport={onImportCollection}
        />
      )}

      {showNewDocumentModal && (
        <NewDocumentModal
          isOpen={true}
          onConfirm={handleNewDocumentConfirm}
          onCancel={handleNewDocumentCancel}
        />
      )}

      {showNewCollectionModal && (
        <AddCollectionModal
          isOpen={showNewCollectionModal.isOpen}
          connections={connections}
          activeProjectId={showNewCollectionModal.selectedProjectId}
          onConfirm={handleNewCollectionConfirm}
          onCancel={handleNewCollectionCancel}
        />
      )}
    </div>
  );
});

export type { FirestoreViewRef };
