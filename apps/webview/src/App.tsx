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
const vscode = acquireVsCodeApi();

// Logger for webview
const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[Webview] ${msg}`, meta || ''),
  info: (msg: string, meta?: Record<string, unknown>) => console.info(`[Webview] ${msg}`, meta || ''),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[Webview] ${msg}`, meta || ''),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[Webview] ${msg}`, meta || ''),
};
export const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('firestore');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [documents, setDocuments] = useState<FirestoreDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<FirestoreDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false, nextToken: '', pageSize: 50 });
  const [selectedCollection, setSelectedCollection] = useState<string>('');

  // const vscode = acquireVsCodeApi();

  const sendMessage = useCallback((type: string, payload?: unknown): Promise<unknown> => {
    log.debug('sendMessage called', { type, payload });
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      const handler = (event: MessageEvent) => {
        const msg = event.data as Response;
        if (msg.type === 'response' && msg.requestId === requestId) {
          log.debug('sendMessage: Received response', { requestId, success: msg.success, hasError: !!msg.error, error: msg.error });
          window.removeEventListener('message', handler);
          if (msg.success) resolve(msg.data);
          else reject(new Error(msg.error || 'Unknown error'));
        }
      };
      window.addEventListener('message', handler);
      log.debug('sendMessage: Posting message', { type, requestId });
      vscode.postMessage({ type, payload, requestId });
    });
  }, [vscode]);

  useEffect(() => {
    log.info('App: Initializing, adding message listener');
    window.addEventListener('message', handleMessage);
    (async () => {
      try {
        log.info('App: Requesting active connection');
        const conn = await sendMessage('getActiveConnection');
        if (conn) {
          log.info('App: Got active connection', { projectId: (conn as Connection).projectId });
          setConnection(conn as Connection);
          loadCollections();
        } else {
          log.warn('App: No active connection found');
        }
      } catch (err) {
        log.error('App: Error getting active connection', { error: (err as Error).message });
        setError((err as Error).message);
      }
    })();
    return () => {
      log.info('App: Cleaning up message listener');
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleMessage = (event: MessageEvent) => {
    const msg = event.data as Message;
    log.debug('handleMessage: Received message', { type: msg.type, hasPayload: !!msg.payload, requestId: msg.requestId });
    if (msg.type === 'init') {
      log.info('handleMessage: Received init, setting connection');
      setConnection(msg.payload as Connection);
      loadCollections();
    } else if (msg.type === 'openDocument') {
      const { documentPath } = msg.payload as { documentPath: string };
      log.info('handleMessage: Received openDocument', { documentPath });
      loadDocument(documentPath);
    }
  };

  const loadDocument = async (documentPath: string) => {
    log.info('loadDocument called', { documentPath });
    try {
      setLoading(true);
      const doc = await sendMessage('getDocument', { documentPath });
      log.info('loadDocument: Success', { 
        documentPath, 
        docFound: doc !== null,
        docId: (doc as FirestoreDocument)?.id,
        dataKeys: (doc as FirestoreDocument)?.data ? Object.keys((doc as FirestoreDocument).data) : []
      });
      setSelectedDocument(doc as FirestoreDocument);
    } catch (err) {
      log.error('loadDocument: Error', { documentPath, error: (err as Error).message });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    log.info('loadCollections called');
    try {
      setLoading(true);
      const cols = await sendMessage('getCollections');
      log.info('loadCollections: Success', { count: (cols as any[]).length });
      setCollections(cols as any[]);
    } catch (err) {
      log.error('loadCollections: Error', { error: (err as Error).message });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (collectionPath: string, pageSize?: number) => {
    const limit = pageSize || pagination.pageSize;
    log.info('loadDocuments called', { collectionPath, limit });
    try {
      setLoading(true);
      setSelectedCollection(collectionPath);
      const result = await sendMessage('listDocuments', { collectionPath, options: { limit } });
      const docs = (result as any).documents || [];
      log.info('loadDocuments: Success', { collectionPath, count: docs.length, hasMore: (result as any).hasMore });
      setDocuments(docs);
      setPagination(prev => ({ 
        page: 1, 
        hasMore: (result as any).hasMore, 
        nextToken: (result as any).nextPageToken || '',
        pageSize: limit
      }));
    } catch (err) {
      log.error('loadDocuments: Error', { collectionPath, error: (err as Error).message });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!selectedCollection || !pagination.hasMore || !pagination.nextToken) return;
    log.info('loadMore called', { collectionPath: selectedCollection, nextToken: pagination.nextToken });
    try {
      setLoading(true);
      const result = await sendMessage('listDocuments', { 
        collectionPath: selectedCollection, 
        options: { 
          limit: pagination.pageSize,
          startAfter: { documentPath: pagination.nextToken }
        } 
      });
      const docs = (result as any).documents || [];
      log.info('loadMore: Success', { count: docs.length, hasMore: (result as any).hasMore });
      setDocuments(prev => [...prev, ...docs]);
      setPagination(prev => ({ 
        ...prev, 
        page: prev.page + 1,
        hasMore: (result as any).hasMore, 
        nextToken: (result as any).nextPageToken || prev.nextToken
      }));
    } catch (err) {
      log.error('loadMore: Error', { error: (err as Error).message });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    log.info('handlePageSizeChange', { pageSize });
    setPagination(prev => ({ ...prev, pageSize }));
    if (selectedCollection) {
      loadDocuments(selectedCollection, pageSize);
    }
  };

  const handleOpenDocument = (doc: FirestoreDocument) => {
    log.info('handleOpenDocument called', { docId: doc.id, docPath: doc.path });
    setSelectedDocument(doc);
  };

  const handleCloseDocument = () => {
    log.info('handleCloseDocument called');
    setSelectedDocument(null);
  };

  const handleRunQuery = async (query: FirestoreQuery) => {
    log.info('handleRunQuery called', { collectionPath: query.collectionPath });
    try {
      setLoading(true);
      const result = await sendMessage('runQuery', { query });
      const docs = (result as any).documents || [];
      log.info('handleRunQuery: Success', { count: docs.length });
      setDocuments(docs);
      setPagination(prev => ({ 
        page: 1, 
        hasMore: (result as any).hasMore, 
        nextToken: (result as any).nextPageToken || '',
        pageSize: prev.pageSize
      }));
    } catch (err) {
      log.error('handleRunQuery: Error', { error: (err as Error).message });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (collectionPath: string, data: FirestoreDocument) => {
    log.info('handleCreateDocument called', { collectionPath });
    try {
      await sendMessage('createDocument', { collectionPath, data });
      await loadDocuments(collectionPath);
    } catch (err) {
      log.error('handleCreateDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleUpdateDocument = async (documentPath: string, data: Partial<FirestoreDocument>) => {
    log.info('handleUpdateDocument called', { documentPath });
    try {
      await sendMessage('updateDocument', { documentPath, data });
      if (selectedDocument?.path === documentPath) {
        const updated = await sendMessage('getDocument', { documentPath });
        setSelectedDocument(updated as FirestoreDocument);
      }
      const collectionPath = documentPath.split('/').slice(0, -1).join('/');
      await loadDocuments(collectionPath);
    } catch (err) {
      log.error('handleUpdateDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleDeleteDocument = async (documentPath: string) => {
    log.info('handleDeleteDocument called', { documentPath });
    try {
      await sendMessage('deleteDocument', { documentPath });
      if (selectedDocument?.path === documentPath) {
        setSelectedDocument(null);
      }
      const collectionPath = documentPath.split('/').slice(0, -1).join('/');
      await loadDocuments(collectionPath);
    } catch (err) {
      log.error('handleDeleteDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleDuplicateDocument = async (doc: FirestoreDocument) => {
    log.info('handleDuplicateDocument called', { docId: doc.id });
    try {
      const collectionPath = doc.path.split('/').slice(0, -1).join('/');
      const newDoc = { ...doc, id: '', path: '' };
      await sendMessage('createDocument', { collectionPath, data: newDoc });
      await loadDocuments(collectionPath);
    } catch (err) {
      log.error('handleDuplicateDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleRenameDocument = async (doc: FirestoreDocument, newId: string) => {
    log.info('handleRenameDocument called', { docId: doc.id, newId });
    try {
      const collectionPath = doc.path.split('/').slice(0, -1).join('/');
      // Create new document first with new ID
      const newDoc = { ...doc, id: newId, path: `${collectionPath}/${newId}` };
      await sendMessage('createDocument', { collectionPath, data: newDoc, documentId: newId });
      // Only delete old document if create succeeded
      await sendMessage('deleteDocument', { documentPath: doc.path });
      await loadDocuments(collectionPath);
    } catch (err) {
      log.error('handleRenameDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleMoveDocument = async (doc: FirestoreDocument, targetCollection: string) => {
    log.info('handleMoveDocument called', { docId: doc.id, targetCollection });
    try {
      // First create in target collection
      const newDoc = { ...doc, id: '', path: '' };
      await sendMessage('createDocument', { collectionPath: targetCollection, data: newDoc });
      // Only delete source if create succeeded
      await sendMessage('deleteDocument', { documentPath: doc.path });
      if (selectedCollection) await loadDocuments(selectedCollection);
      if (targetCollection !== selectedCollection && selectedCollection) {
        await loadDocuments(targetCollection);
      }
    } catch (err) {
      log.error('handleMoveDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleCopyDocument = async (doc: FirestoreDocument, targetCollection: string) => {
    log.info('handleCopyDocument called', { docId: doc.id, targetCollection });
    try {
      // Create copy in target collection WITHOUT deleting source
      const newDoc = { ...doc, id: '', path: '' };
      await sendMessage('createDocument', { collectionPath: targetCollection, data: newDoc });
      // Refresh both collections if different
      if (selectedCollection) await loadDocuments(selectedCollection);
      if (targetCollection !== selectedCollection && selectedCollection) {
        await loadDocuments(targetCollection);
      }
    } catch (err) {
      log.error('handleCopyDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleExportDocument = async (doc: FirestoreDocument) => {
    log.info('handleExportDocument called', { docId: doc.id });
    try {
      const blob = new Blob([JSON.stringify(doc.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      log.error('handleExportDocument: Error', { error: (err as Error).message });
      setError((err as Error).message);
    }
  };

  const handleRevealInConsole = (doc: FirestoreDocument) => {
    log.info('handleRevealInConsole called', { docId: doc.id, projectId: connection?.projectId });
    if (connection) {
      const url = `https://console.firebase.google.com/project/${connection.projectId}/firestore/data~2F${encodeURIComponent(doc.path)}`;
      window.open(url, '_blank');
    }
  };

  const extractGeopoints = (data: Record<string, any>): Array<{ label: string; lat: number; lng: number }> => {
    const geopoints: Array<{ label: string; lat: number; lng: number }> = [];
    
    const traverse = (obj: any, path: string = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      if (obj.__type__ === 'geopoint' && obj.value) {
        geopoints.push({
          label: path || 'location',
          lat: obj.value.latitude,
          lng: obj.value.longitude
        });
      } else if (obj.__type__ === 'map' && obj.value) {
        for (const [key, value] of Object.entries(obj.value)) {
          traverse(value, path ? `${path}.${key}` : key);
        }
      } else if (obj.__type__ === 'array' && obj.value) {
        obj.value.forEach((item: any, index: number) => {
          traverse(item, `${path}[${index}]`);
        });
      } else if (Array.isArray(obj)) {
        obj.forEach((item: any, index: number) => {
          traverse(item, `${path}[${index}]`);
        });
      } else {
        for (const [key, value] of Object.entries(obj)) {
          traverse(value, path ? `${path}.${key}` : key);
        }
      }
    };
    
    traverse(data);
    return geopoints;
  };

  const handleShowGeopoints = (doc: FirestoreDocument) => {
    log.info('handleShowGeopoints called', { docId: doc.id });
    const geopoints = extractGeopoints(doc.data);
    
    if (geopoints.length === 0) {
      alert('No geopoints found in this document');
      return;
    }
    
    if (geopoints.length === 1) {
      const gp = geopoints[0];
      if (!gp) return;
      const url = `https://www.google.com/maps/search/?api=1&query=${gp.lat},${gp.lng}`;
      window.open(url, '_blank');
    } else {
      // Multiple geopoints - open Google Maps with all points
      const waypoints = geopoints.map(gp => `${gp.lat},${gp.lng}`).join('/');
      const url = `https://www.google.com/maps/dir/${waypoints}`;
      window.open(url, '_blank');
    }
  };

  const handleImportDocument = async (doc: FirestoreDocument | null, targetCollection?: string) => {
    log.info('handleImportDocument called', { docId: doc?.id, targetCollection });
    
    return new Promise<void>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve();
          return;
        }
        
        try {
          const text = await file.text();
          const importData = JSON.parse(text);
          
          const collectionPath = targetCollection || (doc ? doc.path.split('/').slice(0, -1).join('/') : selectedCollection);
          if (!collectionPath) {
            alert('No collection selected. Please select a collection first.');
            resolve();
            return;
          }
          
          // If doc is provided, update it; otherwise create new
          if (doc) {
            await sendMessage('updateDocument', { 
              documentPath: doc.path, 
              data: { data: importData } 
            });
          } else {
            await sendMessage('createDocument', { 
              collectionPath, 
              data: { id: '', path: '', data: importData } 
            });
          }
          
          if (selectedCollection) await loadDocuments(selectedCollection);
          resolve();
        } catch (err) {
          log.error('handleImportDocument: Error', { error: (err as Error).message });
          setError((err as Error).message);
          alert(`Import failed: ${(err as Error).message}`);
          resolve();
        }
      };
      input.click();
    });
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
            onLoadMore={loadMore}
            onPageSizeChange={handlePageSizeChange}
            onCopyDocument={() => {}}
            onCopyDocumentTo={handleCopyDocument}
            onDuplicateDocument={handleDuplicateDocument}
            onRenameDocument={handleRenameDocument}
            onMoveDocument={handleMoveDocument}
            onShowGeopoints={handleShowGeopoints}
            onImportDocument={handleImportDocument}
            onExportDocument={handleExportDocument}
            onRevealInConsole={handleRevealInConsole}
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