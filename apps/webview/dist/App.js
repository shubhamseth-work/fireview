import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { FirestoreView } from './views/FirestoreView';
import { CompareView } from './views/CompareView';
import { ProjectCompareView } from './views/ProjectCompareView';
import { MigrationView } from './views/MigrationView';
import { AuditView } from './views/AuditView';
import { NotificationProvider, useNotify } from './context/NotificationContext';
const vscode = acquireVsCodeApi();
// Logger for webview
const log = {
    debug: (msg, meta) => console.debug(`[Webview] ${msg}`, meta || ''),
    info: (msg, meta) => console.info(`[Webview] ${msg}`, meta || ''),
    warn: (msg, meta) => console.warn(`[Webview] ${msg}`, meta || ''),
    error: (msg, meta) => console.error(`[Webview] ${msg}`, meta || ''),
};
const AppInner = () => {
    const notify = useNotify();
    const [view, setView] = useState('firestore');
    const [connection, setConnection] = useState(null);
    const [collections, setCollections] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, hasMore: false, nextToken: '', pageSize: 50 });
    const [selectedCollection, setSelectedCollection] = useState('');
    const [readOnlyCollections, setReadOnlyCollections] = useState(new Set());
    const [connections, setConnections] = useState([]);
    const [firebaseConfig, setFirebaseConfig] = useState(null);
    // Load Firebase config from localStorage on init
    useEffect(() => {
        try {
            const stored = localStorage.getItem('vistiq-firebase-config');
            if (stored) {
                const config = JSON.parse(stored);
                if (config.apiKey && config.projectId) {
                    setFirebaseConfig(config);
                    log.info('Loaded Firebase config from localStorage');
                }
            }
        }
        catch (err) {
            log.warn('Failed to load Firebase config from localStorage', { error: err.message });
        }
    }, []);
    const handleConfigImport = useCallback((config) => {
        setFirebaseConfig(config);
        try {
            localStorage.setItem('vistiq-firebase-config', JSON.stringify(config));
            log.info('Saved Firebase config to localStorage');
        }
        catch (err) {
            log.error('Failed to save Firebase config', { error: err.message });
        }
    }, []);
    // const vscode = acquireVsCodeApi();
    const sendMessage = useCallback((type, payload) => {
        log.debug('sendMessage called', { type, payload });
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            const handler = (event) => {
                const msg = event.data;
                if (msg.type === 'response' && msg.requestId === requestId) {
                    log.debug('sendMessage: Received response', { requestId, success: msg.success, hasError: !!msg.error, error: msg.error });
                    window.removeEventListener('message', handler);
                    if (msg.success)
                        resolve(msg.data);
                    else
                        reject(new Error(msg.error || 'Unknown error'));
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
                    log.info('App: Got active connection', { projectId: conn.projectId });
                    setConnection(conn);
                    loadCollections();
                }
                else {
                    log.warn('App: No active connection found');
                }
                // Fetch all connections for Copy/Move modal
                try {
                    const conns = await sendMessage('getConnections');
                    setConnections(conns);
                }
                catch (err) {
                    log.warn('App: Could not fetch connections', { error: err.message });
                }
            }
            catch (err) {
                log.error('App: Error getting active connection', { error: err.message });
                setError(err.message);
            }
        })();
        return () => {
            log.info('App: Cleaning up message listener');
            window.removeEventListener('message', handleMessage);
        };
    }, []);
    const handleMessage = (event) => {
        const msg = event.data;
        log.debug('handleMessage: Received message', { type: msg.type, hasPayload: !!msg.payload, requestId: msg.requestId });
        if (msg.type === 'init') {
            log.info('handleMessage: Received init, setting connection');
            setConnection(msg.payload);
            loadCollections();
        }
        else if (msg.type === 'openDocument') {
            const { documentPath } = msg.payload;
            log.info('handleMessage: Received openDocument', { documentPath });
            loadDocument(documentPath);
        }
    };
    const loadDocument = async (documentPath) => {
        log.info('loadDocument called', { documentPath });
        try {
            setLoading(true);
            const doc = await sendMessage('getDocument', { documentPath });
            log.info('loadDocument: Success', {
                documentPath,
                docFound: doc !== null,
                docId: doc?.id,
                dataKeys: doc?.data ? Object.keys(doc.data) : []
            });
            setSelectedDocument(doc);
        }
        catch (err) {
            log.error('loadDocument: Error', { documentPath, error: err.message });
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const loadCollections = async () => {
        log.info('loadCollections called');
        try {
            setLoading(true);
            const cols = await sendMessage('getCollections');
            log.info('loadCollections: Success', { count: cols.length });
            setCollections(cols);
        }
        catch (err) {
            log.error('loadCollections: Error', { error: err.message });
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const loadDocuments = async (collectionPath, pageSize) => {
        const limit = pageSize || pagination.pageSize;
        log.info('loadDocuments called', { collectionPath, limit });
        try {
            setLoading(true);
            setSelectedCollection(collectionPath);
            const result = await sendMessage('listDocuments', { collectionPath, options: { limit } });
            const docs = result.documents || [];
            log.info('loadDocuments: Success', { collectionPath, count: docs.length, hasMore: result.hasMore });
            setDocuments(docs);
            setPagination(prev => ({
                page: 1,
                hasMore: result.hasMore,
                nextToken: result.nextPageToken || '',
                pageSize: limit
            }));
        }
        catch (err) {
            log.error('loadDocuments: Error', { collectionPath, error: err.message });
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const loadMore = async () => {
        if (!selectedCollection || !pagination.hasMore || !pagination.nextToken)
            return;
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
            const docs = result.documents || [];
            log.info('loadMore: Success', { count: docs.length, hasMore: result.hasMore });
            setDocuments(prev => [...prev, ...docs]);
            setPagination(prev => ({
                ...prev,
                page: prev.page + 1,
                hasMore: result.hasMore,
                nextToken: result.nextPageToken || prev.nextToken
            }));
        }
        catch (err) {
            log.error('loadMore: Error', { error: err.message });
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePageSizeChange = (pageSize) => {
        log.info('handlePageSizeChange', { pageSize });
        setPagination(prev => ({ ...prev, pageSize }));
        if (selectedCollection) {
            loadDocuments(selectedCollection, pageSize);
        }
    };
    const handleOpenDocument = (doc) => {
        log.info('handleOpenDocument called', { docId: doc.id, docPath: doc.path });
        setSelectedDocument(doc);
    };
    const handleCloseDocument = () => {
        log.info('handleCloseDocument called');
        setSelectedDocument(null);
    };
    const handleRunQuery = async (query) => {
        log.info('handleRunQuery called', { collectionPath: query.collectionPath });
        try {
            setLoading(true);
            const result = await sendMessage('runQuery', { query });
            const docs = result.documents || [];
            log.info('handleRunQuery: Success', { count: docs.length });
            setDocuments(docs);
            setPagination(prev => ({
                page: 1,
                hasMore: result.hasMore,
                nextToken: result.nextPageToken || '',
                pageSize: prev.pageSize
            }));
        }
        catch (err) {
            log.error('handleRunQuery: Error', { error: err.message });
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateDocument = async (collectionPath, data) => {
        console.log('[App] handleCreateDocument called', { collectionPath, docId: data.id, dataKeys: Object.keys(data.data) });
        log.info('handleCreateDocument called', { collectionPath });
        try {
            await sendMessage('createDocument', { collectionPath, data });
            await loadDocuments(collectionPath);
        }
        catch (err) {
            log.error('handleCreateDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleCreateCollection = async (collectionId) => {
        console.log('[App] handleCreateCollection called', { collectionId });
        log.info('handleCreateCollection called', { collectionId });
        try {
            await sendMessage('createCollection', { collectionId });
            await loadCollections();
        }
        catch (err) {
            log.error('handleCreateCollection: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleUpdateDocument = async (documentPath, data) => {
        log.info('handleUpdateDocument called', { documentPath });
        try {
            await sendMessage('updateDocument', { documentPath, data });
            if (selectedDocument?.path === documentPath) {
                const updated = await sendMessage('getDocument', { documentPath });
                setSelectedDocument(updated);
            }
            const collectionPath = documentPath.split('/').slice(0, -1).join('/');
            await loadDocuments(collectionPath);
        }
        catch (err) {
            log.error('handleUpdateDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleDeleteDocument = async (documentPath) => {
        log.info('handleDeleteDocument called', { documentPath });
        try {
            await sendMessage('deleteDocument', { documentPath });
            if (selectedDocument?.path === documentPath) {
                setSelectedDocument(null);
            }
            const collectionPath = documentPath.split('/').slice(0, -1).join('/');
            await loadDocuments(collectionPath);
        }
        catch (err) {
            log.error('handleDeleteDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleDuplicateDocument = async (doc) => {
        log.info('handleDuplicateDocument called', { docId: doc.id });
        try {
            const collectionPath = doc.path.split('/').slice(0, -1).join('/');
            const newDoc = { ...doc, id: '', path: '' };
            await sendMessage('createDocument', { collectionPath, data: newDoc });
            await loadDocuments(collectionPath);
        }
        catch (err) {
            log.error('handleDuplicateDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleRenameDocument = async (doc, newId) => {
        log.info('handleRenameDocument called', { docId: doc.id, newId });
        try {
            const collectionPath = doc.path.split('/').slice(0, -1).join('/');
            // Create new document first with new ID
            const newDoc = { ...doc, id: newId, path: `${collectionPath}/${newId}` };
            await sendMessage('createDocument', { collectionPath, data: newDoc, documentId: newId });
            // Only delete old document if create succeeded
            await sendMessage('deleteDocument', { documentPath: doc.path });
            await loadDocuments(collectionPath);
        }
        catch (err) {
            log.error('handleRenameDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleMoveDocument = async (doc, targetCollection) => {
        log.info('handleMoveDocument called', { docId: doc.id, targetCollection });
        try {
            // First create in target collection
            const newDoc = { ...doc, id: '', path: '' };
            await sendMessage('createDocument', { collectionPath: targetCollection, data: newDoc });
            // Only delete source if create succeeded
            await sendMessage('deleteDocument', { documentPath: doc.path });
            if (selectedCollection)
                await loadDocuments(selectedCollection);
            if (targetCollection !== selectedCollection && selectedCollection) {
                await loadDocuments(targetCollection);
            }
        }
        catch (err) {
            log.error('handleMoveDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleCopyDocument = async (doc, targetCollection) => {
        log.info('handleCopyDocument called', { docId: doc.id, targetCollection });
        try {
            // Create copy in target collection WITHOUT deleting source
            const newDoc = { ...doc, id: '', path: '' };
            await sendMessage('createDocument', { collectionPath: targetCollection, data: newDoc });
            // Refresh both collections if different
            if (selectedCollection)
                await loadDocuments(selectedCollection);
            if (targetCollection !== selectedCollection && selectedCollection) {
                await loadDocuments(targetCollection);
            }
        }
        catch (err) {
            log.error('handleCopyDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleExportDocument = async (doc) => {
        log.info('handleExportDocument called', { docId: doc.id });
        try {
            const blob = new Blob([JSON.stringify(doc.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (err) {
            log.error('handleExportDocument: Error', { error: err.message });
            setError(err.message);
        }
    };
    const handleRevealInConsole = (doc) => {
        log.info('handleRevealInConsole called', { docId: doc.id, projectId: connection?.projectId });
        if (connection) {
            const url = `https://console.firebase.google.com/project/${connection.projectId}/firestore/data~2F${encodeURIComponent(doc.path)}`;
            window.open(url, '_blank');
        }
    };
    const extractGeopoints = (data) => {
        const geopoints = [];
        const traverse = (obj, path = '') => {
            if (!obj || typeof obj !== 'object')
                return;
            if (obj.__type__ === 'geopoint' && obj.value) {
                geopoints.push({
                    label: path || 'location',
                    lat: obj.value.latitude,
                    lng: obj.value.longitude
                });
            }
            else if (obj.__type__ === 'map' && obj.value) {
                for (const [key, value] of Object.entries(obj.value)) {
                    traverse(value, path ? `${path}.${key}` : key);
                }
            }
            else if (obj.__type__ === 'array' && obj.value) {
                obj.value.forEach((item, index) => {
                    traverse(item, `${path}[${index}]`);
                });
            }
            else if (Array.isArray(obj)) {
                obj.forEach((item, index) => {
                    traverse(item, `${path}[${index}]`);
                });
            }
            else {
                for (const [key, value] of Object.entries(obj)) {
                    traverse(value, path ? `${path}.${key}` : key);
                }
            }
        };
        traverse(data);
        return geopoints;
    };
    const handleShowGeopoints = (doc) => {
        log.info('handleShowGeopoints called', { docId: doc.id });
        const geopoints = extractGeopoints(doc.data);
        if (geopoints.length === 0) {
            notify('info', 'No geopoints found in this document');
            return;
        }
        if (geopoints.length === 1) {
            const gp = geopoints[0];
            if (!gp)
                return;
            const url = `https://www.google.com/maps/search/?api=1&query=${gp.lat},${gp.lng}`;
            window.open(url, '_blank');
        }
        else {
            // Multiple geopoints - open Google Maps with all points
            const waypoints = geopoints.map(gp => `${gp.lat},${gp.lng}`).join('/');
            const url = `https://www.google.com/maps/dir/${waypoints}`;
            window.open(url, '_blank');
        }
    };
    const handleImportDocument = async (doc, targetCollection) => {
        log.info('handleImportDocument called', { docId: doc?.id, targetCollection });
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                    resolve();
                    return;
                }
                try {
                    const text = await file.text();
                    const importData = JSON.parse(text);
                    const collectionPath = targetCollection || (doc ? doc.path.split('/').slice(0, -1).join('/') : selectedCollection);
                    if (!collectionPath) {
                        notify('error', 'No collection selected. Please select a collection first.');
                        resolve();
                        return;
                    }
                    // If doc is provided, update it; otherwise create new
                    if (doc) {
                        await sendMessage('updateDocument', {
                            documentPath: doc.path,
                            data: { data: importData }
                        });
                        notify('success', 'Document updated successfully');
                    }
                    else {
                        await sendMessage('createDocument', {
                            collectionPath,
                            data: { id: '', path: '', data: importData }
                        });
                        notify('success', 'Document created successfully');
                    }
                    if (selectedCollection)
                        await loadDocuments(selectedCollection);
                    resolve();
                }
                catch (err) {
                    log.error('handleImportDocument: Error', { error: err.message });
                    setError(err.message);
                    notify('error', `Import failed: ${err.message}`);
                    resolve();
                }
            };
            input.click();
        });
    };
    const handleExportCollection = async (collectionPath, format, outputPath) => {
        try {
            setLoading(true);
            await sendMessage('exportCollection', { collectionPath, format, outputPath });
            setError(null);
            return { success: true };
        }
        catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
        finally {
            setLoading(false);
        }
    };
    const handleImportCollection = async (collectionPath, format, mode, inputPath) => {
        try {
            setLoading(true);
            const result = await sendMessage('importCollection', { collectionPath, format, mode, inputPath });
            await loadDocuments(collectionPath);
            return result;
        }
        catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
        finally {
            setLoading(false);
        }
    };
    if (!connection) {
        return (_jsxs("div", { className: "empty-state", style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }, children: [_jsx("div", { className: "icon", children: "\uD83D\uDD0C" }), _jsx("h3", { children: "No Connection" }), _jsx("p", { style: { textAlign: 'center', maxWidth: 400 }, children: "Connect to a Firebase project to get started." }), _jsxs("div", { style: { display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }, children: [_jsx("button", { onClick: () => vscode.postMessage({ type: 'connectServiceAccount' }), style: {
                                padding: '12px 24px',
                                fontSize: 14,
                                fontWeight: 500,
                                backgroundColor: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }, children: "\uD83D\uDD10 Service Account" }), _jsx("button", { onClick: () => vscode.postMessage({ type: 'connectEmulator' }), style: {
                                padding: '12px 24px',
                                fontSize: 14,
                                fontWeight: 500,
                                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                                color: 'var(--vscode-button-secondaryForeground)',
                                border: '1px solid var(--vscode-button-secondaryBorder)',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }, children: "\uD83E\uDDEA Firebase Emulator" })] })] }));
    }
    const renderView = () => {
        switch (view) {
            case 'firestore':
            case 'collection':
            case 'query':
                return (_jsx(FirestoreView, { connection: connection, collections: collections, documents: documents, selectedDocument: selectedDocument, loading: loading, error: error, pagination: pagination, onLoadDocuments: loadDocuments, onOpenDocument: handleOpenDocument, onCloseDocument: handleCloseDocument, onRunQuery: handleRunQuery, onCreateDocument: handleCreateDocument, onCreateCollection: handleCreateCollection, onUpdateDocument: handleUpdateDocument, onDeleteDocument: handleDeleteDocument, onExportCollection: handleExportCollection, onImportCollection: handleImportCollection, onLoadMore: loadMore, onPageSizeChange: handlePageSizeChange, onCopyDocument: () => { }, onCopyDocumentTo: handleCopyDocument, onDuplicateDocument: handleDuplicateDocument, onRenameDocument: handleRenameDocument, onMoveDocument: handleMoveDocument, onShowGeopoints: handleShowGeopoints, onImportDocument: handleImportDocument, onExportDocument: handleExportDocument, onRevealInConsole: handleRevealInConsole, connections: connections, activeProjectId: connection?.projectId || null, readOnlyCollections: readOnlyCollections, setReadOnlyCollections: setReadOnlyCollections, firebaseConfig: firebaseConfig || undefined, onConfigImport: handleConfigImport, initialView: view === 'query' ? 'query' : view === 'collection' ? 'collection' : 'firestore' }));
            case 'compare':
                return _jsx(CompareView, { connection: connection, onRunQuery: handleRunQuery });
            case 'project-compare':
                return _jsx(ProjectCompareView, { connection: connection });
            case 'migration':
                return _jsx(MigrationView, { connection: connection });
            case 'audit':
                return _jsx(AuditView, { connection: connection });
            default:
                return null;
        }
    };
    return (_jsx(NotificationProvider, { children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100vh' }, children: [_jsxs("div", { className: "toolbar", children: [_jsxs("div", { className: "toolbar-group", children: [_jsx("button", { onClick: () => setView('firestore'), className: view === 'firestore' ? 'active' : '', children: "Firestore" }), _jsx("button", { onClick: () => setView('collection'), className: view === 'collection' ? 'active' : '', children: "Collection" }), _jsx("button", { onClick: () => setView('query'), className: view === 'query' ? 'active' : '', children: "Query" }), _jsx("button", { onClick: () => setView('compare'), className: view === 'compare' ? 'active' : '', children: "Compare" }), _jsx("button", { onClick: () => setView('project-compare'), className: view === 'project-compare' ? 'active' : '', children: "Projects" }), _jsx("button", { onClick: () => setView('migration'), className: view === 'migration' ? 'active' : '', children: "Migration" }), _jsx("button", { onClick: () => setView('audit'), className: view === 'audit' ? 'active' : '', children: "Audit" })] }), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("span", { className: `badge ${connection.environment}`, children: connection.environment }), connection.authMethod === 'emulator' && _jsx("span", { className: "badge emulator", children: "Emulator" }), connection.environment === 'production' && _jsx("span", { className: "badge production", children: "Production" })] })] }), _jsx("div", { style: { flex: 1, overflow: 'hidden' }, children: renderView() }), _jsxs("div", { className: "status-bar", children: [_jsxs("span", { children: [connection.displayName, " (", connection.projectId, ")"] }), _jsxs("span", { children: [documents.length, " documents"] })] })] }) }));
};
export const App = () => (_jsx(NotificationProvider, { children: _jsx(AppInner, {}) }));
//# sourceMappingURL=App.js.map