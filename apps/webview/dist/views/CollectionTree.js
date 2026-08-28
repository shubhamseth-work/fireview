import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { ConfirmationModal } from './ConfirmationModal';
import { NewDocumentModal } from './NewDocumentModal';
import { useNotify } from '../context/NotificationContext';
export const CollectionTree = ({ collections, selectedCollection, onSelect, loading, readOnlyCollections, onToggleReadOnly, onExportCollection, onImportCollection, onAddDocument, connections, activeProjectId, }) => {
    const notify = useNotify();
    const [contextMenu, setContextMenu] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [copyMoveModal, setCopyMoveModal] = useState(null);
    const [newDocModal, setNewDocModal] = useState(null);
    const menuRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setContextMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleContextMenu = (e, collection) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ collection, x: e.clientX, y: e.clientY });
    };
    const handleAction = (action, collection) => {
        switch (action) {
            case 'addDocument':
                setNewDocModal({ isOpen: true, collectionPath: collection.path });
                break;
            case 'toggleReadOnly':
                onToggleReadOnly(collection.path);
                break;
            case 'export':
                onExportCollection(collection.path);
                break;
            case 'import':
                onImportCollection(collection.path);
                break;
            case 'rename':
                const newName = prompt('Enter new collection name:', collection.id);
                if (newName && newName !== collection.id) {
                    // Would need backend support for collection rename
                    notify('info', 'Collection rename not yet implemented');
                }
                break;
            case 'delete':
                setConfirmModal({
                    title: 'Delete Collection',
                    message: `Are you sure you want to delete collection "${collection.id}"? This will delete ALL documents in this collection and cannot be undone.`,
                    onConfirm: () => {
                        // Would need backend support for collection delete
                        notify('info', 'Collection delete not yet implemented');
                    },
                    variant: 'danger',
                });
                break;
        }
        setContextMenu(null);
    };
    const handleCopyMoveConfirm = (targetProjectId, targetCollection) => {
        if (!copyMoveModal)
            return;
        // Collection copy/move would need backend support
        notify('info', `${copyMoveModal.mode} collection not yet implemented`);
        setCopyMoveModal(null);
    };
    const handleConfirmOk = () => {
        confirmModal?.onConfirm();
        setConfirmModal(null);
    };
    const handleConfirmCancel = () => {
        setConfirmModal(null);
    };
    const handleNewDocConfirm = (docId, data) => {
        if (newDocModal) {
            onAddDocument(newDocModal.collectionPath, docId, data);
            notify('success', 'Document created successfully');
        }
        setNewDocModal(null);
    };
    const handleNewDocCancel = () => {
        setNewDocModal(null);
    };
    if (loading) {
        return (_jsx("div", { style: { padding: 16, textAlign: 'center', color: 'var(--vscode-descriptionForeground)' }, children: "Loading collections..." }));
    }
    if (collections.length === 0) {
        return (_jsxs("div", { className: "empty-state", style: { flex: 1, padding: 16 }, children: [_jsx("div", { className: "icon", children: "\uD83D\uDCC1" }), _jsx("h3", { children: "No Collections" }), _jsx("p", { children: "This project has no Firestore collections." })] }));
    }
    return (_jsxs("div", { className: "tree-view", style: { flex: 1, overflow: 'auto' }, children: [collections.map(col => {
                const isReadOnly = readOnlyCollections.has(col.path);
                // Determine projectId for this collection (from activeProjectId or infer from connections)
                const projectId = activeProjectId ?? undefined;
                return (_jsxs("div", { className: `tree-item ${selectedCollection === col.path ? 'selected' : ''} ${isReadOnly ? 'read-only' : ''}`, onClick: () => !isReadOnly && onSelect(col.path, projectId), onContextMenu: e => handleContextMenu(e, col), style: {
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: isReadOnly ? 0.6 : 1,
                        cursor: isReadOnly ? 'not-allowed' : 'pointer',
                    }, children: [_jsx("span", { className: "icon", children: "\uD83D\uDCC1" }), _jsxs("span", { style: { flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: [col.id, isReadOnly && _jsx("span", { style: { marginLeft: 8, fontSize: 12 }, children: "\uD83D\uDD12" })] }), col.documentCount !== undefined && (_jsx("span", { style: { fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginLeft: 8 }, children: col.documentCount }))] }, col.id));
            }), contextMenu && (_jsxs("div", { ref: menuRef, style: {
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    backgroundColor: 'var(--vscode-dropdown-background)',
                    border: '1px solid var(--vscode-dropdown-border)',
                    borderRadius: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    minWidth: 200,
                    padding: '4px 0',
                }, children: [_jsx("div", { style: { padding: '4px 12px', fontSize: 11, color: 'var(--vscode-descriptionForeground)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--vscode-dropdown-border)' }, children: contextMenu.collection.id }), _jsxs("button", { onClick: () => handleAction('toggleReadOnly', contextMenu.collection), style: {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-dropdown-foreground)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                        }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: readOnlyCollections.has(contextMenu.collection.path) ? '🔓' : '🔒' }), _jsx("span", { children: readOnlyCollections.has(contextMenu.collection.path) ? 'Make Writable' : 'Make Read-Only' })] }), _jsx("div", { style: { borderTop: '1px solid var(--vscode-dropdown-border)', margin: '4px 0' } }), _jsxs("button", { onClick: () => handleAction('export', contextMenu.collection), style: {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-dropdown-foreground)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                        }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: "\uD83D\uDCE4" }), _jsx("span", { children: "Export Collection..." })] }), _jsxs("button", { onClick: () => handleAction('import', contextMenu.collection), style: {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-dropdown-foreground)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                        }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: "\uD83D\uDCE5" }), _jsx("span", { children: "Import Collection..." })] }), _jsxs("button", { onClick: () => handleAction('addDocument', contextMenu.collection), style: {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-dropdown-foreground)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                        }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: "\u2795" }), _jsx("span", { children: "Add Document..." })] }), _jsx("div", { style: { borderTop: '1px solid var(--vscode-dropdown-border)', margin: '4px 0' } }), _jsxs("button", { onClick: () => handleAction('rename', contextMenu.collection), style: {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-dropdown-foreground)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                        }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: "\u270F\uFE0F" }), _jsx("span", { children: "Rename Collection..." })] }), _jsxs("button", { onClick: () => handleAction('delete', contextMenu.collection), style: {
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-errorForeground)',
                            fontSize: 12,
                            textAlign: 'left',
                            cursor: 'pointer',
                        }, onMouseOver: e => e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)', onMouseOut: e => e.currentTarget.style.backgroundColor = 'transparent', children: [_jsx("span", { children: "\uD83D\uDDD1\uFE0F" }), _jsx("span", { children: "Delete Collection" })] })] })), confirmModal && (_jsx(ConfirmationModal, { isOpen: true, title: confirmModal.title, message: confirmModal.message, onConfirm: handleConfirmOk, onCancel: handleConfirmCancel, variant: confirmModal.variant })), newDocModal && (_jsx(NewDocumentModal, { isOpen: true, onConfirm: handleNewDocConfirm, onCancel: handleNewDocCancel }))] }));
};
//# sourceMappingURL=CollectionTree.js.map