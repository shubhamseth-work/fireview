import React, { useState, useEffect, useCallback } from 'react';
import { FirestoreView } from './views/FirestoreView';
import { CompareView } from './views/CompareView';
import { ProjectCompareView } from './views/ProjectCompareView';
import { MigrationView } from './views/MigrationView';
import { AuditView } from './views/AuditView';
import { Connection, FirestoreDocument, FirestoreQuery } from '@vistiq/core';

declare const acquireVsCodeApi: () => { postMessage: (msg: unknown) => void; getState: () => unknown; setState: (state: unknown) => void };

interface Message {
  type: string;
  payload?: unknown;
  requestId?: string;
}

interface Response {
  type: 'response';
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

type ViewType = 'firestore' | 'compare' | 'project-compare' | 'migration' | 'audit';

export const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('firestore');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [documents, setDocuments] = useState<FirestoreDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<FirestoreDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false, nextToken: '' });

  const vscode = acquireVsCodeApi();

  const sendMessage = useCallback((type: string, payload?: unknown): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      const handler = (event: MessageEvent) => {
        const msg = event.data as Response;
        if (msg.type === 'response' && msg.requestId === requestId) {
          window.removeEventListener('message', handler);
          if (msg.success) resolve(msg.data);
          else reject(new Error(msg.error || 'Unknown error'));
        }
      };
      window.addEventListener('message', handler);
      vscode.postMessage({ type, payload, requestId });
    });
  }, [vscode]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    vscode.postMessage({ type: 'getActiveConnection' });
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleMessage = (event: MessageEvent) => {
    const msg = event.data as Message;
    if (msg.type === 'init') {
      setConnection(msg.payload as Connection);
      loadCollections();
    } else if (msg.type === 'openDocument') {
      const { documentPath } = msg.payload as { documentPath: string };
      loadDocument(documentPath);
    }
  };

  const loadDocument = async (documentPath: string) => {
    try {
      setLoading(true);
      const doc = await sendMessage('getDocument', { documentPath });
      setSelectedDocument(doc as FirestoreDocument);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      setLoading(true);
      const cols = await sendMessage('getCollections');
      setCollections(cols as any[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (collectionPath: string) => {
    try {
      setLoading(true);
      const result = await sendMessage('listDocuments', { collectionPath, options: { limit: 50 } });
      setDocuments((result as any).documents || []);
      setPagination({ page: 1, hasMore: (result as any).hasMore, nextToken: (result as any).nextPageToken || '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = (doc: FirestoreDocument) => {
    setSelectedDocument(doc);
  };

  const handleCloseDocument = () => {
    setSelectedDocument(null);
  };

  const handleRunQuery = async (query: FirestoreQuery) => {
    try {
      setLoading(true);
      const result = await sendMessage('runQuery', { query });
      setDocuments((result as any).documents || []);
      setPagination({ page: 1, hasMore: (result as any).hasMore, nextToken: (result as any).nextPageToken || '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (collectionPath: string, data: FirestoreDocument) => {
    try {
      await sendMessage('createDocument', { collectionPath, data });
      await loadDocuments(collectionPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpdateDocument = async (documentPath: string, data: Partial<FirestoreDocument>) => {
    try {
      await sendMessage('updateDocument', { documentPath, data });
      if (selectedDocument?.path === documentPath) {
        const updated = await sendMessage('getDocument', { documentPath });
        setSelectedDocument(updated as FirestoreDocument);
      }
      const collectionPath = documentPath.split('/').slice(0, -1).join('/');
      await loadDocuments(collectionPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteDocument = async (documentPath: string) => {
    try {
      await sendMessage('deleteDocument', { documentPath });
      if (selectedDocument?.path === documentPath) {
        setSelectedDocument(null);
      }
      const collectionPath = documentPath.split('/').slice(0, -1).join('/');
      await loadDocuments(collectionPath);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleExportCollection = async (collectionPath: string, format: 'json' | 'csv', outputPath: string) => {
    try {
      setLoading(true);
      await sendMessage('exportCollection', { collectionPath, format, outputPath });
      setError(null);
      return { success: true };
    } catch (err) {
      setError((err as Error).message);
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  const handleImportCollection = async (collectionPath: string, format: 'json' | 'csv', mode: 'create' | 'update' | 'upsert', inputPath: string) => {
    try {
      setLoading(true);
      const result = await sendMessage('importCollection', { collectionPath, format, mode, inputPath });
      await loadDocuments(collectionPath);
      return result;
    } catch (err) {
      setError((err as Error).message);
      return { success: false, error: (err as Error).message };
    } finally {
      setLoading(false);
    }
  };

  if (!connection) {
    return (
      <div className="empty-state" style={{ flex: 1 }}>
        <div className="icon">🔌</div>
        <h3>No Connection</h3>
        <p>Connect to a Firebase project from the sidebar to get started.</p>
      </div>
    );
  }

  const renderView = () => {
    switch (view) {
      case 'firestore':
        return (
          <FirestoreView
            connection={connection}
            collections={collections}
            documents={documents}
            selectedDocument={selectedDocument}
            loading={loading}
            error={error}
            pagination={pagination}
            onLoadDocuments={loadDocuments}
            onOpenDocument={handleOpenDocument}
            onCloseDocument={handleCloseDocument}
            onRunQuery={handleRunQuery}
            onCreateDocument={handleCreateDocument}
            onUpdateDocument={handleUpdateDocument}
            onDeleteDocument={handleDeleteDocument}
            onExportCollection={handleExportCollection}
            onImportCollection={handleImportCollection}
          />
        );
      case 'compare':
        return <CompareView connection={connection} onRunQuery={handleRunQuery} />;
      case 'project-compare':
        return <ProjectCompareView connection={connection} />;
      case 'migration':
        return <MigrationView connection={connection} />;
      case 'audit':
        return <AuditView connection={connection} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="toolbar">
        <div className="toolbar-group">
          <button onClick={() => setView('firestore')} className={view === 'firestore' ? 'active' : ''}>Firestore</button>
          <button onClick={() => setView('compare')} className={view === 'compare' ? 'active' : ''}>Compare</button>
          <button onClick={() => setView('project-compare')} className={view === 'project-compare' ? 'active' : ''}>Projects</button>
          <button onClick={() => setView('migration')} className={view === 'migration' ? 'active' : ''}>Migration</button>
          <button onClick={() => setView('audit')} className={view === 'audit' ? 'active' : ''}>Audit</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`badge ${connection.environment}`}>{connection.environment}</span>
          {connection.authMethod === 'emulator' && <span className="badge emulator">Emulator</span>}
          {connection.environment === 'production' && <span className="badge production">Production</span>}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderView()}
      </div>
      <div className="status-bar">
        <span>{connection.displayName} ({connection.projectId})</span>
        <span>{documents.length} documents</span>
      </div>
    </div>
  );
};