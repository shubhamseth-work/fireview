import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { FirestoreView } from './views/FirestoreView';
import { CompareView } from './views/CompareView';
import { ProjectCompareView } from './views/ProjectCompareView';
import { MigrationView } from './views/MigrationView';
import { AuditView } from './views/AuditView';
export const App = () => {
    const [view, setView] = useState('firestore');
    const [connection, setConnection] = useState(null);
    const [collections, setCollections] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, hasMore: false, nextToken: '' });
    const vscode = acquireVsCodeApi();
    const sendMessage = useCallback((type, payload) => {
        return new Promise((resolve, reject) => {
            const requestId = Math.random().toString(36).substring(7);
            const handler = (event) => {
                const msg = event.data;
                if (msg.type === 'response' && msg.requestId === requestId) {
                    window.removeEventListener('message', handler);
                    if (msg.success)
                        resolve(msg.data);
                    else
                        reject(new Error(msg.error || 'Unknown error'));
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
    const handleMessage = (event) => {
        const msg = event.data;
        if (msg.type === 'init') {
            setConnection(msg.payload);
            loadCollections();
        }
    };
    const loadCollections = async () => {
        try {
            setLoading(true);
            const cols = await sendMessage('getCollections');
            setCollections(cols);
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const loadDocuments = async (collectionPath) => {
        try {
            setLoading(true);
            const result = await sendMessage('listDocuments', { collectionPath, options: { limit: 50 } });
            setDocuments(result.documents || []);
            setPagination({ page: 1, hasMore: result.hasMore, nextToken: result.nextPageToken || '' });
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleOpenDocument = (doc) => {
        setSelectedDocument(doc);
    };
    const handleCloseDocument = () => {
        setSelectedDocument(null);
    };
    const handleRunQuery = async (query) => {
        try {
            setLoading(true);
            const result = await sendMessage('runQuery', { query });
            setDocuments(result.documents || []);
            setPagination({ page: 1, hasMore: result.hasMore, nextToken: result.nextPageToken || '' });
        }
        catch (err) {
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateDocument = async (collectionPath, data) => {
        try {
            await sendMessage('createDocument', { collectionPath, data });
            await loadDocuments(collectionPath);
        }
        catch (err) {
            setError(err.message);
        }
    };
    const handleUpdateDocument = async (documentPath, data) => {
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
            setError(err.message);
        }
    };
    const handleDeleteDocument = async (documentPath) => {
        try {
            await sendMessage('deleteDocument', { documentPath });
            if (selectedDocument?.path === documentPath) {
                setSelectedDocument(null);
            }
            const collectionPath = documentPath.split('/').slice(0, -1).join('/');
            await loadDocuments(collectionPath);
        }
        catch (err) {
            setError(err.message);
        }
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
        }
        finally {
            setLoading(false);
        }
    };
    if (!connection) {
        return (_jsxs("div", { className: "empty-state", style: { flex: 1 }, children: [_jsx("div", { className: "icon", children: "\uD83D\uDD0C" }), _jsx("h3", { children: "No Connection" }), _jsx("p", { children: "Connect to a Firebase project from the sidebar to get started." })] }));
    }
    const renderView = () => {
        switch (view) {
            case 'firestore':
                return (_jsx(FirestoreView, { connection: connection, collections: collections, documents: documents, selectedDocument: selectedDocument, loading: loading, error: error, pagination: pagination, onLoadDocuments: loadDocuments, onOpenDocument: handleOpenDocument, onCloseDocument: handleCloseDocument, onRunQuery: handleRunQuery, onCreateDocument: handleCreateDocument, onUpdateDocument: handleUpdateDocument, onDeleteDocument: handleDeleteDocument, onExportCollection: handleExportCollection, onImportCollection: handleImportCollection }));
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
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100vh' }, children: [_jsxs("div", { className: "toolbar", children: [_jsxs("div", { className: "toolbar-group", children: [_jsx("button", { onClick: () => setView('firestore'), className: view === 'firestore' ? 'active' : '', children: "Firestore" }), _jsx("button", { onClick: () => setView('compare'), className: view === 'compare' ? 'active' : '', children: "Compare" }), _jsx("button", { onClick: () => setView('project-compare'), className: view === 'project-compare' ? 'active' : '', children: "Projects" }), _jsx("button", { onClick: () => setView('migration'), className: view === 'migration' ? 'active' : '', children: "Migration" }), _jsx("button", { onClick: () => setView('audit'), className: view === 'audit' ? 'active' : '', children: "Audit" })] }), _jsxs("div", { style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }, children: [_jsx("span", { className: `badge ${connection.environment}`, children: connection.environment }), connection.authMethod === 'emulator' && _jsx("span", { className: "badge emulator", children: "Emulator" }), connection.environment === 'production' && _jsx("span", { className: "badge production", children: "Production" })] })] }), _jsx("div", { style: { flex: 1, overflow: 'hidden' }, children: renderView() }), _jsxs("div", { className: "status-bar", children: [_jsxs("span", { children: [connection.displayName, " (", connection.projectId, ")"] }), _jsxs("span", { children: [documents.length, " documents"] })] })] }));
};
//# sourceMappingURL=App.js.map