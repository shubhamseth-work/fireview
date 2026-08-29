import React, { useState } from 'react';
import { DocumentTable } from './DocumentTable';
import { DocumentViewer } from './DocumentViewer';
import { QueryBuilder } from './QueryBuilder';
import { CollectionTree } from './CollectionTree';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { NewDocumentModal } from './NewDocumentModal';
import { NewCollectionModal } from './NewCollectionModal';
import { FirestoreDocument, FirestoreQuery, FirestoreValue, QueryFilter, QueryOperator, OrderByClause } from '@fireview/core';
import { Connection } from '@fireview/core';

declare const acquireVsCodeApi: () => { postMessage: (msg: unknown) => void; getState: () => unknown; setState: (state: unknown) => void };
const vscode = acquireVsCodeApi();

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
  onCloseDocument: () => void;
  onRunQuery: (query: FirestoreQuery) => void;
  onCreateDocument: (collectionPath: string, data: FirestoreDocument) => void;
  onCreateCollection: (collectionId: string) => void;
  onUpdateDocument: (documentPath: string, data: Partial<FirestoreDocument>) => void;
  onDeleteDocument: (documentPath: string) => void;
  onExportCollection: (collectionPath: string, format: 'json' | 'csv', outputPath: string) => void;
  onImportCollection: (collectionPath: string, format: 'json' | 'csv', mode: 'create' | 'update' | 'upsert', inputPath: string) => void;
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
  connections: Array<{ projectId: string; displayName: string }>;
  activeProjectId: string | null;
  readOnlyCollections: Set<string>;
  setReadOnlyCollections: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  firebaseConfig?: FirebaseConfig;
  onConfigImport: (config: FirebaseConfig) => void;
  initialView?: 'firestore' | 'collection' | 'query';
}

export const FirestoreView: React.FC<FirestoreViewProps> = ({
  connection,
  collections,
  documents,
  selectedDocument,
  loading,
  error,
  pagination,
  onLoadDocuments,
  onOpenDocument,
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
  connections,
  activeProjectId,
  readOnlyCollections,
  setReadOnlyCollections,
  firebaseConfig,
  onConfigImport,
  initialView = 'firestore',
}) => {
  // Destructure authMethod from connection
  const authMethod = connection.authMethod;
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [showQueryBuilder, setShowQueryBuilder] = useState(initialView === 'query');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewDocumentModal, setShowNewDocumentModal] = useState(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleCollectionClick = (collectionPath: string, projectId?: string) => {
    setSelectedCollection(collectionPath);
    setShowQueryBuilder(false);
    onLoadDocuments(collectionPath, undefined, projectId);
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

  const handleAddDocumentFromTree = (collectionPath: string, docId: string, data: Record<string, any>) => {
    console.log('[FirestoreView] handleAddDocumentFromTree called', { collectionPath, docId, dataKeys: Object.keys(data) });
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

  const handleNewCollectionConfirm = (collectionId: string) => {
    onCreateCollection(collectionId);
    setShowNewCollectionModal(false);
  };

  const handleNewCollectionCancel = () => {
    setShowNewCollectionModal(false);
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

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {!isSidebarCollapsed && (
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
          <div className="toolbar">
            <button onClick={() => setShowQueryBuilder(!showQueryBuilder)} title="Query Builder">🔍 Query</button>
            <button onClick={() => setIsSidebarCollapsed(true)} title="Collapse sidebar" style={{ marginLeft: 'auto', padding: '4px 8px' }}>◀</button>
          </div>
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
              connections={connections}
              activeProjectId={activeProjectId}
            />
          )}
        </div>
      )}
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
          onMouseDown={(e) => {
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedDocument ? (
          <DocumentViewer
            document={selectedDocument}
            connection={connection}
            onClose={onCloseDocument}
            onUpdate={onUpdateDocument}
            onCreateDocument={onCreateDocument}
            onDelete={onDeleteDocument}
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
            connections={connections}
            activeProjectId={activeProjectId}
            collections={collections.map(c => c.id)}
            selectedCollection={selectedCollection}
            readOnlyCollections={readOnlyCollections}
          />
        )}
      </div>

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
        <NewCollectionModal
          isOpen={true}
          onConfirm={handleNewCollectionConfirm}
          onCancel={handleNewCollectionCancel}
        />
      )}
    </div>
  );
};