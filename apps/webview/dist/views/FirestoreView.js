import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { DocumentTable } from './DocumentTable';
import { DocumentViewer } from './DocumentViewer';
import { QueryBuilder } from './QueryBuilder';
import { CollectionTree } from './CollectionTree';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
export const FirestoreView = ({ connection, collections, documents, selectedDocument, loading, error, pagination, onLoadDocuments, onOpenDocument, onCloseDocument, onRunQuery, onCreateDocument, onUpdateDocument, onDeleteDocument, onExportCollection, onImportCollection, }) => {
    const [selectedCollection, setSelectedCollection] = useState('');
    const [showQueryBuilder, setShowQueryBuilder] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const handleCollectionClick = (collectionPath) => {
        setSelectedCollection(collectionPath);
        setShowQueryBuilder(false);
        onLoadDocuments(collectionPath);
    };
    const handleNewDocument = () => {
        if (!selectedCollection)
            return;
        const newDoc = {
            id: '',
            path: '',
            data: {},
        };
        onOpenDocument(newDoc);
    };
    const handleRunQuery = (query) => {
        onRunQuery(query);
        setShowQueryBuilder(false);
    };
    const handleExport = () => {
        if (!selectedCollection)
            return;
        setShowExportModal(true);
    };
    const handleImport = () => {
        if (!selectedCollection)
            return;
        setShowImportModal(true);
    };
    return (_jsxs("div", { style: { display: 'flex', height: '100%', overflow: 'hidden' }, children: [!isSidebarCollapsed && (_jsxs("div", { style: {
                    width: sidebarWidth,
                    minWidth: 200,
                    maxWidth: 500,
                    borderRight: '1px solid var(--vscode-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--vscode-sidebar-bg)',
                    flexShrink: 0,
                }, children: [_jsxs("div", { className: "toolbar", children: [_jsx("button", { onClick: handleNewDocument, title: "New Document (Ctrl+N)", children: "+ Document" }), _jsx("button", { onClick: () => setShowQueryBuilder(!showQueryBuilder), title: "Query Builder", children: "\uD83D\uDD0D Query" }), _jsx("button", { onClick: handleExport, title: "Export Collection", children: "\uD83D\uDCE4 Export" }), _jsx("button", { onClick: handleImport, title: "Import Collection", children: "\uD83D\uDCE5 Import" }), _jsx("button", { onClick: () => setIsSidebarCollapsed(true), title: "Collapse sidebar", style: { marginLeft: 'auto', padding: '4px 8px' }, children: "\u25C0" })] }), showQueryBuilder ? (_jsx(QueryBuilder, { collections: collections, onRunQuery: handleRunQuery, onClose: () => setShowQueryBuilder(false) })) : (_jsx(CollectionTree, { collections: collections, selectedCollection: selectedCollection, onSelect: handleCollectionClick, loading: loading }))] })), isSidebarCollapsed && (_jsx("button", { onClick: () => setIsSidebarCollapsed(false), style: {
                    width: 32,
                    height: '100%',
                    borderRight: '1px solid var(--vscode-border)',
                    backgroundColor: 'var(--vscode-sidebar-bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                }, title: "Expand sidebar", children: "\u25B6" })), !isSidebarCollapsed && (_jsx("div", { style: {
                    width: 6,
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                }, onMouseDown: (e) => {
                    const startX = e.clientX;
                    const startWidth = sidebarWidth;
                    const onMouseMove = (e) => {
                        setSidebarWidth(Math.max(200, Math.min(500, startWidth + e.clientX - startX)));
                    };
                    const onMouseUp = () => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                    };
                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                } })), _jsx("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: selectedDocument ? (_jsx(DocumentViewer, { document: selectedDocument, connection: connection, onClose: onCloseDocument, onUpdate: onUpdateDocument, onDelete: onDeleteDocument })) : (_jsx(DocumentTable, { documents: documents, loading: loading, error: error, pagination: pagination, onRowClick: onOpenDocument, onRunQuery: onRunQuery })) }), showExportModal && (_jsx(ExportModal, { collectionPath: selectedCollection, onClose: () => setShowExportModal(false), onExport: onExportCollection })), showImportModal && (_jsx(ImportModal, { collectionPath: selectedCollection, onClose: () => setShowImportModal(false), onImport: onImportCollection }))] }));
};
//# sourceMappingURL=FirestoreView.js.map