import React, { useState } from 'react';
import { DocumentTable } from './DocumentTable';
import { DocumentViewer } from './DocumentViewer';
import { QueryBuilder } from './QueryBuilder';
import { CollectionTree } from './CollectionTree';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { FirestoreDocument, FirestoreQuery, FirestoreValue, QueryFilter, QueryOperator, OrderByClause } from '@vistiq/core';
import { Connection } from '@vistiq/core';

interface FirestoreViewProps {
  connection: Connection;
  collections: any[];
  documents: FirestoreDocument[];
  selectedDocument: FirestoreDocument | null;
  loading: boolean;
  error: string | null;
  pagination: { page: number; hasMore: boolean; nextToken: string };
  onLoadDocuments: (collectionPath: string) => void;
  onOpenDocument: (doc: FirestoreDocument) => void;
  onCloseDocument: () => void;
  onRunQuery: (query: FirestoreQuery) => void;
  onCreateDocument: (collectionPath: string, data: FirestoreDocument) => void;
  onUpdateDocument: (documentPath: string, data: Partial<FirestoreDocument>) => void;
  onDeleteDocument: (documentPath: string) => void;
  onExportCollection: (collectionPath: string, format: 'json' | 'csv', outputPath: string) => void;
  onImportCollection: (collectionPath: string, format: 'json' | 'csv', mode: 'create' | 'update' | 'upsert', inputPath: string) => void;
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
  onUpdateDocument,
  onDeleteDocument,
  onExportCollection,
  onImportCollection,
}) => {
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [showQueryBuilder, setShowQueryBuilder] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);

  const handleCollectionClick = (collectionPath: string) => {
    setSelectedCollection(collectionPath);
    setShowQueryBuilder(false);
    onLoadDocuments(collectionPath);
  };

  const handleNewDocument = () => {
    if (!selectedCollection) return;
    const newDoc: FirestoreDocument = {
      id: '',
      path: '',
      data: {},
    };
    onOpenDocument(newDoc);
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

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div
        style={{
          width: sidebarWidth,
          minWidth: 200,
          maxWidth: 500,
          borderRight: '1px solid var(--vscode-border)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--vscode-sidebar-bg)',
        }}
      >
        <div className="toolbar">
          <button onClick={handleNewDocument} title="New Document (Ctrl+N)">+ Document</button>
          <button onClick={() => setShowQueryBuilder(!showQueryBuilder)} title="Query Builder">🔍 Query</button>
          <button onClick={handleExport} title="Export Collection">📤 Export</button>
          <button onClick={handleImport} title="Import Collection">📥 Import</button>
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
          />
        )}
      </div>

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedDocument ? (
          <DocumentViewer
            document={selectedDocument}
            connection={connection}
            onClose={onCloseDocument}
            onUpdate={onUpdateDocument}
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
    </div>
  );
};